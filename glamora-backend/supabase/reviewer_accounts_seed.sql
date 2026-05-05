-- Seed reviewer accounts for Google Play / QA access.
--
-- Prerequisite:
-- 1. Create these auth users first in Supabase Auth with auto-confirm enabled:
--    - customer@test.com / TestPassword123!
--    - provider@test.com / TestPassword123!
-- 2. Ensure at least one service exists in public.services.
-- 3. Run this script in the SQL editor for the production project used by the release build.

BEGIN;

DO $$
DECLARE
  v_customer_user_id uuid;
  v_provider_user_id uuid;
  v_service_id uuid;
BEGIN
  SELECT id INTO v_customer_user_id
  FROM auth.users
  WHERE email = 'customer@test.com'
  LIMIT 1;

  SELECT id INTO v_provider_user_id
  FROM auth.users
  WHERE email = 'provider@test.com'
  LIMIT 1;

  IF v_customer_user_id IS NULL THEN
    RAISE EXCEPTION 'Missing auth user: customer@test.com';
  END IF;

  IF v_provider_user_id IS NULL THEN
    RAISE EXCEPTION 'Missing auth user: provider@test.com';
  END IF;

  SELECT id INTO v_service_id
  FROM public.services
  ORDER BY created_at, name
  LIMIT 1;

  IF v_service_id IS NULL THEN
    RAISE EXCEPTION 'No services found in public.services. Seed services before running reviewer seed.';
  END IF;
END $$;

-- users
INSERT INTO public.users (id, email, role)
SELECT u.id, 'customer@test.com', 'customer'::user_role
FROM auth.users u
WHERE u.email = 'customer@test.com'
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    role = EXCLUDED.role;

INSERT INTO public.users (id, email, role)
SELECT u.id, 'provider@test.com', 'provider'::user_role
FROM auth.users u
WHERE u.email = 'provider@test.com'
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    role = EXCLUDED.role;

-- base profiles
INSERT INTO public.profiles (id, user_id, first_name, last_name, phone, avatar_url, bio, email_verified, email_verified_at, phone_verified)
SELECT
  COALESCE(existing.id, uuid_generate_v4()),
  u.id,
  'Play',
  'Customer',
  '+15550000001',
  NULL,
  'Google Play customer reviewer account.',
  true,
  now(),
  false
FROM auth.users u
LEFT JOIN public.profiles existing ON existing.user_id = u.id
WHERE u.email = 'customer@test.com'
ON CONFLICT (user_id) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    avatar_url = EXCLUDED.avatar_url,
    bio = EXCLUDED.bio,
    email_verified = EXCLUDED.email_verified,
    email_verified_at = EXCLUDED.email_verified_at,
    phone_verified = EXCLUDED.phone_verified;

INSERT INTO public.profiles (id, user_id, first_name, last_name, phone, avatar_url, bio, email_verified, email_verified_at, phone_verified)
SELECT
  COALESCE(existing.id, uuid_generate_v4()),
  u.id,
  'Play',
  'Provider',
  '+15550000002',
  NULL,
  'Google Play provider reviewer account with onboarding completed.',
  true,
  now(),
  false
FROM auth.users u
LEFT JOIN public.profiles existing ON existing.user_id = u.id
WHERE u.email = 'provider@test.com'
ON CONFLICT (user_id) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    avatar_url = EXCLUDED.avatar_url,
    bio = EXCLUDED.bio,
    email_verified = EXCLUDED.email_verified,
    email_verified_at = EXCLUDED.email_verified_at,
    phone_verified = EXCLUDED.phone_verified;

-- customer profile
INSERT INTO public.customer_profiles (
  id,
  address,
  city,
  state,
  zip_code,
  latitude,
  longitude,
  verification_status,
  payment_method_verified,
  onboarding_completed
)
SELECT
  customer_profile_id,
  '123 Reviewer Lane',
  'Los Angeles',
  'CA',
  '90001',
  34.052235,
  -118.243683,
  'email_verified',
  false,
  true
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'customer@test.com'
ON CONFLICT (id) DO UPDATE
SET address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    zip_code = EXCLUDED.zip_code,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    verification_status = EXCLUDED.verification_status,
    payment_method_verified = EXCLUDED.payment_method_verified,
    onboarding_completed = EXCLUDED.onboarding_completed;

