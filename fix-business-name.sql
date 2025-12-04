-- Set business name for the provider
UPDATE provider_profiles pp
SET business_name = p.first_name || ' ' || p.last_name
FROM profiles p
WHERE pp.id = p.id
AND pp.id = 'be52ce31-9c84-4a24-b95e-2c046b1e2c9e';

-- Verify
SELECT 
  pp.id,
  pp.business_name,
  pp.is_verified
FROM provider_profiles pp
WHERE pp.id = 'be52ce31-9c84-4a24-b95e-2c046b1e2c9e';

