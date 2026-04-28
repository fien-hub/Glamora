-- Migration: Harden SELECT access on profiles (limit to authenticated users)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Idempotent policy (no DO blocks)
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

