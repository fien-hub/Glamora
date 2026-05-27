-- Add custom travel fee column for the 25+ km (15+ mile) tier
-- Providers can now set their own fee for long-distance requests
-- Value is stored in cents (integer), NULL means use the platform default ($30)

ALTER TABLE provider_services
ADD COLUMN IF NOT EXISTS travel_fee_over_25km INTEGER;

-- Optional: add a comment for documentation
COMMENT ON COLUMN provider_services.travel_fee_over_25km
  IS 'Provider-set travel fee in cents for requests beyond 25 km (15+ mi). NULL = use platform default.';
