-- Migration: Harden UPDATE policies on bookings
-- Goal: Replace broad update with specific customer cancel + provider status updates (idempotent)

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop/recreate policies without DO blocks (idempotent)
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Customers can cancel own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Providers can update status on own bookings" ON public.bookings;

CREATE POLICY "Customers can cancel own bookings"
ON public.bookings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.customer_profiles cp
    JOIN public.profiles p ON p.id = cp.id
    WHERE cp.id = bookings.customer_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  status = 'cancelled' AND
  EXISTS (
    SELECT 1
    FROM public.customer_profiles cp
    JOIN public.profiles p ON p.id = cp.id
    WHERE cp.id = bookings.customer_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can update status on own bookings"
ON public.bookings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.provider_profiles pp
    JOIN public.profiles p ON p.id = pp.id
    WHERE pp.id = bookings.provider_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  status IN ('confirmed','in_progress','completed','cancelled') AND
  EXISTS (
    SELECT 1
    FROM public.provider_profiles pp
    JOIN public.profiles p ON p.id = pp.id
    WHERE pp.id = bookings.provider_id
      AND p.user_id = auth.uid()
  )
);