-- provider profile: fully onboarded, visible in search, no payout or 2FA dependency
INSERT INTO public.provider_profiles (
  id,
  business_name,
  years_experience,
  certifications,
  service_radius_km,
  is_verified,
  verification_date,
  rating,
  total_reviews,
  total_bookings,
  onboarding_completed,
  address,
  city,
  state,
  zip_code,
  latitude,
  longitude,
  identity_verification_status,
  identity_verified_at,
  identity_verification_notes
)
SELECT
  provider_profile_id,
  'Play Review Studio',
  5,
  ARRAY['Licensed Esthetician', 'Sanitation Certified'],
  25,
  true,
  now(),
  4.80,
  12,
  8,
  true,
  '456 Provider Ave',
  'Los Angeles',
  'CA',
  '90002',
  34.046905,
  -118.250640,
  'approved',
  now(),
  'Reviewer account pre-approved for app review.'
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'provider@test.com'
ON CONFLICT (id) DO UPDATE
SET business_name = EXCLUDED.business_name,
    years_experience = EXCLUDED.years_experience,
    certifications = EXCLUDED.certifications,
    service_radius_km = EXCLUDED.service_radius_km,
    is_verified = EXCLUDED.is_verified,
    verification_date = EXCLUDED.verification_date,
    rating = EXCLUDED.rating,
    total_reviews = EXCLUDED.total_reviews,
    total_bookings = EXCLUDED.total_bookings,
    onboarding_completed = EXCLUDED.onboarding_completed,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    zip_code = EXCLUDED.zip_code,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    identity_verification_status = EXCLUDED.identity_verification_status,
    identity_verified_at = EXCLUDED.identity_verified_at,
    identity_verification_notes = EXCLUDED.identity_verification_notes;

-- provider verification checklist so no verification prompts block review
INSERT INTO public.provider_verification_checklist (
  provider_id,
  govt_id_uploaded,
  selfie_uploaded,
  selfie_matched,
  phone_verified,
  email_verified,
  profile_photo_uploaded,
  portfolio_uploaded,
  services_added,
  business_name_added,
  certifications_uploaded,
  professional_license_uploaded,
  social_media_linked
)
SELECT
  provider_profile_id,
  true,
  false,
  false,
  false,
  true,
  true,
  true,
  true,
  true,
  true,
  false,
  false
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'provider@test.com'
ON CONFLICT (provider_id) DO UPDATE
SET govt_id_uploaded = EXCLUDED.govt_id_uploaded,
    selfie_uploaded = EXCLUDED.selfie_uploaded,
    selfie_matched = EXCLUDED.selfie_matched,
    phone_verified = EXCLUDED.phone_verified,
    email_verified = EXCLUDED.email_verified,
    profile_photo_uploaded = EXCLUDED.profile_photo_uploaded,
    portfolio_uploaded = EXCLUDED.portfolio_uploaded,
    services_added = EXCLUDED.services_added,
    business_name_added = EXCLUDED.business_name_added,
    certifications_uploaded = EXCLUDED.certifications_uploaded,
    professional_license_uploaded = EXCLUDED.professional_license_uploaded,
    social_media_linked = EXCLUDED.social_media_linked;

-- provider needs at least one service to appear bookable
INSERT INTO public.provider_services (
  provider_id,
  service_id,
  base_price,
  duration_minutes,
  is_active,
  platform_commission_rate,
  accepts_over_25km
)
SELECT
  rp.provider_profile_id,
  ss.id,
  8500,
  60,
  true,
  0.20,
  true
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
JOIN LATERAL (
  SELECT id
  FROM public.services
  ORDER BY created_at, name
  LIMIT 1
) ss ON true
WHERE u.email = 'provider@test.com'
ON CONFLICT (provider_id, service_id) DO UPDATE
SET base_price = EXCLUDED.base_price,
    duration_minutes = EXCLUDED.duration_minutes,
    is_active = EXCLUDED.is_active,
    platform_commission_rate = EXCLUDED.platform_commission_rate,
    accepts_over_25km = EXCLUDED.accepts_over_25km;

-- provider availability for booking screens
INSERT INTO public.provider_availability (
  provider_id,
  day_of_week,
  start_time,
  end_time,
  is_available
)
SELECT p.id, 1, '09:00', '17:00', true
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'provider@test.com'
UNION ALL
SELECT p.id, 2, '09:00', '17:00', true
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'provider@test.com'
UNION ALL
SELECT p.id, 3, '09:00', '17:00', true
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'provider@test.com'
UNION ALL
SELECT p.id, 4, '09:00', '17:00', true
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'provider@test.com'
UNION ALL
SELECT p.id, 5, '09:00', '17:00', true
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'provider@test.com'
ON CONFLICT DO NOTHING;

-- lightweight portfolio item helps provider detail/profile screens feel complete
INSERT INTO public.portfolio_items (
  provider_id,
  title,
  description,
  image_url,
  likes_count,
  comments_count,
  is_featured
)
SELECT
  p.id,
  'Reviewer Portfolio Example',
  'Sample portfolio item for app review.',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1080&q=80',
  3,
  0,
  true
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'provider@test.com'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.portfolio_items pi
  WHERE pi.provider_id = p.id
    AND pi.title = 'Reviewer Portfolio Example'
);

COMMIT;