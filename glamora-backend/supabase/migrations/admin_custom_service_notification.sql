-- Migration: Admin notifications for new custom service submissions
-- When a provider submits a custom service, every admin user gets:
--   1. An in-app notification (notifications table)
--   2. A push notification via backend webhook

-- ─────────────────────────────────────────────────────────────────────
-- Config table (Supabase-friendly; no ALTER DATABASE required)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_config_admin_read ON public.system_config;
CREATE POLICY system_config_admin_read
  ON public.system_config
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- Trigger function
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_admins_on_custom_service_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider_name  TEXT;
  v_business_name  TEXT;
  v_admin          RECORD;
  v_display_name   TEXT;
  v_backend_url    TEXT;
  v_internal_secret TEXT;
BEGIN
  -- Only fire for custom services (have a custom_service_name)
  IF NEW.custom_service_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the submitting provider's display info
  SELECT
    COALESCE(pp.business_name, p.full_name, 'Unknown Provider'),
    COALESCE(pp.business_name, p.full_name, 'Unknown Provider')
  INTO v_business_name, v_provider_name
  FROM public.provider_profiles pp
  JOIN public.profiles p ON p.id = pp.id
  WHERE pp.id = NEW.provider_id
  LIMIT 1;

  v_display_name := COALESCE(v_business_name, v_provider_name, 'A provider');

  -- Insert an in-app notification for every admin user
  FOR v_admin IN
    SELECT id AS user_id
    FROM public.profiles
    WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      v_admin.user_id,
      'admin_custom_service_pending',
      '🆕 New Custom Service Submitted',
      v_display_name || ' submitted "' || NEW.custom_service_name || '" for review.',
      jsonb_build_object(
        'service_id',   NEW.id,
        'service_name', NEW.custom_service_name,
        'provider_id',  NEW.provider_id,
        'action',       'review_custom_service'
      )
    );
  END LOOP;

  -- Fire backend webhook to trigger Expo push notifications
  -- Uses pg_net (must be enabled: CREATE EXTENSION IF NOT EXISTS pg_net;)
  BEGIN
    SELECT value INTO v_backend_url
    FROM public.system_config
    WHERE key = 'backend_url'
    LIMIT 1;

    SELECT value INTO v_internal_secret
    FROM public.system_config
    WHERE key = 'internal_webhook_secret'
    LIMIT 1;

    IF v_backend_url IS NOT NULL AND v_backend_url <> '' THEN
      PERFORM net.http_post(
        url     := v_backend_url || '/api/admin/internal/custom-service-alert',
        headers := jsonb_build_object(
          'Content-Type',     'application/json',
          'x-internal-secret', COALESCE(v_internal_secret, '')
        ),
        body    := jsonb_build_object(
          'serviceId',    NEW.id,
          'serviceName',  NEW.custom_service_name,
          'providerName', v_display_name,
          'providerId',   NEW.provider_id
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Never let the webhook failure block the insert
    RAISE WARNING 'Admin push webhook failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- Attach trigger to provider_services
-- ─────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_admin_notify_custom_service ON public.provider_services;

CREATE TRIGGER trg_admin_notify_custom_service
  AFTER INSERT ON public.provider_services
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_on_custom_service_submitted();

-- ─────────────────────────────────────────────────────────────────────
-- Run this in your Supabase project to set the required config:
--
--   INSERT INTO public.system_config (key, value)
--   VALUES ('backend_url', 'https://your-backend.com')
--   ON CONFLICT (key) DO UPDATE
--   SET value = EXCLUDED.value, updated_at = NOW();
--
--   INSERT INTO public.system_config (key, value)
--   VALUES ('internal_webhook_secret', 'YOUR_STRONG_SECRET')
--   ON CONFLICT (key) DO UPDATE
--   SET value = EXCLUDED.value, updated_at = NOW();
--
-- The internal_secret must match INTERNAL_WEBHOOK_SECRET in your
-- backend .env file.
-- ─────────────────────────────────────────────────────────────────────
