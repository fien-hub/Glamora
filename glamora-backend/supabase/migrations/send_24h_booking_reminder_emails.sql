-- Migration: send_24h_booking_reminder_emails
-- Schedules a pg_cron job that runs every hour and sends a 24h reminder email
-- to customers whose confirmed appointment starts in 23–25 hours from now.
-- The ±1 h window ensures each booking is caught exactly once per run.
--
-- Prerequisites (run once before this migration):
--   ALTER DATABASE postgres SET app.supabase_url = 'https://hygbxfkkdmenpkvgpwhn.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = '<your-service-role-key>';
--   SELECT pg_reload_conf();
--
-- pg_net extension must be enabled (it is enabled by default on Supabase).

-- Helper function called by the cron job
CREATE OR REPLACE FUNCTION public.send_24h_reminder_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_row RECORD;
  supabase_url text;
  svc_key      text;
BEGIN
  supabase_url := current_setting('app.supabase_url', true);
  svc_key      := current_setting('app.service_role_key', true);

  IF supabase_url IS NULL OR svc_key IS NULL THEN
    RAISE WARNING '[send_24h_reminder_emails] app.supabase_url or app.service_role_key not set — skipping';
    RETURN;
  END IF;

  FOR booking_row IN
    SELECT id
    FROM public.bookings
    WHERE status = 'confirmed'
      AND (
        -- bookings whose start time is between 23h and 25h from now
        (scheduled_at IS NOT NULL
          AND scheduled_at BETWEEN now() + interval '23 hours'
                               AND now() + interval '25 hours')
        OR
        -- fallback when scheduled_at is null: derive from date + time columns
        (scheduled_at IS NULL
          AND (scheduled_date::text || 'T' || scheduled_time || ':00')::timestamptz
                BETWEEN now() + interval '23 hours'
                    AND now() + interval '25 hours')
      )
  LOOP
    BEGIN
      PERFORM net.http_post(
        url     := supabase_url || '/functions/v1/send-booking-email',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || svc_key
        ),
        body    := jsonb_build_object(
          'bookingId', booking_row.id,
          'type',      'reminder_24h'
        )::text
      );
    EXCEPTION WHEN OTHERS THEN
      -- Non-fatal — log and continue processing remaining bookings
      RAISE WARNING '[send_24h_reminder_emails] Failed to invoke for booking %: %',
        booking_row.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Schedule: run at the top of every hour
-- pg_cron must be enabled (Dashboard → Database → Extensions → pg_cron)
SELECT cron.schedule(
  'send-24h-booking-reminder-emails',
  '0 * * * *',
  'SELECT public.send_24h_reminder_emails()'
);
