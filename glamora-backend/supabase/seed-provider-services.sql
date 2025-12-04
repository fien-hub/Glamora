-- =====================================================
-- PROVIDER SERVICES SEED DATA
-- =====================================================
-- Adding services for all 10 providers with realistic pricing
-- =====================================================

-- Provider 1: Sophia Hair Studio (924c46e9-db3c-419f-9cdf-8bd0c2ed3869) - Hair Styling
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_active) VALUES
('924c46e9-db3c-419f-9cdf-8bd0c2ed3869', '5c5cf498-fa1e-4a89-8b19-6be8f22bc395', 65.00, 60, true), -- Women's Haircut
('924c46e9-db3c-419f-9cdf-8bd0c2ed3869', '1bcec84a-4855-4af1-ab70-99d844b5fa49', 45.00, 45, true), -- Men's Haircut
('924c46e9-db3c-419f-9cdf-8bd0c2ed3869', 'd778adef-6c30-4ab3-8501-db8ae3503069', 120.00, 120, true), -- Hair Color - Full
('924c46e9-db3c-419f-9cdf-8bd0c2ed3869', 'f1463e15-448f-4777-86d0-0afaed7df0f3', 180.00, 180, true), -- Balayage
('924c46e9-db3c-419f-9cdf-8bd0c2ed3869', 'dec7a77a-4aad-491b-9ef8-f8002f50253c', 50.00, 45, true), -- Blowout
('924c46e9-db3c-419f-9cdf-8bd0c2ed3869', 'fa795c4a-c08e-4a8d-9869-1489ba8770b6', 150.00, 150, true); -- Highlights

-- Provider 2: Emma Artistry (23698bad-477a-48a4-9b14-e1f86c7a2e02) - Makeup
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_active) VALUES
('23698bad-477a-48a4-9b14-e1f86c7a2e02', 'e7ba4afe-3abb-4d0a-bcc0-44cc9fa553fa', 150.00, 90, true), -- Bridal Makeup
('23698bad-477a-48a4-9b14-e1f86c7a2e02', '623381ad-f604-4e60-aa07-177b50947785', 85.00, 60, true), -- Special Event Makeup
('23698bad-477a-48a4-9b14-e1f86c7a2e02', '31d9c9d5-404c-4018-bfd9-78836843db38', 60.00, 45, true), -- Natural Makeup
('23698bad-477a-48a4-9b14-e1f86c7a2e02', 'e32416b6-65e5-47c1-b0f8-d77923f028ec', 95.00, 60, true), -- Airbrush Makeup
('23698bad-477a-48a4-9b14-e1f86c7a2e02', '4a955810-a142-43a6-a733-46a23be146c3', 120.00, 90, true), -- Makeup Lesson
('23698bad-477a-48a4-9b14-e1f86c7a2e02', '6b50411b-dcfe-4574-963c-a6ac6ea6077e', 90.00, 60, true); -- Glam Makeup

-- Provider 3: Olivia Nail Bar (455b5e8e-6912-4221-93e6-eb17eeccd0fc) - Nails
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_active) VALUES
('455b5e8e-6912-4221-93e6-eb17eeccd0fc', '9551b851-ba79-4bb3-a843-bcc51d7d7810', 35.00, 45, true), -- Basic Manicure
('455b5e8e-6912-4221-93e6-eb17eeccd0fc', '243a8e33-12f3-4ff0-8ee5-3badaa357dfb', 45.00, 60, true), -- Basic Pedicure
('455b5e8e-6912-4221-93e6-eb17eeccd0fc', '800ce950-bef0-46a6-844d-5189b2ea6463', 55.00, 60, true), -- Gel Manicure
('455b5e8e-6912-4221-93e6-eb17eeccd0fc', 'f63dadfd-aa75-47aa-a104-0fc3e22a9b4b', 65.00, 75, true), -- Gel Pedicure
('455b5e8e-6912-4221-93e6-eb17eeccd0fc', '28fa02e2-45e5-4223-98dc-fa32a006b835', 70.00, 90, true), -- Acrylic Full Set
('455b5e8e-6912-4221-93e6-eb17eeccd0fc', '9429e429-77aa-4e86-9303-2d5c0b87bbfe', 25.00, 30, true); -- Nail Art

