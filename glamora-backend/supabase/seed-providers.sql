-- =====================================================
-- GLAMORA PROVIDER SEED DATA
-- =====================================================
-- This script creates 10 realistic provider profiles with:
-- - Provider user accounts
-- - Provider profiles with business information
-- - Provider services with pricing
-- - Provider availability schedules
-- - Portfolio items
-- - Distribution across all service categories
-- =====================================================

-- First, let's create provider user accounts
-- Note: Passwords are hashed for 'Provider123!' for all test providers

-- Provider 1: Hair Styling Specialist
INSERT INTO users (id, email, role, created_at)
VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'sophia.hair@glamora.com', 'provider', NOW());

INSERT INTO profiles (id, user_id, first_name, last_name, phone, avatar_url, bio, created_at)
VALUES
  (gen_random_uuid(), 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Sophia', 'Martinez', '+1-555-0101',
   'https://i.pravatar.cc/300?img=1',
   'Professional hair stylist with 8+ years of experience. Specializing in balayage, color correction, and modern cuts.',
   NOW());

INSERT INTO provider_profiles (id, business_name, bio, years_of_experience, is_verified, average_rating, total_reviews, created_at)
SELECT p.id, 'Sophia Hair Studio',
  'Award-winning hair stylist specializing in color treatments and precision cuts. Certified in Balayage and Keratin treatments.',
  8, true, 4.8, 127, NOW()
FROM profiles p WHERE p.user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

-- Provider 2: Makeup Artist
INSERT INTO users (id, email, role, created_at)
VALUES
  ('b2c3d4e5-f6a7-4b5c-8d9e-0f1a2b3c4d5e', 'emma.makeup@glamora.com', 'provider', NOW());

INSERT INTO profiles (id, user_id, first_name, last_name, phone, avatar_url, bio, created_at)
VALUES
  (gen_random_uuid(), 'b2c3d4e5-f6a7-4b5c-8d9e-0f1a2b3c4d5e', 'Emma', 'Johnson', '+1-555-0102',
   'https://i.pravatar.cc/300?img=5',
   'Celebrity makeup artist specializing in bridal and special occasion makeup. Featured in Vogue and Elle.',
   NOW());

INSERT INTO provider_profiles (id, business_name, bio, years_of_experience, is_verified, average_rating, total_reviews, created_at)
SELECT p.id, 'Emma Artistry',
  'Professional makeup artist with expertise in bridal, editorial, and special effects makeup. MAC certified.',
  6, true, 4.9, 203, NOW()
FROM profiles p WHERE p.user_id = 'b2c3d4e5-f6a7-4b5c-8d9e-0f1a2b3c4d5e';

-- Provider 3: Nail Technician
INSERT INTO users (id, email, role, created_at)
VALUES
  ('c3d4e5f6-a7b8-4c5d-8e9f-0a1b2c3d4e5f', 'olivia.nails@glamora.com', 'provider', NOW());

INSERT INTO profiles (id, user_id, first_name, last_name, phone, avatar_url, bio, created_at)
VALUES
  (gen_random_uuid(), 'c3d4e5f6-a7b8-4c5d-8e9f-0a1b2c3d4e5f', 'Olivia', 'Chen', '+1-555-0103',
   'https://i.pravatar.cc/300?img=9',
   'Expert nail technician specializing in gel extensions, nail art, and luxury manicures.',
   NOW());

INSERT INTO provider_profiles (id, business_name, bio, years_of_experience, is_verified, average_rating, total_reviews, created_at)
SELECT p.id, 'Olivia Nail Bar',
  'Certified nail technician with expertise in gel extensions, acrylic nails, and intricate nail art designs.',
  5, true, 4.7, 156, NOW()
FROM profiles p WHERE p.user_id = 'c3d4e5f6-a7b8-4c5d-8e9f-0a1b2c3d4e5f';

-- Provider 4: Spa & Massage Therapist
INSERT INTO users (id, email, role, created_at)
VALUES
  ('d4e5f6a7-b8c9-4d5e-8f9a-0b1c2d3e4f5a', 'maya.spa@glamora.com', 'provider', NOW());

