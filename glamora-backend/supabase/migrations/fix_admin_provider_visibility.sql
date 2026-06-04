-- Fix: Allow admins to view ALL provider profiles (including unverified/pending)
-- The existing "Anyone can view verified providers" policy blocks admins from
-- seeing providers that are not yet verified (pending approval).

-- 1. Add admin SELECT policy on provider_profiles
DROP POLICY IF EXISTS "Admins can view all provider profiles" ON public.provider_profiles;

CREATE POLICY "Admins can view all provider profiles"
ON public.provider_profiles
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);

-- 2. Add admin UPDATE policy on provider_profiles (needed to approve/verify providers)
DROP POLICY IF EXISTS "Admins can update all provider profiles" ON public.provider_profiles;

CREATE POLICY "Admins can update all provider profiles"
ON public.provider_profiles
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);

-- 3. Ensure admin SELECT policy on verification_documents uses the correct table
--    (Previous migration used 'users' table correctly; this re-creates them safely)
DROP POLICY IF EXISTS "Admins can view all verification documents" ON public.verification_documents;

CREATE POLICY "Admins can view all verification documents"
ON public.verification_documents
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);

-- 4. Ensure admin UPDATE policy on verification_documents
DROP POLICY IF EXISTS "Admins can update all verification documents" ON public.verification_documents;

CREATE POLICY "Admins can update all verification documents"
ON public.verification_documents
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);
