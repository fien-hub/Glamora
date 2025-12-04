-- Check if provider profile exists (bypasses RLS)
SELECT 
  pp.id,
  pp.business_name,
  pp.is_verified,
  pp.rating,
  p.first_name,
  p.last_name,
  p.user_id
FROM provider_profiles pp
JOIN profiles p ON p.id = pp.id
WHERE pp.id = 'be52ce31-9c84-4a24-b95e-2c046b1e2c9e';

-- Check RLS policies on provider_profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'provider_profiles';

