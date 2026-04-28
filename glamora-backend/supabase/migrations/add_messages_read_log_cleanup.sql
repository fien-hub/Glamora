-- Migration: Daily cleanup for messages_read_log (retain 90 days)

-- Ensure pg_cron is available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to delete audit rows older than 90 days
CREATE OR REPLACE FUNCTION public.cleanup_old_messages_read_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.messages_read_log
  WHERE changed_at < NOW() - INTERVAL '90 days';
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_messages_read_logs IS 'Deletes messages_read_log entries older than 90 days';

-- Schedule daily at 03:15 UTC
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'messages_read_log_cleanup_daily'
  ) THEN
    PERFORM cron.schedule(
      'messages_read_log_cleanup_daily',
      '15 3 * * *',
      $$select public.cleanup_old_messages_read_logs();$$
    );
  END IF;
END;
$$;
