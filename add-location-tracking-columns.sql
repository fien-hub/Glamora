-- Add location tracking columns to customer_profiles table
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS current_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS current_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- Add location tracking columns to provider_profiles table
ALTER TABLE provider_profiles
ADD COLUMN IF NOT EXISTS current_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS current_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- Add indexes for efficient location queries
CREATE INDEX IF NOT EXISTS idx_customer_profiles_location 
ON customer_profiles(current_latitude, current_longitude) 
WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_provider_profiles_location 
ON provider_profiles(current_latitude, current_longitude) 
WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL;

-- Add index for location freshness queries
CREATE INDEX IF NOT EXISTS idx_customer_profiles_location_updated 
ON customer_profiles(location_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_profiles_location_updated 
ON provider_profiles(location_updated_at DESC);
