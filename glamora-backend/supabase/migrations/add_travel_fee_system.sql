-- Migration: Add Travel Fee System
-- This migration adds support for distance-based pricing where providers can set their own travel policies

-- Step 1: Add travel fee configuration to provider_profiles
ALTER TABLE public.provider_profiles
ADD COLUMN IF NOT EXISTS travel_fee_type TEXT DEFAULT 'flat' CHECK (travel_fee_type IN ('flat', 'per_km', 'none')),
ADD COLUMN IF NOT EXISTS travel_fee_flat_rate INTEGER DEFAULT 0, -- Stored in cents (e.g., 1000 = $10.00)
ADD COLUMN IF NOT EXISTS travel_fee_per_km INTEGER DEFAULT 0, -- Stored in cents per km (e.g., 100 = $1.00/km)
ADD COLUMN IF NOT EXISTS max_travel_distance_km INTEGER DEFAULT 10, -- Maximum distance willing to travel
ADD COLUMN IF NOT EXISTS free_travel_radius_km INTEGER DEFAULT 0; -- Distance within which travel is free

-- Step 2: Add travel fee breakdown to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS service_price INTEGER, -- Service price in cents
ADD COLUMN IF NOT EXISTS travel_fee INTEGER DEFAULT 0, -- Travel fee in cents
ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10, 2), -- Actual distance between provider and customer
ADD COLUMN IF NOT EXISTS provider_latitude DECIMAL(10, 8), -- Provider location at time of booking
ADD COLUMN IF NOT EXISTS provider_longitude DECIMAL(11, 8); -- Provider location at time of booking

-- Step 3: Update total_price to be calculated field (service_price + travel_fee)
-- Note: We'll keep total_price as stored value for backward compatibility
-- but it should be calculated as service_price + travel_fee

-- Step 4: Add travel fee to payments table for transparency
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS service_amount INTEGER, -- Service amount in cents
ADD COLUMN IF NOT EXISTS travel_fee_amount INTEGER DEFAULT 0; -- Travel fee amount in cents

-- Step 5: Create index for distance-based queries
CREATE INDEX IF NOT EXISTS idx_provider_profiles_travel_distance 
ON public.provider_profiles(max_travel_distance_km);

-- Step 6: Create a function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 DECIMAL,
    lon1 DECIMAL,
    lat2 DECIMAL,
    lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    earth_radius_km CONSTANT DECIMAL := 6371.0;
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    -- Convert degrees to radians
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    
    -- Haversine formula
    a := sin(dlat/2) * sin(dlat/2) + 
         cos(radians(lat1)) * cos(radians(lat2)) * 
         sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    
    RETURN earth_radius_km * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 7: Create a function to calculate travel fee for a provider
CREATE OR REPLACE FUNCTION calculate_travel_fee(
    p_provider_id UUID,
    p_customer_lat DECIMAL,
    p_customer_lon DECIMAL
)
RETURNS TABLE(
    distance_km DECIMAL,
    travel_fee_cents INTEGER,
    within_range BOOLEAN
) AS $$
DECLARE
    v_provider_lat DECIMAL;
    v_provider_lon DECIMAL;
    v_travel_fee_type TEXT;
    v_flat_rate INTEGER;
    v_per_km_rate INTEGER;
    v_max_distance INTEGER;
    v_free_radius INTEGER;
    v_distance DECIMAL;
    v_fee INTEGER;
BEGIN
    -- Get provider location and travel settings
    SELECT 
        latitude, 
        longitude,
        travel_fee_type,
        travel_fee_flat_rate,
        travel_fee_per_km,
        max_travel_distance_km,
        free_travel_radius_km
    INTO 
        v_provider_lat,
        v_provider_lon,
        v_travel_fee_type,
        v_flat_rate,
        v_per_km_rate,
        v_max_distance,
        v_free_radius
    FROM provider_profiles
    WHERE id = p_provider_id;
    
    -- Calculate distance
    v_distance := calculate_distance_km(
        v_provider_lat,
        v_provider_lon,
        p_customer_lat,
        p_customer_lon
    );
    
    -- Check if within max travel distance
    IF v_distance > v_max_distance THEN
        RETURN QUERY SELECT v_distance, 0::INTEGER, FALSE;
        RETURN;
    END IF;
    
    -- Calculate fee based on type
    IF v_travel_fee_type = 'none' OR v_distance <= v_free_radius THEN
        v_fee := 0;
    ELSIF v_travel_fee_type = 'flat' THEN
        v_fee := v_flat_rate;
    ELSIF v_travel_fee_type = 'per_km' THEN
        -- Only charge for distance beyond free radius
        v_fee := GREATEST(0, ROUND((v_distance - v_free_radius) * v_per_km_rate));
    ELSE
        v_fee := 0;
    END IF;
    
    RETURN QUERY SELECT v_distance, v_fee, TRUE;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Add comments for documentation
COMMENT ON COLUMN provider_profiles.travel_fee_type IS 'Type of travel fee: flat (fixed rate), per_km (rate per kilometer), or none';
COMMENT ON COLUMN provider_profiles.travel_fee_flat_rate IS 'Flat travel fee in cents (e.g., 1000 = $10.00)';
COMMENT ON COLUMN provider_profiles.travel_fee_per_km IS 'Travel fee per kilometer in cents (e.g., 100 = $1.00/km)';
COMMENT ON COLUMN provider_profiles.max_travel_distance_km IS 'Maximum distance provider is willing to travel in kilometers';
COMMENT ON COLUMN provider_profiles.free_travel_radius_km IS 'Distance within which travel is free in kilometers';
COMMENT ON COLUMN bookings.service_price IS 'Service price in cents (excluding travel fee)';
COMMENT ON COLUMN bookings.travel_fee IS 'Travel fee in cents';
COMMENT ON COLUMN bookings.distance_km IS 'Distance between provider and customer in kilometers';

