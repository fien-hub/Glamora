-- Migration: Create refund_requests table for tracking cancellation refunds.
--
-- Apple consumable IAP purchases cannot be reversed programmatically — refunds
-- must go through Apple's support flow (reportaproblem.apple.com). This table
-- gives the admin team a clear audit trail and a queue to work from.
--
-- Statuses:
--   pending   → logged, waiting for admin to verify and action
--   approved  → admin confirmed refund was issued (via Apple or manual)
--   rejected  → admin reviewed and declined (e.g. policy breach)
--   refunded  → Apple processed the refund (confirmed via RevenueCat webhook)

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id         uuid          NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id        uuid          NOT NULL,   -- profiles.id of the customer
  provider_id        uuid          NOT NULL,   -- profiles.id of the provider
  amount_cents       integer       NOT NULL,
  payment_intent_id  text,                     -- RevenueCat transaction ID for cross-reference
  cancelled_by       text          NOT NULL CHECK (cancelled_by IN ('customer', 'provider', 'admin')),
  reason             text,                     -- free-text supplied by the cancelling party
  status             text          NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
  admin_note         text,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);

-- Index for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_refund_requests_status     ON public.refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_booking_id ON public.refund_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_customer   ON public.refund_requests(customer_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_refund_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_refund_requests_updated_at ON public.refund_requests;
CREATE TRIGGER set_refund_requests_updated_at
BEFORE UPDATE ON public.refund_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_refund_requests_updated_at();

-- RLS: customers can see their own requests; providers can see requests for their bookings;
-- admins (service_role) see everything.
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers see own refund requests" ON public.refund_requests;
CREATE POLICY "Customers see own refund requests"
  ON public.refund_requests FOR SELECT
  USING (
    customer_id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Providers see refund requests on their bookings" ON public.refund_requests;
CREATE POLICY "Providers see refund requests on their bookings"
  ON public.refund_requests FOR SELECT
  USING (
    provider_id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Only the Edge Function (service_role) inserts refund requests on behalf of users
-- so we don't need an authenticated INSERT policy here.
