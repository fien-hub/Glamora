-- Add onboarding_completed flag to track if users have completed their onboarding process

-- Customer profiles: add flag if missing
ALTER TABLE public.customer_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Provider profiles: add flag if missing
ALTER TABLE public.provider_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Backfill for existing users so they don't get stuck in onboarding
-- Mark customers as onboarded if they have some preferences or location set
UPDATE public.customer_profiles
SET onboarding_completed = TRUE
WHERE onboarding_completed IS DISTINCT FROM TRUE
  AND (location_city IS NOT NULL OR preferred_categories IS NOT NULL);

-- Mark providers as onboarded if they have a business name
UPDATE public.provider_profiles
SET onboarding_completed = TRUE
WHERE onboarding_completed IS DISTINCT FROM TRUE
  AND business_name IS NOT NULL;