-- Provider 4: Maya Wellness Spa (8641a936-34c4-4158-a1b6-7c7aae390475) - Massage
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_active) VALUES
('8641a936-34c4-4158-a1b6-7c7aae390475', '0d4b6e06-1962-4c5d-851d-30fdfe68938a', 90.00, 60, true), -- Swedish Massage - 60min
('8641a936-34c4-4158-a1b6-7c7aae390475', 'dc0ba274-cb25-4426-bfd4-cd5e295d7990', 130.00, 90, true), -- Swedish Massage - 90min
('8641a936-34c4-4158-a1b6-7c7aae390475', 'bc5b7363-6c18-4f2b-ade9-a8e0a57b60af', 110.00, 75, true), -- Deep Tissue Massage
('8641a936-34c4-4158-a1b6-7c7aae390475', '3ea1b524-026b-481b-8eda-f6f6e8331e5b', 130.00, 90, true), -- Hot Stone Massage
('8641a936-34c4-4158-a1b6-7c7aae390475', '368ce40a-0182-4f8e-845a-aa9797a55ad3', 95.00, 60, true), -- Aromatherapy Massage
('8641a936-34c4-4158-a1b6-7c7aae390475', 'fa98fbd6-7c9b-45ab-b9d8-f96af19ec2c5', 120.00, 75, true); -- Prenatal Massage

-- Provider 5: Ava Skin Studio (0f34fa01-755d-4039-8ac6-d5cd272c150d) - Skincare
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_active) VALUES
('0f34fa01-755d-4039-8ac6-d5cd272c150d', '2c448710-48dd-434d-8026-3d7bbd5ed07d', 85.00, 60, true), -- Basic Facial
('0f34fa01-755d-4039-8ac6-d5cd272c150d', '26700004-592b-48cc-88fd-d0296b6d4c43', 150.00, 75, true), -- Chemical Peel
('0f34fa01-755d-4039-8ac6-d5cd272c150d', '995e975c-f8d3-4a76-9579-7b6d7db1b192', 120.00, 60, true), -- Microdermabrasion
('0f34fa01-755d-4039-8ac6-d5cd272c150d', '2a9d14c2-bd49-45c6-a637-dec7e4a033b1', 180.00, 90, true), -- Anti-Aging Facial
('0f34fa01-755d-4039-8ac6-d5cd272c150d', 'd691d5be-f580-499f-99c4-d24e445a5919', 95.00, 60, true), -- Acne Treatment
('0f34fa01-755d-4039-8ac6-d5cd272c150d', 'd0f18490-541b-4640-81fe-b34a60f8f567', 100.00, 60, true); -- Hydrating Facial

-- Provider 6: Isabella Wax Studio (3a144c25-7046-4870-ac70-79d58683194c) - Waxing
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_active) VALUES
('3a144c25-7046-4870-ac70-79d58683194c', 'bffbaf28-2f20-443f-b6cf-e957589c9ac8', 55.00, 45, true), -- Brazilian Wax
('3a144c25-7046-4870-ac70-79d58683194c', 'ceb1764b-9f6b-4e5f-97fa-d270178cd133', 35.00, 30, true), -- Bikini Wax
('3a144c25-7046-4870-ac70-79d58683194c', '903a36ed-10c3-4b3b-9d44-89ddca744ac1', 50.00, 45, true), -- Leg Wax - Full
('3a144c25-7046-4870-ac70-79d58683194c', '3573e59b-6691-44b5-bf07-d95da7cdb764', 30.00, 30, true), -- Leg Wax - Half
('3a144c25-7046-4870-ac70-79d58683194c', '06c89d42-99a0-41b2-854f-7daf6fafab61', 20.00, 15, true), -- Eyebrow Wax
('3a144c25-7046-4870-ac70-79d58683194c', '0b4cd5de-cee9-420f-aa1b-8b509845c1ea', 25.00, 20, true); -- Underarm Wax

