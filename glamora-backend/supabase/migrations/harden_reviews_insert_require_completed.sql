-- Migration: Harden reviews INSERT policy (require completed booking and matching identities)

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Idempotent policy without DO blocks
DROP POLICY IF EXISTS "Customers can create reviews for their bookings" ON public.reviews;
DROP POLICY IF EXISTS "Customers can review completed bookings they own" ON public.reviews;

CREATE POLICY "Customers can review completed bookings they own"
ON public.reviews
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.profiles pc ON pc.id = b.customer_id
    WHERE b.id = reviews.booking_id
      AND b.customer_id = reviews.customer_id
      AND b.provider_id = reviews.provider_id
      AND b.status = 'completed'
      AND pc.user_id = auth.uid()
  )
);