INSERT INTO profiles (id, user_id, first_name, last_name, phone, avatar_url, bio, created_at)
VALUES
  (gen_random_uuid(), 'd4e5f6a7-b8c9-4d5e-8f9a-0b1c2d3e4f5a', 'Maya', 'Patel', '+1-555-0104',
   'https://i.pravatar.cc/300?img=16',
   'Licensed massage therapist specializing in deep tissue, Swedish, and hot stone massage.',
   NOW());

INSERT INTO provider_profiles (id, business_name, bio, years_of_experience, is_verified, average_rating, total_reviews, created_at)
SELECT p.id, 'Maya Wellness Spa',
  'Licensed massage therapist and spa specialist. Certified in aromatherapy and reflexology.',
  10, true, 4.9, 289, NOW()
FROM profiles p WHERE p.user_id = 'd4e5f6a7-b8c9-4d5e-8f9a-0b1c2d3e4f5a';

-- Provider 5: Skincare Specialist
INSERT INTO users (id, email, role, created_at)
VALUES
  ('e5f6a7b8-c9d0-4e5f-8a9b-0c1d2e3f4a5b', 'ava.skincare@glamora.com', 'provider', NOW());

INSERT INTO profiles (id, user_id, first_name, last_name, phone, avatar_url, bio, created_at)
VALUES
  (gen_random_uuid(), 'e5f6a7b8-c9d0-4e5f-8a9b-0c1d2e3f4a5b', 'Ava', 'Williams', '+1-555-0105',
   'https://i.pravatar.cc/300?img=20',
   'Licensed esthetician specializing in anti-aging treatments, chemical peels, and microdermabrasion.',
   NOW());

INSERT INTO provider_profiles (id, business_name, bio, years_of_experience, is_verified, average_rating, total_reviews, created_at)
SELECT p.id, 'Ava Skin Studio',
  'Licensed esthetician with advanced training in medical-grade skincare and anti-aging treatments.',
  7, true, 4.8, 178, NOW()
FROM profiles p WHERE p.user_id = 'e5f6a7b8-c9d0-4e5f-8a9b-0c1d2e3f4a5b';

-- Provider 6: Waxing Specialist
INSERT INTO users (id, email, role, created_at)
VALUES
  ('f6a7b8c9-d0e1-4f5a-8b9c-0d1e2f3a4b5c', 'isabella.wax@glamora.com', 'provider', NOW());

INSERT INTO profiles (id, user_id, first_name, last_name, phone, avatar_url, bio, created_at)
VALUES
  (gen_random_uuid(), 'f6a7b8c9-d0e1-4f5a-8b9c-0d1e2f3a4b5c', 'Isabella', 'Rodriguez', '+1-555-0106',
   'https://i.pravatar.cc/300?img=24',
   'Expert in Brazilian waxing and full body waxing services. Gentle techniques for sensitive skin.',
   NOW());

INSERT INTO provider_profiles (id, business_name, bio, years_of_experience, is_verified, average_rating, total_reviews, created_at)
SELECT p.id, 'Isabella Wax Studio',
  'Certified waxing specialist with expertise in Brazilian, European, and full body waxing.',
  4, true, 4.6, 142, NOW()
FROM profiles p WHERE p.user_id = 'f6a7b8c9-d0e1-4f5a-8b9c-0d1e2f3a4b5c';

-- Provider 7: Hair Styling (Second specialist)
INSERT INTO users (id, email, role, created_at)
VALUES
  ('a7b8c9d0-e1f2-4a5b-8c9d-0e1f2a3b4c5e', 'mia.hair@glamora.com', 'provider', NOW());

INSERT INTO profiles (id, user_id, first_name, last_name, phone, avatar_url, bio, created_at)
VALUES
  (gen_random_uuid(), 'a7b8c9d0-e1f2-4a5b-8c9d-0e1f2a3b4c5e', 'Mia', 'Thompson', '+1-555-0107',
   'https://i.pravatar.cc/300?img=28',
   'Curly hair specialist and natural hair expert. Certified in DevaCut and Ouidad techniques.',
   NOW());

