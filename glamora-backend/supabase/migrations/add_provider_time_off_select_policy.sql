-- Migration: Allow authenticated users to read provider_time_off (for availability checks)

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.provider_time_off ENABLE ROW LEVEL SECURITY;

-- Idempotent policy without DO blocks
DROP POLICY IF EXISTS "Authenticated users can view provider time off" ON public.provider_time_off;

CREATE POLICY "Authenticated users can view provider time off"
ON public.provider_time_off
FOR SELECT
TO authenticated
USING (true);

