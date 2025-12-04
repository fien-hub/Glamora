-- Delete all test accounts
-- WARNING: This will delete ALL user data. Use with caution!

-- First, delete all related data in the correct order to respect foreign key constraints

-- Delete analytics events
DELETE FROM analytics_events;

-- Delete portfolio engagement
DELETE FROM portfolio_views;
DELETE FROM portfolio_saves;
DELETE FROM portfolio_likes;

-- Delete portfolio items
DELETE FROM portfolio_items;

-- Delete reviews
DELETE FROM reviews;

-- Delete bookings
DELETE FROM bookings;

-- Delete services
DELETE FROM services;

-- Delete availability
DELETE FROM availability;

-- Delete provider profiles
DELETE FROM provider_profiles;

-- Delete customer profiles
DELETE FROM customer_profiles;

-- Delete profiles (if exists)
DELETE FROM profiles;

-- Finally, delete auth users
-- Note: This requires admin privileges and should be done via Supabase Dashboard
-- or using the Supabase Management API

-- Display remaining users (for verification)
SELECT 
    id, 
    email, 
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

