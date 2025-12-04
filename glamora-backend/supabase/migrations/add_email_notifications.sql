-- Migration: Add Email Notifications to Custom Service Approval System
-- This migration updates the approve/reject functions to trigger email notifications

-- Drop existing functions
DROP FUNCTION IF EXISTS approve_custom_service(UUID);
DROP FUNCTION IF EXISTS reject_custom_service(UUID, TEXT);

-- Create updated approve_custom_service function with email notification
CREATE OR REPLACE FUNCTION approve_custom_service(service_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider_id UUID;
  v_service_name TEXT;
BEGIN
  -- Get provider_id and service name
  SELECT provider_id, custom_service_name 
  INTO v_provider_id, v_service_name
  FROM provider_services
  WHERE id = service_id;

  -- Update service status
  UPDATE provider_services
  SET 
    custom_service_status = 'approved',
    reviewed_at = NOW(),
    reviewed_by = auth.uid()
  WHERE id = service_id;

  -- Create in-app notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_provider_id,
    'custom_service_approved',
    'Custom Service Approved! 🎉',
    'Your custom service "' || v_service_name || '" has been approved and is now visible to customers.',
    jsonb_build_object('service_id', service_id, 'service_name', v_service_name)
  );

  -- Track analytics event
  INSERT INTO custom_service_analytics (provider_id, service_id, custom_service_name, event_type, event_data)
  VALUES (
    v_provider_id,
    service_id,
    v_service_name,
    'approved',
    jsonb_build_object('approved_at', NOW(), 'approved_by', auth.uid())
  );

  -- Trigger email notification via Edge Function
  -- This uses pg_net extension to make HTTP request to Edge Function
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-custom-service-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'serviceId', service_id,
        'type', 'approved'
      )
    );
END;
$$;

-- Create updated reject_custom_service function with email notification
CREATE OR REPLACE FUNCTION reject_custom_service(service_id UUID, rejection_reason TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider_id UUID;
  v_service_name TEXT;
BEGIN
  -- Get provider_id and service name
  SELECT provider_id, custom_service_name 
  INTO v_provider_id, v_service_name
  FROM provider_services
  WHERE id = service_id;

  -- Update service status
  UPDATE provider_services
  SET 
    custom_service_status = 'rejected',
    rejection_reason = rejection_reason,
    reviewed_at = NOW(),
    reviewed_by = auth.uid()
  WHERE id = service_id;

  -- Create in-app notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_provider_id,
    'custom_service_rejected',
    'Custom Service Update',
    'Your custom service "' || v_service_name || '" was not approved. Reason: ' || rejection_reason,
    jsonb_build_object('service_id', service_id, 'service_name', v_service_name, 'reason', rejection_reason)
  );

  -- Track analytics event
  INSERT INTO custom_service_analytics (provider_id, service_id, custom_service_name, event_type, event_data)
  VALUES (
    v_provider_id,
    service_id,
    v_service_name,
    'rejected',
    jsonb_build_object('rejected_at', NOW(), 'rejected_by', auth.uid(), 'reason', rejection_reason)
  );

  -- Trigger email notification via Edge Function
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-custom-service-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'serviceId', service_id,
        'type', 'rejected',
        'rejectionReason', rejection_reason
      )
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION approve_custom_service(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_custom_service(UUID, TEXT) TO authenticated;

-- Note: This migration requires the pg_net extension to be enabled
-- Enable it with: CREATE EXTENSION IF NOT EXISTS pg_net;
-- Also requires setting these Supabase secrets:
-- - app.supabase_url
-- - app.supabase_service_role_key
-- - RESEND_API_KEY (for the Edge Function)

COMMENT ON FUNCTION approve_custom_service IS 'Approves a custom service and sends in-app + email notifications';
COMMENT ON FUNCTION reject_custom_service IS 'Rejects a custom service with reason and sends in-app + email notifications';

