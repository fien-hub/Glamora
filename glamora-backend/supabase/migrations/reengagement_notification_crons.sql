-- Migration: reengagement_notification_crons
-- Adds two server-side pg_cron jobs that drive users back into the app:
--
--   1. Review request  — sent ~24h after a completed appointment
--   2. Rebook reminder — sent ~21 days after a completed appointment
--
-- Both flags are stored directly on the bookings row so no notification is
-- ever sent twice for the same booking, even if the cron overlaps.

-- ── 1. Add flag columns ──────────────────────────────────────────────────────

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS review_reminder_sent  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rebook_reminder_sent  boolean NOT NULL DEFAULT false;

-- ── 2. Review-request push (24 h after appointment) ─────────────────────────

CREATE OR REPLACE FUNCTION public.send_review_reminder_pushes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_row    RECORD;
  customer_uid   uuid;
  supabase_url   text;
  svc_key        text;
  provider_name  text;
BEGIN
  SELECT value INTO supabase_url FROM private.config WHERE key = 'supabase_url';
  SELECT value INTO svc_key      FROM private.config WHERE key = 'service_role_key';

  IF supabase_url IS NULL OR svc_key IS NULL THEN
    RAISE WARNING '[send_review_reminder_pushes] Config missing — skipping';
    RETURN;
  END IF;

  FOR booking_row IN
    SELECT b.id,
           b.customer_id,
           b.provider_id,
           b.scheduled_date,
           COALESCE(
             b.planned_end_at,
             (b.scheduled_date::text || 'T' || b.scheduled_time || ':00')::timestamptz + interval '1 hour'
           ) AS ended_at
    FROM   public.bookings b
    WHERE  b.status = 'completed'
      AND  b.review_reminder_sent = false
      -- window: 20 h – 32 h after the appointment ended (gives the hourly cron
      -- a generous window while still feeling timely to the user)
      AND  COALESCE(
             b.planned_end_at,
             (b.scheduled_date::text || 'T' || b.scheduled_time || ':00')::timestamptz + interval '1 hour'
           ) BETWEEN now() - interval '32 hours'
                 AND now() - interval '20 hours'
  LOOP
    BEGIN
      -- Resolve auth user_id from profile id
      SELECT p.user_id INTO customer_uid
      FROM   public.profiles p
      WHERE  p.id = booking_row.customer_id;

      -- Get provider name for the message
      SELECT pp.business_name INTO provider_name
      FROM   public.provider_profiles pp
      WHERE  pp.id = booking_row.provider_id;

      IF customer_uid IS NOT NULL THEN
        PERFORM net.http_post(
          url     := supabase_url || '/functions/v1/send-push-notification',
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || svc_key
          ),
          body    := jsonb_build_object(
            'target_user_id', customer_uid,
            'title',          'How was your appointment?',
            'body',           'Share your experience with ' || COALESCE(provider_name, 'your provider') || '. It helps others find great services!',
            'data',           jsonb_build_object('type', 'review', 'bookingId', booking_row.id),
            'type',           'review'
          )::text
        );
      END IF;

      -- Mark sent regardless of whether push succeeded, so we don't spam on retry
      UPDATE public.bookings
      SET    review_reminder_sent = true
      WHERE  id = booking_row.id;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[send_review_reminder_pushes] Failed for booking %: %',
        booking_row.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- ── 3. Rebook-reminder push (21 days after appointment) ─────────────────────

CREATE OR REPLACE FUNCTION public.send_rebook_reminder_pushes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_row    RECORD;
  customer_uid   uuid;
  supabase_url   text;
  svc_key        text;
  provider_name  text;
BEGIN
  SELECT value INTO supabase_url FROM private.config WHERE key = 'supabase_url';
  SELECT value INTO svc_key      FROM private.config WHERE key = 'service_role_key';

  IF supabase_url IS NULL OR svc_key IS NULL THEN
    RAISE WARNING '[send_rebook_reminder_pushes] Config missing — skipping';
    RETURN;
  END IF;

  FOR booking_row IN
    SELECT b.id,
           b.customer_id,
           b.provider_id,
           b.scheduled_date
    FROM   public.bookings b
    WHERE  b.status = 'completed'
      AND  b.rebook_reminder_sent = false
      -- window: 20–22 days after the appointment date
      AND  b.scheduled_date::date
             BETWEEN (now() - interval '22 days')::date
                 AND (now() - interval '20 days')::date
  LOOP
    BEGIN
      SELECT p.user_id INTO customer_uid
      FROM   public.profiles p
      WHERE  p.id = booking_row.customer_id;

      SELECT pp.business_name INTO provider_name
      FROM   public.provider_profiles pp
      WHERE  pp.id = booking_row.provider_id;

      IF customer_uid IS NOT NULL THEN
        PERFORM net.http_post(
          url     := supabase_url || '/functions/v1/send-push-notification',
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || svc_key
          ),
          body    := jsonb_build_object(
            'target_user_id', customer_uid,
            'title',          'Time for your next appointment? 💅',
            'body',           'It''s been a few weeks since your visit with ' || COALESCE(provider_name, 'your provider') || '. Ready to book again?',
            'data',           jsonb_build_object('type', 'booking', 'providerId', booking_row.provider_id),
            'type',           'booking'
          )::text
        );
      END IF;

      UPDATE public.bookings
      SET    rebook_reminder_sent = true
      WHERE  id = booking_row.id;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[send_rebook_reminder_pushes] Failed for booking %: %',
        booking_row.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- ── 4. Schedule both cron jobs ───────────────────────────────────────────────

-- Review request: run every hour (catches 20–32 h window with ample overlap)
SELECT cron.schedule(
  'send-review-reminder-pushes',
  '30 * * * *',
  'SELECT public.send_review_reminder_pushes()'
);

-- Rebook reminder: run once a day at 10:00 UTC (reasonable waking hour globally)
SELECT cron.schedule(
  'send-rebook-reminder-pushes',
  '0 10 * * *',
  'SELECT public.send_rebook_reminder_pushes()'
);
