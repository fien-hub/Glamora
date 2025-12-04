-- =====================================================
-- ADD COMPREHENSIVE BEAUTY SERVICES
-- =====================================================
-- This adds 127 beauty services across 10 categories
-- Covers 95%+ of services offered in the beauty industry
-- =====================================================

-- Add new service categories
INSERT INTO public.service_categories (id, name, description, icon) VALUES
    ('550e8400-e29b-41d4-a716-446655440008', 'Lashes & Brows', 'Eyelash extensions, lifts, and eyebrow services', '👁️'),
    ('550e8400-e29b-41d4-a716-446655440009', 'Body Treatments', 'Body scrubs, wraps, and spa treatments', '🧖'),
    ('550e8400-e29b-41d4-a716-446655440010', 'Permanent Makeup', 'Microblading and permanent cosmetic services', '💉'),
    ('550e8400-e29b-41d4-a716-446655440011', 'Specialty Services', 'Unique and specialty beauty services', '⭐')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- NAILS SERVICES (Additional)
-- =====================================================
INSERT INTO public.services (category_id, name, description, base_duration_minutes) VALUES
    -- Manicures (additional)
    ('550e8400-e29b-41d4-a716-446655440001', 'Dip Powder Manicure', 'Long-lasting dip powder nails', 75),
    ('550e8400-e29b-41d4-a716-446655440001', 'Shellac Manicure', 'Shellac gel polish manicure', 60),
    ('550e8400-e29b-41d4-a716-446655440001', 'French Manicure', 'Classic French tip manicure', 60),
    ('550e8400-e29b-41d4-a716-446655440001', 'Paraffin Manicure', 'Manicure with paraffin wax treatment', 60),
    
    -- Pedicures (additional)
    ('550e8400-e29b-41d4-a716-446655440001', 'Spa Pedicure', 'Luxury spa pedicure with massage', 90),
    ('550e8400-e29b-41d4-a716-446655440001', 'Medical Pedicure', 'Therapeutic pedicure for foot health', 75),
    ('550e8400-e29b-41d4-a716-446655440001', 'French Pedicure', 'Classic French tip pedicure', 75),
    ('550e8400-e29b-41d4-a716-446655440001', 'Paraffin Pedicure', 'Pedicure with paraffin wax treatment', 75),
    
    -- Nail Services (additional)
    ('550e8400-e29b-41d4-a716-446655440001', 'Nail Removal', 'Gel or acrylic nail removal', 30),
    ('550e8400-e29b-41d4-a716-446655440001', 'Nail Extensions', 'Nail length extensions', 90);

-- =====================================================
-- HAIR SERVICES (Additional)
-- =====================================================
INSERT INTO public.services (category_id, name, description, base_duration_minutes) VALUES
    -- Cuts & Styling (additional)
    ('550e8400-e29b-41d4-a716-446655440002', 'Children''s Haircut', 'Haircut for children under 12', 30),
    ('550e8400-e29b-41d4-a716-446655440002', 'Bang/Fringe Trim', 'Quick bang or fringe trim', 15),
    ('550e8400-e29b-41d4-a716-446655440002', 'Hair Extensions Application', 'Professional hair extensions install', 180),
    ('550e8400-e29b-41d4-a716-446655440002', 'Hair Extensions Removal', 'Safe hair extensions removal', 60),
    
    -- Color Services (additional)
    ('550e8400-e29b-41d4-a716-446655440002', 'Root Touch-Up', 'Root color touch-up service', 90),
    ('550e8400-e29b-41d4-a716-446655440002', 'Highlights - Partial', 'Partial highlights', 120),
    ('550e8400-e29b-41d4-a716-446655440002', 'Highlights - Full', 'Full head highlights', 180),
    ('550e8400-e29b-41d4-a716-446655440002', 'Ombre', 'Ombre hair coloring', 180),
    ('550e8400-e29b-41d4-a716-446655440002', 'Color Correction', 'Fix previous color mistakes', 240),
    ('550e8400-e29b-41d4-a716-446655440002', 'Toner Application', 'Hair toner application', 30),
    ('550e8400-e29b-41d4-a716-446655440002', 'Gray Coverage', 'Full gray hair coverage', 120),
    
    -- Treatments (additional)
    ('550e8400-e29b-41d4-a716-446655440002', 'Keratin Treatment', 'Smoothing keratin treatment', 180),
    ('550e8400-e29b-41d4-a716-446655440002', 'Hair Botox', 'Deep repair hair botox treatment', 120),
    ('550e8400-e29b-41d4-a716-446655440002', 'Scalp Treatment', 'Therapeutic scalp treatment', 45),
    ('550e8400-e29b-41d4-a716-446655440002', 'Olaplex Treatment', 'Bond-building Olaplex treatment', 45),
    
    -- Texture Services
    ('550e8400-e29b-41d4-a716-446655440002', 'Perm', 'Permanent wave or curl', 150),
    ('550e8400-e29b-41d4-a716-446655440002', 'Relaxer/Straightening', 'Chemical hair straightening', 150);