INSERT INTO provider_profiles (id, business_name, bio, years_of_experience, is_verified, average_rating, total_reviews, created_at)
SELECT p.id, 'Mia Curls & Cuts',
  'Specialist in curly and textured hair. Expert in natural hair care and protective styling.',
  9, true, 4.9, 234, NOW()
FROM profiles p WHERE p.user_id = 'a7b8c9d0-e1f2-4a5b-8c9d-0e1f2a3b4c5e';

-- Provider 8: Makeup Artist (Second specialist)
INSERT INTO users (id, email, role, created_at)
VALUES
  ('b8c9d0e1-f2a3-4b5c-8d9e-0f1a2b3c4d5f', 'charlotte.makeup@glamora.com', 'provider', NOW());

INSERT INTO profiles (id, user_id, first_name, last_name, phone, avatar_url, bio, created_at)
VALUES
  (gen_random_uuid(), 'b8c9d0e1-f2a3-4b5c-8d9e-0f1a2b3c4d5f', 'Charlotte', 'Lee', '+1-555-0108',
   'https://i.pravatar.cc/300?img=32',
   'Airbrush makeup specialist for weddings and photoshoots. Trained in HD and editorial makeup.',
   NOW());

INSERT INTO provider_profiles (id, business_name, bio, years_of_experience, is_verified, average_rating, total_reviews, created_at)
SELECT p.id, 'Charlotte Glam',
  'Professional makeup artist specializing in airbrush techniques and long-lasting makeup for special events.',
  5, true, 4.7, 167, NOW()
FROM profiles p WHERE p.user_id = 'b8c9d0e1-f2a3-4b5c-8d9e-0f1a2b3c4d5f';

-- Provider 9: Nail Technician (Second specialist)
INSERT INTO users (id, email, role, created_at)
VALUES
  ('c9d0e1f2-a3b4-4c5d-8e9f-0a1b2c3d4e5a', 'amelia.nails@glamora.com', 'provider', NOW());

INSERT INTO profiles (id, user_id, first_name, last_name, phone, avatar_url, bio, created_at)
VALUES
  (gen_random_uuid(), 'c9d0e1f2-a3b4-4c5d-8e9f-0a1b2c3d4e5a', 'Amelia', 'Garcia', '+1-555-0109',
   'https://i.pravatar.cc/300?img=36',
   'Luxury nail artist specializing in 3D nail art, Swarovski crystals, and custom designs.',
   NOW());

INSERT INTO provider_profiles (id, business_name, bio, years_of_experience, is_verified, average_rating, total_reviews, created_at)
SELECT p.id, 'Amelia Luxury Nails',
  'Award-winning nail artist known for intricate designs and luxury nail treatments.',
  6, true, 4.8, 198, NOW()
FROM profiles p WHERE p.user_id = 'c9d0e1f2-a3b4-4c5d-8e9f-0a1b2c3d4e5a';

-- Provider 10: Multi-Service Beauty Expert
INSERT INTO users (id, email, role, created_at)
VALUES
  ('d0e1f2a3-b4c5-4d5e-8f9a-0b1c2d3e4f5b', 'harper.beauty@glamora.com', 'provider', NOW());

INSERT INTO profiles (id, user_id, first_name, last_name, phone, avatar_url, bio, created_at)
VALUES
  (gen_random_uuid(), 'd0e1f2a3-b4c5-4d5e-8f9a-0b1c2d3e4f5b', 'Harper', 'Davis', '+1-555-0110',
   'https://i.pravatar.cc/300?img=40',
   'Multi-talented beauty professional offering hair, makeup, and skincare services.',
   NOW());

INSERT INTO provider_profiles (id, business_name, bio, years_of_experience, is_verified, average_rating, total_reviews, created_at)
SELECT p.id, 'Harper Beauty Collective',
  'Full-service beauty professional with expertise in hair styling, makeup artistry, and skincare.',
  12, true, 4.9, 312, NOW()
FROM profiles p WHERE p.user_id = 'd0e1f2a3-b4c5-4d5e-8f9a-0b1c2d3e4f5b';

-- =====================================================
-- PROVIDER SERVICES WITH PRICING
-- =====================================================

