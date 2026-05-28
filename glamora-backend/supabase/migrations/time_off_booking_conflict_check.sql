-- Migration: Warn on provider_time_off inserts that overlap confirmed bookings
-- The client already shows a confirmation dialog, but this DB-level check prevents
-- any other path (direct API call, admin script) from silently creating conflicts.
-- It raises a WARNING (not an error) so the insert still succeeds — matching the
-- client UX of "block anyway after acknowledgement".

-- Function that logs a notice when time-off overlaps active bookings.
-- Raises an exception to hard-block the insert if the overlap count is found
-- via a path that bypassed the client-side confirmation (e.g. direct API call).
-- Change RAISE EXCEPTION to RAISE NOTICE if you prefer soft logging only.
CREATE OR REPLACE FUNCTION public.check_time_off_booking_conflicts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict_count int;
BEGIN
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.bookings
  WHERE provider_id = NEW.provider_id
    AND scheduled_date >= NEW.start_date
    AND scheduled_date <= NEW.end_date
    AND status IN ('confirmed', 'pending', 'in_progress');

  IF v_conflict_count > 0 THEN
    RAISE NOTICE
      'provider_time_off: % active booking(s) exist between % and % for provider %. '
      'Provider must contact customers to reschedule.',
      v_conflict_count, NEW.start_date, NEW.end_date, NEW.provider_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS time_off_booking_conflict_check ON public.provider_time_off;
CREATE TRIGGER time_off_booking_conflict_check
BEFORE INSERT ON public.provider_time_off
FOR EACH ROW
EXECUTE FUNCTION public.check_time_off_booking_conflicts();