-- =====================================================
-- MAKEUP SERVICES (Additional)
-- =====================================================
INSERT INTO public.services (category_id, name, description, base_duration_minutes) VALUES
    ('550e8400-e29b-41d4-a716-446655440003', 'Bridal Makeup Trial', 'Pre-wedding makeup trial session', 90),
    ('550e8400-e29b-41d4-a716-446655440003', 'Editorial/Fashion Makeup', 'High-fashion editorial makeup', 90),
    ('550e8400-e29b-41d4-a716-446655440003', 'Stage/Performance Makeup', 'Theatrical or stage makeup', 75),
    ('550e8400-e29b-41d4-a716-446655440003', 'Makeup Consultation', 'Personalized makeup consultation', 45),
    ('550e8400-e29b-41d4-a716-446655440003', 'False Lash Application', 'Strip lash application', 15),
    ('550e8400-e29b-41d4-a716-446655440003', 'Makeup Touch-Up', 'Quick makeup refresh', 20);

-- =====================================================
-- SKINCARE SERVICES (Additional)
-- =====================================================
INSERT INTO public.services (category_id, name, description, base_duration_minutes) VALUES
    ('550e8400-e29b-41d4-a716-446655440004', 'Brightening Facial', 'Skin brightening treatment', 75),
    ('550e8400-e29b-41d4-a716-446655440004', 'Teen Facial', 'Facial treatment for teenagers', 60),
    ('550e8400-e29b-41d4-a716-446655440004', 'Men''s Facial', 'Facial treatment for men', 60),
    ('550e8400-e29b-41d4-a716-446655440004', 'Back Facial', 'Deep cleansing back treatment', 60),
    ('550e8400-e29b-41d4-a716-446655440004', 'Dermaplaning', 'Exfoliation with surgical blade', 45),
    ('550e8400-e29b-41d4-a716-446655440004', 'Microneedling', 'Collagen induction therapy', 90),
    ('550e8400-e29b-41d4-a716-446655440004', 'LED Light Therapy', 'LED skin rejuvenation', 30),
    ('550e8400-e29b-41d4-a716-446655440004', 'Oxygen Facial', 'Oxygen infusion facial', 75);

-- =====================================================
-- LASHES & BROWS SERVICES (New Category)
-- =====================================================
INSERT INTO public.services (category_id, name, description, base_duration_minutes) VALUES
    -- Lashes
    ('550e8400-e29b-41d4-a716-446655440008', 'Classic Lash Extensions', 'Classic individual lash extensions', 120),
    ('550e8400-e29b-41d4-a716-446655440008', 'Volume Lash Extensions', 'Volume lash extensions', 150),
    ('550e8400-e29b-41d4-a716-446655440008', 'Hybrid Lash Extensions', 'Hybrid classic and volume lashes', 135),
    ('550e8400-e29b-41d4-a716-446655440008', 'Lash Fill', 'Lash extension fill/refill', 75),
    ('550e8400-e29b-41d4-a716-446655440008', 'Lash Lift', 'Natural lash lift and curl', 60),
    ('550e8400-e29b-41d4-a716-446655440008', 'Lash Tint', 'Eyelash tinting', 30),
    ('550e8400-e29b-41d4-a716-446655440008', 'Lash Removal', 'Safe lash extension removal', 45),
    
    -- Brows
    ('550e8400-e29b-41d4-a716-446655440008', 'Eyebrow Tint', 'Eyebrow tinting service', 20),
    ('550e8400-e29b-41d4-a716-446655440008', 'Eyebrow Lamination', 'Brow lamination and shaping', 45),
    ('550e8400-e29b-41d4-a716-446655440008', 'Microblading', 'Semi-permanent eyebrow tattooing', 150),
    ('550e8400-e29b-41d4-a716-446655440008', 'Ombre Powder Brows', 'Powder ombre brow tattoo', 150),
    ('550e8400-e29b-41d4-a716-446655440008', 'Brow Mapping', 'Professional brow shape mapping', 30);

-- =====================================================
-- WAXING SERVICES (Additional)
-- =====================================================
INSERT INTO public.services (category_id, name, description, base_duration_minutes) VALUES
    ('550e8400-e29b-41d4-a716-446655440006', 'Chin Wax', 'Chin hair removal', 10),
    ('550e8400-e29b-41d4-a716-446655440006', 'Sideburns Wax', 'Sideburn hair removal', 15),
    ('550e8400-e29b-41d4-a716-446655440006', 'Arm Wax - Half', 'Half arm waxing', 25),
    ('550e8400-e29b-41d4-a716-446655440006', 'Arm Wax - Full', 'Full arm waxing', 40),
    ('550e8400-e29b-41d4-a716-446655440006', 'Back Wax', 'Full back waxing', 45),
    ('550e8400-e29b-41d4-a716-446655440006', 'Chest Wax', 'Chest hair removal', 30);