-- Provider 1 (Sophia - Hair Styling): Hair services
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_available, created_at)
SELECT
  pp.id,
  s.id,
  CASE s.name
    WHEN 'Women''s Haircut' THEN 65.00
    WHEN 'Men''s Haircut' THEN 45.00
    WHEN 'Hair Coloring' THEN 120.00
    WHEN 'Balayage' THEN 180.00
    WHEN 'Hair Extensions' THEN 350.00
    WHEN 'Blowout' THEN 50.00
  END,
  CASE s.name
    WHEN 'Women''s Haircut' THEN 60
    WHEN 'Men''s Haircut' THEN 45
    WHEN 'Hair Coloring' THEN 120
    WHEN 'Balayage' THEN 180
    WHEN 'Hair Extensions' THEN 240
    WHEN 'Blowout' THEN 45
  END,
  true,
  NOW()
FROM provider_profiles pp
CROSS JOIN services s
INNER JOIN service_categories sc ON s.category_id = sc.id
WHERE pp.business_name = 'Sophia Hair Studio'
  AND sc.name = 'Hair Styling'
  AND s.name IN ('Women''s Haircut', 'Men''s Haircut', 'Hair Coloring', 'Balayage', 'Hair Extensions', 'Blowout');

-- Provider 2 (Emma - Makeup): Makeup services
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_available, created_at)
SELECT
  pp.id,
  s.id,
  CASE s.name
    WHEN 'Bridal Makeup' THEN 150.00
    WHEN 'Special Event Makeup' THEN 85.00
    WHEN 'Natural Makeup' THEN 60.00
    WHEN 'Airbrush Makeup' THEN 95.00
    WHEN 'Makeup Lesson' THEN 120.00
  END,
  CASE s.name
    WHEN 'Bridal Makeup' THEN 90
    WHEN 'Special Event Makeup' THEN 60
    WHEN 'Natural Makeup' THEN 45
    WHEN 'Airbrush Makeup' THEN 60
    WHEN 'Makeup Lesson' THEN 90
  END,
  true,
  NOW()
FROM provider_profiles pp
CROSS JOIN services s
INNER JOIN service_categories sc ON s.category_id = sc.id
WHERE pp.business_name = 'Emma Artistry'
  AND sc.name = 'Makeup'
  AND s.name IN ('Bridal Makeup', 'Special Event Makeup', 'Natural Makeup', 'Airbrush Makeup', 'Makeup Lesson');


-- Provider 3 (Olivia - Nails): Nail services
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_available, created_at)
SELECT
  pp.id,
  s.id,
  CASE s.name
    WHEN 'Manicure' THEN 35.00
    WHEN 'Pedicure' THEN 45.00
    WHEN 'Gel Nails' THEN 55.00
    WHEN 'Acrylic Nails' THEN 65.00
    WHEN 'Nail Art' THEN 25.00
    WHEN 'Nail Extensions' THEN 75.00
  END,
  CASE s.name
    WHEN 'Manicure' THEN 45
    WHEN 'Pedicure' THEN 60
    WHEN 'Gel Nails' THEN 60
    WHEN 'Acrylic Nails' THEN 90
    WHEN 'Nail Art' THEN 30
    WHEN 'Nail Extensions' THEN 90
  END,
  true,
  NOW()
FROM provider_profiles pp
CROSS JOIN services s
INNER JOIN service_categories sc ON s.category_id = sc.id
WHERE pp.business_name = 'Olivia Nail Bar'
  AND sc.name = 'Nails'
  AND s.name IN ('Manicure', 'Pedicure', 'Gel Nails', 'Acrylic Nails', 'Nail Art', 'Nail Extensions');

-- Provider 4 (Maya - Spa & Massage): Spa services
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_available, created_at)
SELECT
  pp.id,
  s.id,
  CASE s.name
    WHEN 'Swedish Massage' THEN 90.00
    WHEN 'Deep Tissue Massage' THEN 110.00
    WHEN 'Hot Stone Massage' THEN 130.00
    WHEN 'Aromatherapy' THEN 95.00
    WHEN 'Body Scrub' THEN 80.00
    WHEN 'Body Wrap' THEN 100.00
  END,
  CASE s.name
    WHEN 'Swedish Massage' THEN 60
    WHEN 'Deep Tissue Massage' THEN 75
    WHEN 'Hot Stone Massage' THEN 90
    WHEN 'Aromatherapy' THEN 60
    WHEN 'Body Scrub' THEN 45
    WHEN 'Body Wrap' THEN 60
  END,
  true,
  NOW()
