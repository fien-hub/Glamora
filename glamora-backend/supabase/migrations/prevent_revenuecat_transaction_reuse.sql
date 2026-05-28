-- Prevent RevenueCat transaction ID reuse across unrelated bookings.
--
-- Why this is needed:
-- - Clients write payment_intent_id (e.g. rc_<transactionId>) directly to bookings.
-- - A replayed transaction ID could otherwise be attached to multiple bookings.
--
-- Rule:
-- - A paid payment_intent_id can appear multiple times ONLY when all rows belong to
--   the same recurring_booking_id (single purchase paying a recurring series).
-- - Otherwise, reusing the same payment_intent_id is rejected.

-- Ensure payment columns exist (they may have been added via dashboard rather than a migration)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status   text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_intent_id text;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_ref_paid
  ON public.bookings (payment_intent_id)
  WHERE payment_status = 'paid' AND payment_intent_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_reused_paid_payment_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_recurring_id uuid;
BEGIN
  -- Only validate when booking is being marked paid with a non-empty payment reference
  IF NEW.payment_status IS DISTINCT FROM 'paid' OR NEW.payment_intent_id IS NULL OR btrim(NEW.payment_intent_id) = '' THEN
    RETURN NEW;
  END IF;

  -- Serialize attempts for the same payment reference to avoid race-condition bypass.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.payment_intent_id, 0));

  SELECT b.recurring_booking_id
  INTO v_existing_recurring_id
  FROM public.bookings b
  WHERE b.id <> NEW.id
    AND b.payment_status = 'paid'
    AND b.payment_intent_id = NEW.payment_intent_id
  LIMIT 1;

  IF FOUND THEN
    -- Allowed only when both rows belong to the same recurring booking group.
    IF NEW.recurring_booking_id IS NOT NULL AND v_existing_recurring_id = NEW.recurring_booking_id THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'PAYMENT_REFERENCE_ALREADY_USED'
      USING ERRCODE = '23505',
            DETAIL = format('payment_intent_id=%s is already attached to another paid booking', NEW.payment_intent_id),
            HINT = 'Use a unique RevenueCat transaction for each new booking purchase.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_reused_paid_payment_reference ON public.bookings;
CREATE TRIGGER trg_prevent_reused_paid_payment_reference
BEFORE INSERT OR UPDATE OF payment_status, payment_intent_id, recurring_booking_id
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.prevent_reused_paid_payment_reference();
