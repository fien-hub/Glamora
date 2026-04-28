-- SQL migration for account deletion functionality
-- This should be run in Supabase SQL Editor or via migrations

-- Function to delete all user data and account
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_id_var UUID;
BEGIN
  -- Get the profile ID
  SELECT id INTO profile_id_var
  FROM profiles
  WHERE user_id = user_id_to_delete;

  IF profile_id_var IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user %', user_id_to_delete;
  END IF;

  -- Delete in order to respect foreign key constraints
  
  -- 1. Delete customer-related data
  DELETE FROM customer_favorites WHERE customer_id = profile_id_var;
  DELETE FROM loyalty_points WHERE customer_id = profile_id_var;
  DELETE FROM customer_profiles WHERE id = profile_id_var;
  
  -- 2. Delete provider-related data
  DELETE FROM provider_services WHERE provider_id = profile_id_var;
  DELETE FROM provider_availability WHERE provider_id = profile_id_var;
  DELETE FROM provider_portfolio WHERE provider_id = profile_id_var;
  DELETE FROM provider_profiles WHERE id = profile_id_var;
  
  -- 3. Delete reviews (both given and received)
  DELETE FROM reviews WHERE customer_id = profile_id_var OR provider_id = profile_id_var;
  
  -- 4. Delete messages
  DELETE FROM messages WHERE sender_id = user_id_to_delete OR recipient_id = user_id_to_delete;
  DELETE FROM conversations WHERE customer_id = profile_id_var OR provider_id = profile_id_var;
  
  -- 5. Delete bookings (soft delete - mark as cancelled)
  UPDATE bookings 
  SET status = 'cancelled', 
      cancellation_reason = 'Account deleted',
      updated_at = NOW()
  WHERE customer_id = profile_id_var OR provider_id = profile_id_var;
  
  -- 6. Delete payments (keep for audit trail but anonymize)
  UPDATE payments
  SET metadata = jsonb_set(metadata, '{user_deleted}', 'true')
  WHERE booking_id IN (
    SELECT id FROM bookings 
    WHERE customer_id = profile_id_var OR provider_id = profile_id_var
  );
  
  -- 7. Delete notifications
  DELETE FROM notifications WHERE user_id = user_id_to_delete;
  
  -- 8. Delete user profile
  DELETE FROM profiles WHERE user_id = user_id_to_delete;
  
  -- Note: The auth user deletion should be done separately via delete_auth_user function
  -- or by calling supabase.auth.admin.deleteUser() from the application
  
END;
$$;

-- Function to delete auth user (admin function)
-- Note: This requires service role key and should be called from backend/admin context
CREATE OR REPLACE FUNCTION delete_auth_user(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This is a placeholder - actual auth user deletion must be done via Supabase Admin API
  -- The app should call supabase.auth.admin.deleteUser(user_id) with service role
  -- We can't delete auth.users directly from SQL for security reasons
  
  -- Instead, we'll mark the user as deleted in our profiles table
  -- (This is already done in delete_user_account function above)
  
  RAISE NOTICE 'Auth user % should be deleted via Supabase Admin API', user_id_to_delete;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION delete_user_account TO authenticated;
GRANT EXECUTE ON FUNCTION delete_auth_user TO authenticated;

-- Add comments
COMMENT ON FUNCTION delete_user_account IS 'Deletes all user data from the database';
COMMENT ON FUNCTION delete_auth_user IS 'Placeholder for auth user deletion - must be done via Admin API';