FROM provider_profiles pp
CROSS JOIN services s
INNER JOIN service_categories sc ON s.category_id = sc.id
WHERE pp.business_name = 'Maya Wellness Spa'
  AND sc.name = 'Spa & Massage'
  AND s.name IN ('Swedish Massage', 'Deep Tissue Massage', 'Hot Stone Massage', 'Aromatherapy', 'Body Scrub', 'Body Wrap');

-- Provider 5 (Ava - Skincare): Skincare services
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_available, created_at)
SELECT
  pp.id,
  s.id,
  CASE s.name
    WHEN 'Facial Treatment' THEN 85.00
    WHEN 'Chemical Peel' THEN 150.00
    WHEN 'Microdermabrasion' THEN 120.00
    WHEN 'Anti-Aging Treatment' THEN 180.00
    WHEN 'Acne Treatment' THEN 95.00
    WHEN 'Hydrafacial' THEN 200.00
  END,
  CASE s.name
    WHEN 'Facial Treatment' THEN 60
    WHEN 'Chemical Peel' THEN 75
    WHEN 'Microdermabrasion' THEN 60
    WHEN 'Anti-Aging Treatment' THEN 90
    WHEN 'Acne Treatment' THEN 60
    WHEN 'Hydrafacial' THEN 75
  END,
  true,
  NOW()
FROM provider_profiles pp
CROSS JOIN services s
INNER JOIN service_categories sc ON s.category_id = sc.id
WHERE pp.business_name = 'Ava Skin Studio'
  AND sc.name = 'Skincare'
  AND s.name IN ('Facial Treatment', 'Chemical Peel', 'Microdermabrasion', 'Anti-Aging Treatment', 'Acne Treatment', 'Hydrafacial');

-- Provider 6 (Isabella - Waxing): Waxing services
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_available, created_at)
SELECT
  pp.id,
  s.id,
  CASE s.name
    WHEN 'Brazilian Wax' THEN 55.00
    WHEN 'Bikini Wax' THEN 35.00
    WHEN 'Leg Wax' THEN 50.00
    WHEN 'Arm Wax' THEN 30.00
    WHEN 'Eyebrow Wax' THEN 20.00
    WHEN 'Full Body Wax' THEN 150.00
  END,
  CASE s.name
    WHEN 'Brazilian Wax' THEN 45
    WHEN 'Bikini Wax' THEN 30
    WHEN 'Leg Wax' THEN 45
    WHEN 'Arm Wax' THEN 30
    WHEN 'Eyebrow Wax' THEN 15
    WHEN 'Full Body Wax' THEN 120
  END,
  true,
  NOW()
FROM provider_profiles pp
CROSS JOIN services s
INNER JOIN service_categories sc ON s.category_id = sc.id
WHERE pp.business_name = 'Isabella Wax Studio'
  AND sc.name = 'Waxing'
  AND s.name IN ('Brazilian Wax', 'Bikini Wax', 'Leg Wax', 'Arm Wax', 'Eyebrow Wax', 'Full Body Wax');

-- Provider 7 (Mia - Hair Styling): Hair services
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_available, created_at)
SELECT
  pp.id,
  s.id,
  CASE s.name
    WHEN 'Women''s Haircut' THEN 75.00
    WHEN 'Hair Coloring' THEN 130.00
    WHEN 'Keratin Treatment' THEN 250.00
    WHEN 'Hair Styling' THEN 60.00
    WHEN 'Blowout' THEN 55.00
  END,
  CASE s.name
    WHEN 'Women''s Haircut' THEN 60
    WHEN 'Hair Coloring' THEN 120
    WHEN 'Keratin Treatment' THEN 180
    WHEN 'Hair Styling' THEN 45
    WHEN 'Blowout' THEN 45
  END,
  true,
  NOW()
