-- Set provider as verified so they appear in the feed
UPDATE provider_profiles
SET is_verified = true
WHERE id = 'be52ce31-9c84-4a24-b95e-2c046b1e2c9e';

-- Verify the update
SELECT 
  pp.id,
  pp.business_name,
  pp.is_verified,
  pp.rating,
  p.first_name,
  p.last_name
FROM provider_profiles pp
JOIN profiles p ON p.id = pp.id
WHERE pp.id = 'be52ce31-9c84-4a24-b95e-2c046b1e2c9e';

