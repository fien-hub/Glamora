-- Add onboarding_completed flag to track if users have completed their onboarding process

-- Add to customer_profiles
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add to provider_profiles  
ALTER TABLE provider_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Set existing users as having completed onboarding (so they don't see it again)
-- Only set for users who have some data filled in

-- Mark customers as onboarded if they have location data
UPDATE customer_profiles
SET onboarding_completed = TRUE
WHERE location_city IS NOT NULL OR preferred_categories IS NOT NULL;

-- Mark providers as onboarded if they have business_name filled
UPDATE provider_profiles
SET onboarding_completed = TRUE
WHERE business_name IS NOT NULL;

-- Verify the changes
SELECT 'customer_profiles' as table_name, 
       COUNT(*) as total,
       SUM(CASE WHEN onboarding_completed THEN 1 ELSE 0 END) as completed
FROM customer_profiles
UNION ALL
SELECT 'provider_profiles' as table_name,
       COUNT(*) as total,
       SUM(CASE WHEN onboarding_completed THEN 1 ELSE 0 END) as completed
FROM provider_profiles;