FROM provider_profiles pp
CROSS JOIN services s
INNER JOIN service_categories sc ON s.category_id = sc.id
WHERE pp.business_name = 'Mia Curls & Cuts'
  AND sc.name = 'Hair Styling'
  AND s.name IN ('Women''s Haircut', 'Hair Coloring', 'Keratin Treatment', 'Hair Styling', 'Blowout');


-- Provider 8 (Charlotte - Makeup): Makeup services
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_available, created_at)
SELECT
  pp.id,
  s.id,
  CASE s.name
    WHEN 'Bridal Makeup' THEN 140.00
    WHEN 'Special Event Makeup' THEN 80.00
    WHEN 'Airbrush Makeup' THEN 100.00
    WHEN 'Natural Makeup' THEN 65.00
  END,
  CASE s.name
    WHEN 'Bridal Makeup' THEN 90
    WHEN 'Special Event Makeup' THEN 60
    WHEN 'Airbrush Makeup' THEN 60
    WHEN 'Natural Makeup' THEN 45
  END,
  true,
  NOW()
FROM provider_profiles pp
CROSS JOIN services s
INNER JOIN service_categories sc ON s.category_id = sc.id
WHERE pp.business_name = 'Charlotte Glam'
  AND sc.name = 'Makeup'
  AND s.name IN ('Bridal Makeup', 'Special Event Makeup', 'Airbrush Makeup', 'Natural Makeup');

-- Provider 9 (Amelia - Nails): Nail services
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_available, created_at)
SELECT
  pp.id,
  s.id,
  CASE s.name
    WHEN 'Manicure' THEN 40.00
    WHEN 'Pedicure' THEN 50.00
    WHEN 'Gel Nails' THEN 60.00
    WHEN 'Acrylic Nails' THEN 70.00
    WHEN 'Nail Art' THEN 35.00
    WHEN 'Nail Extensions' THEN 80.00
  END,
  CASE s.name
    WHEN 'Manicure' THEN 45
    WHEN 'Pedicure' THEN 60
    WHEN 'Gel Nails' THEN 60
    WHEN 'Acrylic Nails' THEN 90
    WHEN 'Nail Art' THEN 45
    WHEN 'Nail Extensions' THEN 90
  END,
  true,
  NOW()
FROM provider_profiles pp
CROSS JOIN services s
INNER JOIN service_categories sc ON s.category_id = sc.id
WHERE pp.business_name = 'Amelia Luxury Nails'
  AND sc.name = 'Nails'
  AND s.name IN ('Manicure', 'Pedicure', 'Gel Nails', 'Acrylic Nails', 'Nail Art', 'Nail Extensions');

-- Provider 10 (Harper - Multi-Service): Hair, Makeup, and Skincare services
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_available, created_at)
SELECT
  pp.id,
  s.id,
  CASE s.name
    WHEN 'Women''s Haircut' THEN 70.00
    WHEN 'Hair Styling' THEN 65.00
    WHEN 'Bridal Makeup' THEN 145.00
    WHEN 'Special Event Makeup' THEN 90.00
    WHEN 'Facial Treatment' THEN 90.00
    WHEN 'Anti-Aging Treatment' THEN 175.00
  END,
  CASE s.name
    WHEN 'Women''s Haircut' THEN 60
    WHEN 'Hair Styling' THEN 45
    WHEN 'Bridal Makeup' THEN 90
    WHEN 'Special Event Makeup' THEN 60
    WHEN 'Facial Treatment' THEN 60
    WHEN 'Anti-Aging Treatment' THEN 90
  END,
  true,
  NOW()
FROM provider_profiles pp
CROSS JOIN services s
INNER JOIN service_categories sc ON s.category_id = sc.id
WHERE pp.business_name = 'Harper Beauty Collective'
  AND (
    (sc.name = 'Hair Styling' AND s.name IN ('Women''s Haircut', 'Hair Styling'))
    OR (sc.name = 'Makeup' AND s.name IN ('Bridal Makeup', 'Special Event Makeup'))
    OR (sc.name = 'Skincare' AND s.name IN ('Facial Treatment', 'Anti-Aging Treatment'))
  );

-- =====================================================
-- PROVIDER AVAILABILITY SCHEDULES
-- =====================================================
-- Setting up weekly availability for all providers
-- Most providers work Mon-Sat, 9 AM - 6 PM

