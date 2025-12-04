-- Insert service categories
INSERT INTO public.service_categories (id, name, description, icon) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Nails', 'Professional nail care and art services', '💅'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Hair', 'Hair styling, cutting, and coloring services', '💇'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Makeup', 'Professional makeup application services', '💄'),
    ('550e8400-e29b-41d4-a716-446655440004', 'Skincare', 'Facial treatments and skincare services', '✨'),
    ('550e8400-e29b-41d4-a716-446655440005', 'Massage', 'Relaxation and therapeutic massage services', '💆'),
    ('550e8400-e29b-41d4-a716-446655440006', 'Waxing', 'Hair removal and waxing services', '🌟');

-- Insert nail services
INSERT INTO public.services (category_id, name, description, base_duration_minutes) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Basic Manicure', 'Classic manicure with polish', 45),
    ('550e8400-e29b-41d4-a716-446655440001', 'Gel Manicure', 'Long-lasting gel polish manicure', 60),
    ('550e8400-e29b-41d4-a716-446655440001', 'Basic Pedicure', 'Classic pedicure with polish', 60),
    ('550e8400-e29b-41d4-a716-446655440001', 'Gel Pedicure', 'Long-lasting gel polish pedicure', 75),
    ('550e8400-e29b-41d4-a716-446655440001', 'Acrylic Full Set', 'Full set of acrylic nails', 120),
    ('550e8400-e29b-41d4-a716-446655440001', 'Acrylic Fill', 'Acrylic nail fill and maintenance', 90),
    ('550e8400-e29b-41d4-a716-446655440001', 'Nail Art', 'Custom nail art design', 30),
    ('550e8400-e29b-41d4-a716-446655440001', 'Nail Repair', 'Single nail repair service', 15);

-- Insert hair services
INSERT INTO public.services (category_id, name, description, base_duration_minutes) VALUES
    ('550e8400-e29b-41d4-a716-446655440002', 'Women''s Haircut', 'Professional haircut and styling', 60),
    ('550e8400-e29b-41d4-a716-446655440002', 'Men''s Haircut', 'Classic men''s haircut', 45),
    ('550e8400-e29b-41d4-a716-446655440002', 'Blowout', 'Professional blow dry and styling', 45),
    ('550e8400-e29b-41d4-a716-446655440002', 'Hair Color - Full', 'Full hair coloring service', 180),
    ('550e8400-e29b-41d4-a716-446655440002', 'Hair Color - Roots', 'Root touch-up coloring', 90),
    ('550e8400-e29b-41d4-a716-446655440002', 'Highlights', 'Partial or full highlights', 150),
    ('550e8400-e29b-41d4-a716-446655440002', 'Balayage', 'Hand-painted highlights', 180),
    ('550e8400-e29b-41d4-a716-446655440002', 'Hair Treatment', 'Deep conditioning treatment', 45),
    ('550e8400-e29b-41d4-a716-446655440002', 'Updo', 'Special occasion updo styling', 90),
    ('550e8400-e29b-41d4-a716-446655440002', 'Braiding', 'Professional braiding service', 120);

-- Insert makeup services
INSERT INTO public.services (category_id, name, description, base_duration_minutes) VALUES
    ('550e8400-e29b-41d4-a716-446655440003', 'Natural Makeup', 'Everyday natural makeup look', 45),
    ('550e8400-e29b-41d4-a716-446655440003', 'Glam Makeup', 'Full glam makeup application', 60),
    ('550e8400-e29b-41d4-a716-446655440003', 'Bridal Makeup', 'Wedding day makeup with trial', 90),
    ('550e8400-e29b-41d4-a716-446655440003', 'Special Event Makeup', 'Makeup for special occasions', 60),
    ('550e8400-e29b-41d4-a716-446655440003', 'Airbrush Makeup', 'Professional airbrush application', 75),
    ('550e8400-e29b-41d4-a716-446655440003', 'Makeup Lesson', 'Personal makeup tutorial', 90);

-- Insert skincare services
INSERT INTO public.services (category_id, name, description, base_duration_minutes) VALUES
    ('550e8400-e29b-41d4-a716-446655440004', 'Basic Facial', 'Cleansing and moisturizing facial', 60),
    ('550e8400-e29b-41d4-a716-446655440004', 'Deep Cleansing Facial', 'Deep pore cleansing treatment', 75),
    ('550e8400-e29b-41d4-a716-446655440004', 'Anti-Aging Facial', 'Anti-aging treatment facial', 90),
    ('550e8400-e29b-41d4-a716-446655440004', 'Hydrating Facial', 'Intensive hydration treatment', 75),
    ('550e8400-e29b-41d4-a716-446655440004', 'Acne Treatment', 'Acne-focused facial treatment', 75),
    ('550e8400-e29b-41d4-a716-446655440004', 'Chemical Peel', 'Professional chemical peel', 60),
    ('550e8400-e29b-41d4-a716-446655440004', 'Microdermabrasion', 'Skin resurfacing treatment', 60);

-- Insert massage services
INSERT INTO public.services (category_id, name, description, base_duration_minutes) VALUES
    ('550e8400-e29b-41d4-a716-446655440005', 'Swedish Massage - 60min', 'Relaxing full body massage', 60),
    ('550e8400-e29b-41d4-a716-446655440005', 'Swedish Massage - 90min', 'Extended relaxation massage', 90),
    ('550e8400-e29b-41d4-a716-446655440005', 'Deep Tissue Massage', 'Therapeutic deep tissue work', 60),
    ('550e8400-e29b-41d4-a716-446655440005', 'Hot Stone Massage', 'Massage with heated stones', 75),
    ('550e8400-e29b-41d4-a716-446655440005', 'Aromatherapy Massage', 'Massage with essential oils', 60),
    ('550e8400-e29b-41d4-a716-446655440005', 'Prenatal Massage', 'Pregnancy-safe massage', 60);

-- Insert waxing services
INSERT INTO public.services (category_id, name, description, base_duration_minutes) VALUES
    ('550e8400-e29b-41d4-a716-446655440006', 'Eyebrow Wax', 'Eyebrow shaping and waxing', 15),
    ('550e8400-e29b-41d4-a716-446655440006', 'Upper Lip Wax', 'Upper lip hair removal', 10),
    ('550e8400-e29b-41d4-a716-446655440006', 'Full Face Wax', 'Complete facial waxing', 30),
    ('550e8400-e29b-41d4-a716-446655440006', 'Underarm Wax', 'Underarm hair removal', 15),
    ('550e8400-e29b-41d4-a716-446655440006', 'Leg Wax - Half', 'Half leg waxing service', 30),
    ('550e8400-e29b-41d4-a716-446655440006', 'Leg Wax - Full', 'Full leg waxing service', 45),
    ('550e8400-e29b-41d4-a716-446655440006', 'Bikini Wax', 'Bikini area waxing', 30),
    ('550e8400-e29b-41d4-a716-446655440006', 'Brazilian Wax', 'Full Brazilian waxing', 45);

