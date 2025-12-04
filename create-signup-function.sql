-- Create a secure function to handle user profile creation during signup
-- This function uses SECURITY DEFINER to bypass RLS policies

CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_role TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_result JSON;
BEGIN
  -- Create user record
  INSERT INTO users (id, email, role)
  VALUES (p_user_id, p_email, p_role)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role;

  -- Create profile record
  INSERT INTO profiles (user_id, first_name, last_name, phone)
  VALUES (p_user_id, p_first_name, p_last_name, p_phone)
  RETURNING id INTO v_profile_id;

  -- Create role-specific profile
  IF p_role = 'customer' THEN
    INSERT INTO customer_profiles (id, onboarding_completed)
    VALUES (v_profile_id, FALSE);
  ELSIF p_role = 'provider' THEN
    INSERT INTO provider_profiles (id, onboarding_completed, is_verified)
    VALUES (v_profile_id, FALSE, FALSE);
  END IF;

  -- Return success with profile id
  v_result := json_build_object(
    'success', TRUE,
    'profile_id', v_profile_id,
    'message', 'Profile created successfully'
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Return error
  v_result := json_build_object(
    'success', FALSE,
    'error', SQLERRM,
    'message', 'Failed to create profile'
  );
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated, anon;

-- Test the function
SELECT create_user_profile(
  '00000000-0000-0000-0000-000000000000'::UUID,
  'test@example.com',
  'customer',
  'Test',
  'User',
  NULL
);