-- Provider 7: Mia Curls & Cuts (3ac0567a-2cb1-40d0-a4f5-228702ddc61b) - Hair Styling
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_active) VALUES
('3ac0567a-2cb1-40d0-a4f5-228702ddc61b', '5c5cf498-fa1e-4a89-8b19-6be8f22bc395', 75.00, 60, true), -- Women's Haircut
('3ac0567a-2cb1-40d0-a4f5-228702ddc61b', 'd778adef-6c30-4ab3-8501-db8ae3503069', 130.00, 120, true), -- Hair Color - Full
('3ac0567a-2cb1-40d0-a4f5-228702ddc61b', '937a7fe5-dfcd-4eea-8b71-8b932ca2cdec', 250.00, 180, true), -- Hair Treatment
('3ac0567a-2cb1-40d0-a4f5-228702ddc61b', 'dec7a77a-4aad-491b-9ef8-f8002f50253c', 55.00, 45, true), -- Blowout
('3ac0567a-2cb1-40d0-a4f5-228702ddc61b', '48475130-6364-49d4-8aa7-da5295918836', 80.00, 90, true); -- Braiding

-- Provider 8: Charlotte Glam (ec282f68-67bf-446e-8655-77dd50037665) - Makeup
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_active) VALUES
('ec282f68-67bf-446e-8655-77dd50037665', 'e7ba4afe-3abb-4d0a-bcc0-44cc9fa553fa', 140.00, 90, true), -- Bridal Makeup
('ec282f68-67bf-446e-8655-77dd50037665', '623381ad-f604-4e60-aa07-177b50947785', 80.00, 60, true), -- Special Event Makeup
('ec282f68-67bf-446e-8655-77dd50037665', 'e32416b6-65e5-47c1-b0f8-d77923f028ec', 100.00, 60, true), -- Airbrush Makeup
('ec282f68-67bf-446e-8655-77dd50037665', '31d9c9d5-404c-4018-bfd9-78836843db38', 65.00, 45, true); -- Natural Makeup

-- Provider 9: Amelia Luxury Nails (592d6dc2-17d0-47e7-b56a-7a02a71546c6) - Nails
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_active) VALUES
('592d6dc2-17d0-47e7-b56a-7a02a71546c6', '9551b851-ba79-4bb3-a843-bcc51d7d7810', 40.00, 45, true), -- Basic Manicure
('592d6dc2-17d0-47e7-b56a-7a02a71546c6', '243a8e33-12f3-4ff0-8ee5-3badaa357dfb', 50.00, 60, true), -- Basic Pedicure
('592d6dc2-17d0-47e7-b56a-7a02a71546c6', '800ce950-bef0-46a6-844d-5189b2ea6463', 60.00, 60, true), -- Gel Manicure
('592d6dc2-17d0-47e7-b56a-7a02a71546c6', 'f63dadfd-aa75-47aa-a104-0fc3e22a9b4b', 70.00, 75, true), -- Gel Pedicure
('592d6dc2-17d0-47e7-b56a-7a02a71546c6', '28fa02e2-45e5-4223-98dc-fa32a006b835', 75.00, 90, true), -- Acrylic Full Set
('592d6dc2-17d0-47e7-b56a-7a02a71546c6', '9429e429-77aa-4e86-9303-2d5c0b87bbfe', 35.00, 45, true); -- Nail Art

-- Provider 10: Harper Beauty Collective (4ac7d3ba-01ee-4a6d-b24c-66378d67c0e2) - Multi-Service
INSERT INTO provider_services (provider_id, service_id, price, duration_minutes, is_active) VALUES
('4ac7d3ba-01ee-4a6d-b24c-66378d67c0e2', '5c5cf498-fa1e-4a89-8b19-6be8f22bc395', 70.00, 60, true), -- Women's Haircut
('4ac7d3ba-01ee-4a6d-b24c-66378d67c0e2', 'cfb71093-cef1-4437-83f0-3b5cda7408c4', 65.00, 45, true), -- Updo
('4ac7d3ba-01ee-4a6d-b24c-66378d67c0e2', 'e7ba4afe-3abb-4d0a-bcc0-44cc9fa553fa', 145.00, 90, true), -- Bridal Makeup
('4ac7d3ba-01ee-4a6d-b24c-66378d67c0e2', '623381ad-f604-4e60-aa07-177b50947785', 90.00, 60, true), -- Special Event Makeup
('4ac7d3ba-01ee-4a6d-b24c-66378d67c0e2', '2c448710-48dd-434d-8026-3d7bbd5ed07d', 90.00, 60, true), -- Basic Facial
('4ac7d3ba-01ee-4a6d-b24c-66378d67c0e2', '2a9d14c2-bd49-45c6-a637-dec7e4a033b1', 175.00, 90, true); -- Anti-Aging Facial

