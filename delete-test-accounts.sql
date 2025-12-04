-- Delete test accounts to free up emails for testing
-- This will cascade delete all related data

-- First, let's see what accounts exist
SELECT 
  u.id,
  u.email,
  u.role,
  p.first_name,
  p.last_name,
  u.created_at
FROM users u
LEFT JOIN profiles p ON p.user_id = u.id
ORDER BY u.created_at DESC;

-- To delete a specific account, uncomment and run this:
-- Replace 'email@example.com' with the email you want to delete
-- DELETE FROM auth.users WHERE email = 'email@example.com';

-- Or to delete ALL test accounts (BE CAREFUL!):
-- DELETE FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%temp%';

-- After deletion, verify:
-- SELECT COUNT(*) as remaining_users FROM users;

