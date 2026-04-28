-- Prevent overlapping bookings per provider and normalize to UTC
-- 1) Add scheduled_at (UTC) and planned_end_at; 2) Trigger to maintain; 3) Conditional range; 4) Exclusion constraint

-- Enable required extension for GiST support on btree types (uuid etc.)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add new columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS planned_end_at timestamptz;

-- Backfill scheduled_at from scheduled_date + scheduled_time (treated as UTC)
UPDATE public.bookings
SET scheduled_at = (scheduled_date::timestamp + scheduled_time) AT TIME ZONE 'UTC'
WHERE scheduled_at IS NULL
  AND scheduled_date IS NOT NULL
  AND scheduled_time IS NOT NULL;

-- Backfill planned_end_at using provider_services.duration_minutes
UPDATE public.bookings b
SET planned_end_at = b.scheduled_at + make_interval(mins => ps.duration_minutes)
FROM public.provider_services ps
WHERE b.planned_end_at IS NULL
  AND b.provider_service_id = ps.id
  AND b.scheduled_at IS NOT NULL;

-- Trigger to keep columns in sync on insert/update
CREATE OR REPLACE FUNCTION public.set_booking_times()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_duration int;
BEGIN
  IF NEW.scheduled_date IS NOT NULL AND NEW.scheduled_time IS NOT NULL THEN
    NEW.scheduled_at := (NEW.scheduled_date::timestamp + NEW.scheduled_time) AT TIME ZONE 'UTC';
  END IF;

  IF NEW.provider_service_id IS NOT NULL AND NEW.scheduled_at IS NOT NULL THEN
    SELECT duration_minutes INTO v_duration
    FROM public.provider_services
    WHERE id = NEW.provider_service_id;

    IF v_duration IS NOT NULL THEN
      NEW.planned_end_at := NEW.scheduled_at + make_interval(mins => v_duration);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_set_times_before_insupd ON public.bookings;
CREATE TRIGGER bookings_set_times_before_insupd
BEFORE INSERT OR UPDATE OF scheduled_date, scheduled_time, provider_service_id
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.set_booking_times();

-- Conditional active time range (only enforced for active statuses)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS active_time_range tstzrange
  GENERATED ALWAYS AS (
    CASE 
      WHEN status IN ('pending','confirmed','in_progress') THEN tstzrange(scheduled_at, planned_end_at, '[)')
      ELSE NULL
    END
  ) STORED;

-- Add exclusion constraint to prevent overlapping active bookings per provider
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_overlap'
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_no_overlap
    EXCLUDE USING gist (
      provider_id WITH =,
      active_time_range WITH &&
    );
  END IF;
END $$;