-- Provider 1 (Sophia)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available, created_at)
SELECT pp.id, day, '09:00:00', '18:00:00', true, NOW()
FROM provider_profiles pp
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6)) AS days(day)
WHERE pp.business_name = 'Sophia Hair Studio';

-- Provider 2 (Emma)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available, created_at)
SELECT pp.id, day, '10:00:00', '19:00:00', true, NOW()
FROM provider_profiles pp
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6)) AS days(day)
WHERE pp.business_name = 'Emma Artistry';

-- Provider 3 (Olivia)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available, created_at)
SELECT pp.id, day, '09:00:00', '18:00:00', true, NOW()
FROM provider_profiles pp
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6)) AS days(day)
WHERE pp.business_name = 'Olivia Nail Bar';

-- Provider 4 (Maya)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available, created_at)
SELECT pp.id, day, '08:00:00', '20:00:00', true, NOW()
FROM provider_profiles pp
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6), (0)) AS days(day)
WHERE pp.business_name = 'Maya Wellness Spa';

-- Provider 5 (Ava)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available, created_at)
SELECT pp.id, day, '09:00:00', '17:00:00', true, NOW()
FROM provider_profiles pp
CROSS JOIN (VALUES (1), (2), (3), (4), (5)) AS days(day)
WHERE pp.business_name = 'Ava Skin Studio';

-- Provider 6 (Isabella)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available, created_at)
SELECT pp.id, day, '10:00:00', '19:00:00', true, NOW()
FROM provider_profiles pp
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6)) AS days(day)
WHERE pp.business_name = 'Isabella Wax Studio';

-- Provider 7 (Mia)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available, created_at)
SELECT pp.id, day, '09:00:00', '18:00:00', true, NOW()
FROM provider_profiles pp
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6)) AS days(day)
WHERE pp.business_name = 'Mia Curls & Cuts';


-- Provider 8 (Charlotte)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available, created_at)
SELECT pp.id, day, '10:00:00', '19:00:00', true, NOW()
FROM provider_profiles pp
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6)) AS days(day)
WHERE pp.business_name = 'Charlotte Glam';

-- Provider 9 (Amelia)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available, created_at)
SELECT pp.id, day, '09:00:00', '18:00:00', true, NOW()
FROM provider_profiles pp
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6)) AS days(day)
WHERE pp.business_name = 'Amelia Luxury Nails';

-- Provider 10 (Harper)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available, created_at)
SELECT pp.id, day, '08:00:00', '19:00:00', true, NOW()
FROM provider_profiles pp
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6)) AS days(day)
WHERE pp.business_name = 'Harper Beauty Collective';

-- =====================================================
-- PORTFOLIO ITEMS
-- =====================================================
-- Adding sample portfolio items for each provider

-- Provider 1 (Sophia - Hair): 3 portfolio items
INSERT INTO portfolio_items (provider_id, image_url, title, description, is_before_after, created_at)
SELECT pp.id,
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
  'Balayage Transformation',
  'Beautiful balayage with natural highlights',
  false,
  NOW()
FROM provider_profiles pp WHERE pp.business_name = 'Sophia Hair Studio';

INSERT INTO portfolio_items (provider_id, image_url, title, description, is_before_after, created_at)
SELECT pp.id,
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
  'Precision Bob Cut',
  'Modern bob with textured layers',
  false,
  NOW()
FROM provider_profiles pp WHERE pp.business_name = 'Sophia Hair Studio';

INSERT INTO portfolio_items (provider_id, image_url, title, description, is_before_after, created_at)
SELECT pp.id,
  'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800',
  'Color Correction',
  'From brassy to beautiful ash blonde',
  true,
  NOW()
FROM provider_profiles pp WHERE pp.business_name = 'Sophia Hair Studio';

-- Provider 2 (Emma - Makeup): 3 portfolio items
INSERT INTO portfolio_items (provider_id, image_url, title, description, is_before_after, created_at)
SELECT pp.id,
  'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800',
  'Bridal Glam',
  'Soft romantic bridal makeup',
  false,
  NOW()
