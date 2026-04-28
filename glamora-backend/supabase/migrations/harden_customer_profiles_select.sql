-- Migration: Harden SELECT access on customer_profiles (idempotent)
-- Goal: remove broad public read; allow owner and providers related via a booking

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- Drop/recreate policies without DO blocks (idempotent)
DROP POLICY IF EXISTS "Anyone can view customer profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Customer can view own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Providers can view customers from their bookings" ON public.customer_profiles;

-- Owner: can view their own customer profile
CREATE POLICY "Customer can view own profile"
ON public.customer_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = customer_profiles.id
      AND p.user_id = auth.uid()
  )
);

-- Providers: can view customer profiles only if they share a booking
CREATE POLICY "Providers can view customers from their bookings"
ON public.customer_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.provider_profiles pp ON pp.id = b.provider_id
    JOIN public.profiles p ON p.id = pp.id
    WHERE b.customer_id = customer_profiles.id
      AND p.user_id = auth.uid()
  )
);