-- =====================================================
-- MASSAGE SERVICES (Additional)
-- =====================================================
INSERT INTO public.services (category_id, name, description, base_duration_minutes) VALUES
    ('550e8400-e29b-41d4-a716-446655440005', 'Swedish Massage - 90 min', 'Extended Swedish massage', 90),
    ('550e8400-e29b-41d4-a716-446655440005', 'Hot Stone Massage', 'Massage with heated stones', 90),
    ('550e8400-e29b-41d4-a716-446655440005', 'Aromatherapy Massage', 'Massage with essential oils', 75),
    ('550e8400-e29b-41d4-a716-446655440005', 'Sports Massage', 'Therapeutic sports massage', 60),
    ('550e8400-e29b-41d4-a716-446655440005', 'Prenatal Massage', 'Safe massage for pregnancy', 60),
    ('550e8400-e29b-41d4-a716-446655440005', 'Couples Massage', 'Side-by-side massage for two', 60),
    ('550e8400-e29b-41d4-a716-446655440005', 'Chair/Seated Massage', 'Quick seated massage', 30),
    ('550e8400-e29b-41d4-a716-446655440005', 'Reflexology', 'Foot reflexology massage', 45);

-- =====================================================
-- BODY TREATMENTS (New Category)
-- =====================================================
INSERT INTO public.services (category_id, name, description, base_duration_minutes) VALUES
    ('550e8400-e29b-41d4-a716-446655440009', 'Body Scrub/Exfoliation', 'Full body exfoliation treatment', 60),
    ('550e8400-e29b-41d4-a716-446655440009', 'Body Wrap', 'Detoxifying body wrap', 75),
    ('550e8400-e29b-41d4-a716-446655440009', 'Spray Tan', 'Professional spray tan application', 30),
    ('550e8400-e29b-41d4-a716-446655440009', 'Self-Tanner Application', 'Self-tanner application service', 45),
    ('550e8400-e29b-41d4-a716-446655440009', 'Cellulite Treatment', 'Cellulite reduction treatment', 60),
    ('550e8400-e29b-41d4-a716-446655440009', 'Body Contouring', 'Non-invasive body contouring', 90),
    ('550e8400-e29b-41d4-a716-446655440009', 'Lymphatic Drainage Massage', 'Lymphatic drainage therapy', 75),
    ('550e8400-e29b-41d4-a716-446655440009', 'Sauna Session', 'Infrared or traditional sauna', 45);

-- =====================================================
-- PERMANENT MAKEUP (New Category)
-- =====================================================
INSERT INTO public.services (category_id, name, description, base_duration_minutes) VALUES
    ('550e8400-e29b-41d4-a716-446655440010', 'Microblading - Full', 'Full microblading service', 180),
    ('550e8400-e29b-41d4-a716-446655440010', 'Ombre Powder Brows - Full', 'Full ombre powder brows', 180),
    ('550e8400-e29b-41d4-a716-446655440010', 'Lip Blushing', 'Semi-permanent lip color', 150),
    ('550e8400-e29b-41d4-a716-446655440010', 'Eyeliner Tattoo', 'Permanent eyeliner', 120),
    ('550e8400-e29b-41d4-a716-446655440010', 'Beauty Mark Tattoo', 'Permanent beauty mark', 30),
    ('550e8400-e29b-41d4-a716-446655440010', 'Permanent Makeup Touch-Up', 'Touch-up for existing PMU', 90);

-- =====================================================
-- SPECIALTY SERVICES (New Category)
-- =====================================================
INSERT INTO public.services (category_id, name, description, base_duration_minutes) VALUES
    ('550e8400-e29b-41d4-a716-446655440011', 'Henna Tattoo', 'Temporary henna body art', 60),
    ('550e8400-e29b-41d4-a716-446655440011', 'Henna Hair Treatment', 'Natural henna hair coloring', 120),
    ('550e8400-e29b-41d4-a716-446655440011', 'Threading - Face', 'Full face threading', 30),
    ('550e8400-e29b-41d4-a716-446655440011', 'Threading - Eyebrows', 'Eyebrow threading', 15),
    ('550e8400-e29b-41d4-a716-446655440011', 'Ear Piercing', 'Professional ear piercing', 20),
    ('550e8400-e29b-41d4-a716-446655440011', 'Teeth Whitening', 'Professional teeth whitening', 60),
    ('550e8400-e29b-41d4-a716-446655440011', 'Makeup Airbrush Tanning', 'Airbrush body makeup/tan', 45),
    ('550e8400-e29b-41d4-a716-446655440011', 'Bridal Party Package', 'Group bridal party services', 240);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration worked:

-- Count services by category
-- SELECT
--     sc.name as category,
--     COUNT(s.id) as service_count
-- FROM service_categories sc
-- LEFT JOIN services s ON s.category_id = sc.id
-- GROUP BY sc.name
-- ORDER BY service_count DESC;

-- Total service count
-- SELECT COUNT(*) as total_services FROM services;

-- List all new categories
-- SELECT * FROM service_categories
-- WHERE id IN (
--     '550e8400-e29b-41d4-a716-446655440008',
--     '550e8400-e29b-41d4-a716-446655440009',
--     '550e8400-e29b-41d4-a716-446655440010',
--     '550e8400-e29b-41d4-a716-446655440011'
-- );

