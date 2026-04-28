-- ============================================
-- TEST SEARCH FUNCTIONALITY
-- ============================================
-- This script helps you verify that search will work
-- ============================================

-- 1. Check if we have any providers
SELECT 
  COUNT(*) as total_providers,
  COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_providers,
  COUNT(CASE WHEN identity_verification_status = 'approved' THEN 1 END) as approved_providers
FROM provider_profiles;

-- 2. Check if providers have services
SELECT 
  pp.business_name,
  pp.is_verified,
  pp.identity_verification_status,
  COUNT(ps.id) as total_services,
  COUNT(CASE WHEN ps.is_active = true THEN 1 END) as active_services
FROM provider_profiles pp
LEFT JOIN provider_services ps ON ps.provider_id = pp.id
GROUP BY pp.id, pp.business_name, pp.is_verified, pp.identity_verification_status
ORDER BY pp.business_name;

-- 3. Check what services are searchable (this is what the app queries)
SELECT 
  s.name as service_name,
  pp.business_name as provider_name,
  pp.is_verified,
  pp.identity_verification_status,
  ps.base_price / 100.0 as base_price_dollars,
  ps.platform_commission_rate,
  (ps.base_price * (1 + ps.platform_commission_rate)) / 100.0 as final_price_dollars,
  ps.is_active
FROM provider_services ps
JOIN services s ON s.id = ps.service_id
JOIN provider_profiles pp ON pp.id = ps.provider_id
WHERE ps.is_active = true
ORDER BY 
  pp.identity_verification_status = 'approved' DESC,
  pp.is_verified DESC,
  pp.rating DESC,
  s.name;

-- 4. Search simulation - Find all "Haircut" services
SELECT 
  s.name as service_name,
  pp.business_name as provider_name,
  pp.is_verified,
  pp.identity_verification_status,
  pp.rating,
  ps.base_price / 100.0 as base_price_dollars,
  (ps.base_price * (1 + ps.platform_commission_rate)) / 100.0 as final_price_dollars
FROM provider_services ps
JOIN services s ON s.id = ps.service_id
JOIN provider_profiles pp ON pp.id = ps.provider_id
WHERE ps.is_active = true
  AND s.name ILIKE '%haircut%'
ORDER BY 
  pp.identity_verification_status = 'approved' DESC,
  pp.rating DESC;

-- 5. Check for data quality issues
SELECT 
  'Missing base_price' as issue,
  COUNT(*) as count
FROM provider_services
WHERE base_price IS NULL OR base_price = 0

UNION ALL

SELECT 
  'Missing platform_commission_rate' as issue,
  COUNT(*) as count
FROM provider_services
WHERE platform_commission_rate IS NULL

UNION ALL

SELECT 
  'Inactive services' as issue,
  COUNT(*) as count
FROM provider_services
WHERE is_active = false

UNION ALL

SELECT 
  'Unverified providers' as issue,
  COUNT(*) as count
FROM provider_profiles
WHERE is_verified = false OR identity_verification_status != 'approved';

-- 6. Sample search query (exactly what the app does)
-- Replace 'Haircut' with any service name you want to search for
WITH search_results AS (
  SELECT 
    ps.id,
    ps.provider_id,
    ps.service_id,
    ps.base_price,
    ps.platform_commission_rate,
    ps.duration_minutes,
    ps.is_active,
    s.id as service_id_inner,
    s.name as service_name,
    s.description as service_description,
    s.base_duration_minutes,
    s.category_id,
    pp.id as provider_id_inner,
    pp.business_name,
    pp.avatar_url,
    pp.rating,
    pp.total_reviews,
    pp.is_verified,
    pp.identity_verification_status
  FROM provider_services ps
  JOIN services s ON s.id = ps.service_id
  JOIN provider_profiles pp ON pp.id = ps.provider_id
  WHERE ps.is_active = true
)
SELECT 
  service_name,
  business_name as provider,
  is_verified,
  identity_verification_status,
  rating,
  total_reviews,
  base_price / 100.0 as base_price_dollars,
  (base_price * (1 + platform_commission_rate)) / 100.0 as final_price_dollars
FROM search_results
WHERE 
  service_name ILIKE '%hair%'  -- Change this to search for different services
  OR business_name ILIKE '%hair%'
ORDER BY 
  identity_verification_status = 'approved' DESC,
  rating DESC;

