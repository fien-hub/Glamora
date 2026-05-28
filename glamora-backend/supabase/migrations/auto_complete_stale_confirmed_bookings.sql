-- Migration: Auto-complete confirmed bookings whose appointment time has passed.
--
-- Why this is needed:
-- - Providers sometimes forget to mark an appointment as 'completed'.
-- - Without a 'completed' status, customers cannot leave a review and
--   the provider's completion stats never update.
--
-- Rule:
-- - A booking that is still 'confirmed' and whose planned_end_at (or
--   scheduled_at + 1 hour fallback) passed more than 3 hours ago is
--   automatically flipped to 'completed'.
-- - 3-hour grace period gives providers time to manually mark it themselves
--   and avoids false auto-completes for appointments still in progress.

CREATE OR REPLACE FUNCTION public.auto_complete_stale_confirmed_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff timestamptz := now() - interval '3 hours';
BEGIN
  UPDATE public.bookings
  SET status = 'completed'
  WHERE status = 'confirmed'
    AND (
      -- Use planned_end_at when available (set by the overlap-prevention trigger)
      (planned_end_at IS NOT NULL AND planned_end_at < v_cutoff)
      OR
      -- Fallback: scheduled_at + 1-hour default when duration is unknown
      (planned_end_at IS NULL AND scheduled_at IS NOT NULL AND scheduled_at + interval '1 hour' < v_cutoff)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_complete_stale_confirmed_bookings() TO postgres;

-- Schedule to run every hour on the hour
DO $$
DECLARE jid int;
BEGIN
  SELECT jobid INTO jid FROM cron.job
  WHERE jobname = 'auto_complete_stale_confirmed_bookings';

  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;

  PERFORM cron.schedule(
    'auto_complete_stale_confirmed_bookings',
    '0 * * * *',
    'select public.auto_complete_stale_confirmed_bookings();'
  );
END $$;
