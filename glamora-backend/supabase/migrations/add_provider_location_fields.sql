-- Add location fields to provider_profiles table
ALTER TABLE public.provider_profiles
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_provider_profiles_location 
ON public.provider_profiles(latitude, longitude);

-- Add comment
COMMENT ON COLUMN public.provider_profiles.address IS 'Business address for the provider';
COMMENT ON COLUMN public.provider_profiles.latitude IS 'Latitude coordinate for business location';
COMMENT ON COLUMN public.provider_profiles.longitude IS 'Longitude coordinate for business location';
COMMENT ON COLUMN public.provider_profiles.service_radius_km IS 'Service area radius in kilometers from business location';

