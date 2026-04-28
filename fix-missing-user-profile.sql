-- Fix missing profile for user 8d1ad079-9b5a-4bbe-a0c4-9cdc2dd97d68
-- This user exists in auth.users but not in our application tables

DO $$
DECLARE
  v_user_id UUID := '8d1ad079-9b5a-4bbe-a0c4-9cdc2dd97d68';
  v_email TEXT;
  v_role TEXT := 'customer'; -- Change to 'provider' if this was a provider signup
  v_profile_id UUID;
BEGIN
  -- Get email from auth.users
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User not found in auth.users';
  END IF;

  -- Create user record
  INSERT INTO users (id, email, role)
  VALUES (v_user_id, v_email, v_role)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role;

  -- Create profile record
  INSERT INTO profiles (user_id, first_name, last_name)
  VALUES (v_user_id, 'User', 'User')
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO v_profile_id;

  -- Get profile id if it already existed
  IF v_profile_id IS NULL THEN
    SELECT id INTO v_profile_id FROM profiles WHERE user_id = v_user_id;
  END IF;

  -- Create role-specific profile
  IF v_role = 'customer' THEN
    INSERT INTO customer_profiles (id, onboarding_completed)
    VALUES (v_profile_id, FALSE)
    ON CONFLICT (id) DO NOTHING;
  ELSIF v_role = 'provider' THEN
    INSERT INTO provider_profiles (id, onboarding_completed, is_verified)
    VALUES (v_profile_id, FALSE, FALSE)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RAISE NOTICE 'Profile created successfully for user % with role %', v_user_id, v_role;
END $$;

-- Verify the fix
SELECT 'users' as table_name, * FROM users WHERE id = '8d1ad079-9b5a-4bbe-a0c4-9cdc2dd97d68'
UNION ALL
SELECT 'profiles' as table_name, * FROM profiles WHERE user_id = '8d1ad079-9b5a-4bbe-a0c4-9cdc2dd97d68';
