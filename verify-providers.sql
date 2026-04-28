-- ============================================
-- VERIFY ALL PROVIDERS FOR TESTING
-- ============================================
-- This script will verify all existing providers
-- so they show up in search results
-- ============================================

-- IMPORTANT: Make sure these columns exist first
-- If you get errors about missing columns, run these:
-- ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS identity_verification_status TEXT DEFAULT 'pending';
-- ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ;
-- ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS base_price INTEGER DEFAULT 0;
-- ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS platform_commission_rate DECIMAL(5, 4) DEFAULT 0.20;

-- Step 1: Check current verification status
SELECT 
  pp.id,
  pp.business_name,
  pp.is_verified,
  pp.identity_verification_status,
  pp.identity_verified_at,
  COUNT(ps.id) as service_count
FROM provider_profiles pp
LEFT JOIN provider_services ps ON ps.provider_id = pp.id
GROUP BY pp.id, pp.business_name, pp.is_verified, pp.identity_verification_status, pp.identity_verified_at
ORDER BY pp.business_name;

-- Step 2: Verify ALL providers
UPDATE provider_profiles
SET 
  is_verified = true,
  identity_verification_status = 'approved',
  identity_verified_at = NOW()
WHERE is_verified = false OR identity_verification_status != 'approved';

-- Step 3: Verify the update worked
SELECT 
  pp.id,
  pp.business_name,
  pp.is_verified,
  pp.identity_verification_status,
  pp.identity_verified_at,
  COUNT(ps.id) as service_count
FROM provider_profiles pp
LEFT JOIN provider_services ps ON ps.provider_id = pp.id
GROUP BY pp.id, pp.business_name, pp.is_verified, pp.identity_verification_status, pp.identity_verified_at
ORDER BY pp.business_name;

-- Step 4: Check which services are available for search
SELECT 
  s.name as service_name,
  pp.business_name as provider_name,
  pp.is_verified,
  pp.identity_verification_status,
  ps.base_price,
  ps.is_active
FROM provider_services ps
JOIN services s ON s.id = ps.service_id
JOIN provider_profiles pp ON pp.id = ps.provider_id
WHERE ps.is_active = true
ORDER BY pp.is_verified DESC, pp.rating DESC, s.name;

