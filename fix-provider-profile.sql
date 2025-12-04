-- Fix missing provider profile for user who created portfolio item
-- Run this in Supabase SQL Editor

-- Insert provider profile for the user who created the portfolio item
INSERT INTO provider_profiles (id, business_name, years_experience, is_verified, rating, total_reviews, total_bookings, service_radius_km)
SELECT 
  p.id,
  COALESCE(p.first_name || ' ' || p.last_name, 'Provider') as business_name,
  0 as years_experience,
  false as is_verified,
  0.00 as rating,
  0 as total_reviews,
  0 as total_bookings,
  10 as service_radius_km
FROM profiles p
WHERE p.id = 'be52ce31-9c84-4a24-b95e-2c046b1e2c9e'
AND NOT EXISTS (
  SELECT 1 FROM provider_profiles pp WHERE pp.id = p.id
);

-- Verify it was created
SELECT 
  pp.id,
  pp.business_name,
  p.first_name,
  p.last_name
FROM provider_profiles pp
JOIN profiles p ON p.id = pp.id
WHERE pp.id = 'be52ce31-9c84-4a24-b95e-2c046b1e2c9e';