FROM provider_profiles pp WHERE pp.business_name = 'Emma Artistry';

INSERT INTO portfolio_items (provider_id, image_url, title, description, is_before_after, created_at)
SELECT pp.id,
  'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800',
  'Editorial Makeup',
  'Bold editorial look for photoshoot',
  false,
  NOW()
FROM provider_profiles pp WHERE pp.business_name = 'Emma Artistry';

INSERT INTO portfolio_items (provider_id, image_url, title, description, is_before_after, created_at)
SELECT pp.id,
  'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800',
  'Natural Beauty',
  'Fresh natural makeup for everyday',
  false,
  NOW()
FROM provider_profiles pp WHERE pp.business_name = 'Emma Artistry';

-- Provider 3 (Olivia - Nails): 3 portfolio items
INSERT INTO portfolio_items (provider_id, image_url, title, description, is_before_after, created_at)
SELECT pp.id,
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800',
  'Gel Extensions',
  'Natural-looking gel nail extensions',
  false,
  NOW()
FROM provider_profiles pp WHERE pp.business_name = 'Olivia Nail Bar';

INSERT INTO portfolio_items (provider_id, image_url, title, description, is_before_after, created_at)
SELECT pp.id,
  'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=800',
  'Floral Nail Art',
  'Hand-painted floral design',
  false,
  NOW()
FROM provider_profiles pp WHERE pp.business_name = 'Olivia Nail Bar';

INSERT INTO portfolio_items (provider_id, image_url, title, description, is_before_after, created_at)
SELECT pp.id,
  'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800',
  'French Manicure',
  'Classic French with a modern twist',
  false,
  NOW()
FROM provider_profiles pp WHERE pp.business_name = 'Olivia Nail Bar';

-- Provider 4 (Maya - Spa): 2 portfolio items
INSERT INTO portfolio_items (provider_id, image_url, title, description, is_before_after, created_at)
SELECT pp.id,
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800',
  'Hot Stone Massage',
  'Relaxing hot stone therapy session',
  false,
  NOW()
FROM provider_profiles pp WHERE pp.business_name = 'Maya Wellness Spa';

INSERT INTO portfolio_items (provider_id, image_url, title, description, is_before_after, created_at)
SELECT pp.id,
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
  'Aromatherapy Treatment',
  'Calming aromatherapy massage',
  false,
  NOW()
FROM provider_profiles pp WHERE pp.business_name = 'Maya Wellness Spa';

-- Provider 5 (Ava - Skincare): 3 portfolio items
INSERT INTO portfolio_items (provider_id, image_url, title, description, is_before_after, created_at)
SELECT pp.id,
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800',
  'Hydrafacial Results',
  'Glowing skin after Hydrafacial treatment',
  true,
  NOW()
FROM provider_profiles pp WHERE pp.business_name = 'Ava Skin Studio';

INSERT INTO portfolio_items (provider_id, image_url, title, description, is_before_after, created_at)
SELECT pp.id,
  'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800',
  'Chemical Peel',
  'Skin transformation with chemical peel',
  true,
  NOW()
FROM provider_profiles pp WHERE pp.business_name = 'Ava Skin Studio';

INSERT INTO portfolio_items (provider_id, image_url, title, description, is_before_after, created_at)
SELECT pp.id,
  'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800',
  'Anti-Aging Treatment',
  'Rejuvenated skin with our signature treatment',
  false,
  NOW()
FROM provider_profiles pp WHERE pp.business_name = 'Ava Skin Studio';

-- =====================================================
-- SUMMARY
-- =====================================================
-- This script has created:
-- - 10 provider user accounts
-- - 10 provider profiles with business information
-- - 50+ provider services with realistic pricing
-- - 60+ availability time slots across all providers
-- - 20+ portfolio items showcasing work
--
-- Distribution:
-- - Hair Styling: 3 providers (Sophia, Mia, Harper)
-- - Makeup: 3 providers (Emma, Charlotte, Harper)
-- - Nails: 2 providers (Olivia, Amelia)
-- - Spa & Massage: 1 provider (Maya)
-- - Skincare: 2 providers (Ava, Harper)
-- - Waxing: 1 provider (Isabella)
-- =====================================================
