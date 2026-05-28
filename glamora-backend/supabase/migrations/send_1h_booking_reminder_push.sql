-- Migration: send_1h_booking_reminder_push
-- Schedules a pg_cron job that runs every 15 minutes and sends a 1-hour
-- push notification reminder to customers with an upcoming confirmed booking.
-- The ±7.5 min window ensures each booking is caught exactly once per run.

CREATE OR REPLACE FUNCTION public.send_1h_reminder_push()
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
    RAISE WARNING '[send_1h_reminder_push] app.supabase_url or app.service_role_key not set — skipping';
    RETURN;
  END IF;

  FOR booking_row IN
    SELECT
      b.id,
      b.customer_id,
      s.name AS service_name,
      b.scheduled_date,
      b.scheduled_time
    FROM public.bookings b
    LEFT JOIN public.provider_services ps ON ps.id = b.provider_service_id
    LEFT JOIN public.services s ON s.id = ps.service_id
    WHERE b.status = 'confirmed'
      AND (
        (b.scheduled_at IS NOT NULL
          AND b.scheduled_at BETWEEN now() + interval '52 minutes 30 seconds'
                                 AND now() + interval '67 minutes 30 seconds')
        OR
        (b.scheduled_at IS NULL
          AND (b.scheduled_date::text || 'T' || b.scheduled_time || ':00')::timestamptz
                BETWEEN now() + interval '52 minutes 30 seconds'
                    AND now() + interval '67 minutes 30 seconds')
      )
  LOOP
    BEGIN
      -- Resolve customer_id (profile ID) → user_id for device_tokens lookup
      PERFORM net.http_post(
        url     := supabase_url || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || svc_key
        ),
        body    := jsonb_build_object(
          'target_user_id', (
            SELECT p.user_id FROM public.profiles p
            WHERE p.id = booking_row.customer_id
            LIMIT 1
          ),
          'title', 'Upcoming Appointment 🕐',
          'body',  'Your ' || COALESCE(booking_row.service_name, 'appointment') ||
                   ' starts in about 1 hour. Get ready!',
          'type',  'system',
          'data',  jsonb_build_object('bookingId', booking_row.id)
        )::text
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[send_1h_reminder_push] Failed for booking %: %', booking_row.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Schedule: every 15 minutes
SELECT cron.unschedule('send-1h-reminder-push') FROM cron.job WHERE jobname = 'send-1h-reminder-push';

SELECT cron.schedule(
  'send-1h-reminder-push',
  '*/15 * * * *',
  'SELECT public.send_1h_reminder_push()'
);
