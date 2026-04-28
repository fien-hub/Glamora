-- Migration: Reschedule messages_read_log cleanup job to 02:00 UTC daily
DO $$
DECLARE jid int;
BEGIN
  SELECT jobid INTO jid FROM cron.job
  WHERE jobname = 'messages_read_log_cleanup_daily';

  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;

  PERFORM cron.schedule(
    'messages_read_log_cleanup_daily',
    '0 2 * * *',
    'select public.cleanup_old_messages_read_logs();'
  );
END $$;