-- =====================================================
-- PROVIDER AVAILABILITY SCHEDULES
-- =====================================================
-- Setting up weekly availability for all providers
-- Day of week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday

-- Provider 1: Sophia (Mon-Sat, 9 AM - 6 PM)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available) VALUES
('924c46e9-db3c-419f-9cdf-8bd0c2ed3869', 1, '09:00:00', '18:00:00', true),
('924c46e9-db3c-419f-9cdf-8bd0c2ed3869', 2, '09:00:00', '18:00:00', true),
('924c46e9-db3c-419f-9cdf-8bd0c2ed3869', 3, '09:00:00', '18:00:00', true),
('924c46e9-db3c-419f-9cdf-8bd0c2ed3869', 4, '09:00:00', '18:00:00', true),
('924c46e9-db3c-419f-9cdf-8bd0c2ed3869', 5, '09:00:00', '18:00:00', true),
('924c46e9-db3c-419f-9cdf-8bd0c2ed3869', 6, '09:00:00', '18:00:00', true);

-- Provider 2: Emma (Mon-Sat, 10 AM - 7 PM)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available) VALUES
('23698bad-477a-48a4-9b14-e1f86c7a2e02', 1, '10:00:00', '19:00:00', true),
('23698bad-477a-48a4-9b14-e1f86c7a2e02', 2, '10:00:00', '19:00:00', true),
('23698bad-477a-48a4-9b14-e1f86c7a2e02', 3, '10:00:00', '19:00:00', true),
('23698bad-477a-48a4-9b14-e1f86c7a2e02', 4, '10:00:00', '19:00:00', true),
('23698bad-477a-48a4-9b14-e1f86c7a2e02', 5, '10:00:00', '19:00:00', true),
('23698bad-477a-48a4-9b14-e1f86c7a2e02', 6, '10:00:00', '19:00:00', true);

-- Provider 3: Olivia (Mon-Sat, 9 AM - 6 PM)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available) VALUES
('455b5e8e-6912-4221-93e6-eb17eeccd0fc', 1, '09:00:00', '18:00:00', true),
('455b5e8e-6912-4221-93e6-eb17eeccd0fc', 2, '09:00:00', '18:00:00', true),
('455b5e8e-6912-4221-93e6-eb17eeccd0fc', 3, '09:00:00', '18:00:00', true),
('455b5e8e-6912-4221-93e6-eb17eeccd0fc', 4, '09:00:00', '18:00:00', true),
('455b5e8e-6912-4221-93e6-eb17eeccd0fc', 5, '09:00:00', '18:00:00', true),
('455b5e8e-6912-4221-93e6-eb17eeccd0fc', 6, '09:00:00', '18:00:00', true);

-- Provider 4: Maya (Sun-Sat, 8 AM - 8 PM)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available) VALUES
('8641a936-34c4-4158-a1b6-7c7aae390475', 0, '08:00:00', '20:00:00', true),
('8641a936-34c4-4158-a1b6-7c7aae390475', 1, '08:00:00', '20:00:00', true),
('8641a936-34c4-4158-a1b6-7c7aae390475', 2, '08:00:00', '20:00:00', true),
('8641a936-34c4-4158-a1b6-7c7aae390475', 3, '08:00:00', '20:00:00', true),
('8641a936-34c4-4158-a1b6-7c7aae390475', 4, '08:00:00', '20:00:00', true),
('8641a936-34c4-4158-a1b6-7c7aae390475', 5, '08:00:00', '20:00:00', true),
('8641a936-34c4-4158-a1b6-7c7aae390475', 6, '08:00:00', '20:00:00', true);

-- Provider 5: Ava (Mon-Fri, 9 AM - 5 PM)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available) VALUES
('0f34fa01-755d-4039-8ac6-d5cd272c150d', 1, '09:00:00', '17:00:00', true),
('0f34fa01-755d-4039-8ac6-d5cd272c150d', 2, '09:00:00', '17:00:00', true),
('0f34fa01-755d-4039-8ac6-d5cd272c150d', 3, '09:00:00', '17:00:00', true),
('0f34fa01-755d-4039-8ac6-d5cd272c150d', 4, '09:00:00', '17:00:00', true),
('0f34fa01-755d-4039-8ac6-d5cd272c150d', 5, '09:00:00', '17:00:00', true);

