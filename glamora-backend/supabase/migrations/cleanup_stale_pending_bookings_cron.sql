-- Migration: Add cron job to clean up stale pending bookings
-- Pending bookings older than 30 minutes that were never paid (abandoned mid-checkout)
-- hold time slots permanently. This job releases those slots.

-- Function to delete stale pending booking rows and their parent recurring_booking
-- records when all instances have been cleaned up.
CREATE OR REPLACE FUNCTION public.cleanup_stale_pending_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff timestamptz := now() - interval '30 minutes';
BEGIN
  -- Delete stale pending bookings (single + recurring instances).
  -- Only rows where BOTH status and payment_status are still 'pending' — confirmed
  -- or paid bookings are never touched.
  DELETE FROM public.bookings
  WHERE payment_status = 'pending'
    AND status = 'pending'
    AND created_at < v_cutoff;

  -- Clean up any recurring_booking parent records that now have zero instances
  -- (all instances were just deleted above, or were deleted previously).
  DELETE FROM public.recurring_bookings rb
  WHERE created_at < v_cutoff
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.recurring_booking_id = rb.id
    );
END;
$$;

-- Grant execute to the postgres role used by pg_cron
GRANT EXECUTE ON FUNCTION public.cleanup_stale_pending_bookings() TO postgres;

-- Schedule to run every 10 minutes
DO $$
DECLARE jid int;
BEGIN
  SELECT jobid INTO jid FROM cron.job
  WHERE jobname = 'cleanup_stale_pending_bookings';

  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;

  PERFORM cron.schedule(
    'cleanup_stale_pending_bookings',
    '*/10 * * * *',
    'select public.cleanup_stale_pending_bookings();'
  );
END $$;