-- Provider 6: Isabella (Mon-Sat, 10 AM - 7 PM)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available) VALUES
('3a144c25-7046-4870-ac70-79d58683194c', 1, '10:00:00', '19:00:00', true),
('3a144c25-7046-4870-ac70-79d58683194c', 2, '10:00:00', '19:00:00', true),
('3a144c25-7046-4870-ac70-79d58683194c', 3, '10:00:00', '19:00:00', true),
('3a144c25-7046-4870-ac70-79d58683194c', 4, '10:00:00', '19:00:00', true),
('3a144c25-7046-4870-ac70-79d58683194c', 5, '10:00:00', '19:00:00', true),
('3a144c25-7046-4870-ac70-79d58683194c', 6, '10:00:00', '19:00:00', true);

-- Provider 7: Mia (Mon-Sat, 9 AM - 6 PM)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_active) VALUES
('3ac0567a-2cb1-40d0-a4f5-228702ddc61b', 1, '09:00:00', '18:00:00', true),
('3ac0567a-2cb1-40d0-a4f5-228702ddc61b', 2, '09:00:00', '18:00:00', true),
('3ac0567a-2cb1-40d0-a4f5-228702ddc61b', 3, '09:00:00', '18:00:00', true),
('3ac0567a-2cb1-40d0-a4f5-228702ddc61b', 4, '09:00:00', '18:00:00', true),
('3ac0567a-2cb1-40d0-a4f5-228702ddc61b', 5, '09:00:00', '18:00:00', true),
('3ac0567a-2cb1-40d0-a4f5-228702ddc61b', 6, '09:00:00', '18:00:00', true);

-- Provider 8: Charlotte (Mon-Sat, 10 AM - 7 PM)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available) VALUES
('ec282f68-67bf-446e-8655-77dd50037665', 1, '10:00:00', '19:00:00', true),
('ec282f68-67bf-446e-8655-77dd50037665', 2, '10:00:00', '19:00:00', true),
('ec282f68-67bf-446e-8655-77dd50037665', 3, '10:00:00', '19:00:00', true),
('ec282f68-67bf-446e-8655-77dd50037665', 4, '10:00:00', '19:00:00', true),
('ec282f68-67bf-446e-8655-77dd50037665', 5, '10:00:00', '19:00:00', true),
('ec282f68-67bf-446e-8655-77dd50037665', 6, '10:00:00', '19:00:00', true);

-- Provider 9: Amelia (Mon-Sat, 9 AM - 6 PM)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available) VALUES
('592d6dc2-17d0-47e7-b56a-7a02a71546c6', 1, '09:00:00', '18:00:00', true),
('592d6dc2-17d0-47e7-b56a-7a02a71546c6', 2, '09:00:00', '18:00:00', true),
('592d6dc2-17d0-47e7-b56a-7a02a71546c6', 3, '09:00:00', '18:00:00', true),
('592d6dc2-17d0-47e7-b56a-7a02a71546c6', 4, '09:00:00', '18:00:00', true),
('592d6dc2-17d0-47e7-b56a-7a02a71546c6', 5, '09:00:00', '18:00:00', true),
('592d6dc2-17d0-47e7-b56a-7a02a71546c6', 6, '09:00:00', '18:00:00', true);

-- Provider 10: Harper (Mon-Sat, 8 AM - 7 PM)
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available) VALUES
('4ac7d3ba-01ee-4a6d-b24c-66378d67c0e2', 1, '08:00:00', '19:00:00', true),
('4ac7d3ba-01ee-4a6d-b24c-66378d67c0e2', 2, '08:00:00', '19:00:00', true),
('4ac7d3ba-01ee-4a6d-b24c-66378d67c0e2', 3, '08:00:00', '19:00:00', true),
('4ac7d3ba-01ee-4a6d-b24c-66378d67c0e2', 4, '08:00:00', '19:00:00', true),
('4ac7d3ba-01ee-4a6d-b24c-66378d67c0e2', 5, '08:00:00', '19:00:00', true),
('4ac7d3ba-01ee-4a6d-b24c-66378d67c0e2', 6, '08:00:00', '19:00:00', true);

