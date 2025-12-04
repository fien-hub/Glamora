-- =====================================================
-- ADD CUSTOM SERVICE APPROVAL SYSTEM
-- =====================================================
-- This adds an approval workflow for custom services to ensure
-- only beauty-related services are added to the platform
-- =====================================================

-- Add approval status enum type
DO $$ BEGIN
    CREATE TYPE custom_service_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add approval fields to provider_services table
ALTER TABLE public.provider_services 
ADD COLUMN IF NOT EXISTS custom_service_status custom_service_status DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS custom_service_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS custom_service_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS custom_service_reviewed_by UUID REFERENCES auth.users(id);

-- Set default status to 'pending' for custom services (where custom_service_name is not null)
-- and 'approved' for predefined services
UPDATE public.provider_services
SET custom_service_status = CASE 
    WHEN custom_service_name IS NOT NULL THEN 'pending'::custom_service_status
    ELSE 'approved'::custom_service_status
END
WHERE custom_service_status IS NULL;

-- Add comments to explain the columns
COMMENT ON COLUMN public.provider_services.custom_service_status IS 
'Approval status for custom services: pending (awaiting review), approved (can be booked), rejected (not allowed)';

COMMENT ON COLUMN public.provider_services.custom_service_rejection_reason IS 
'Reason why a custom service was rejected (e.g., "Not a beauty service")';

COMMENT ON COLUMN public.provider_services.custom_service_reviewed_at IS 
'Timestamp when the custom service was reviewed by an admin';

COMMENT ON COLUMN public.provider_services.custom_service_reviewed_by IS 
'Admin user ID who reviewed the custom service';

-- Create index for filtering pending custom services (for admin review)
CREATE INDEX IF NOT EXISTS idx_provider_services_custom_pending 
ON public.provider_services(custom_service_status, created_at) 
WHERE custom_service_name IS NOT NULL;

-- Create a view for admins to review pending custom services
CREATE OR REPLACE VIEW public.pending_custom_services AS
SELECT 
    ps.id,
    ps.provider_id,
    ps.custom_service_name,
    ps.description,
    ps.base_price,
    ps.duration_minutes,
    ps.custom_service_status,
    ps.created_at,
    p.full_name as provider_name,
    p.email as provider_email,
    pp.business_name
FROM public.provider_services ps
JOIN public.profiles p ON ps.provider_id = p.id
JOIN public.provider_profiles pp ON ps.provider_id = pp.id
WHERE ps.custom_service_name IS NOT NULL 
  AND ps.custom_service_status = 'pending'
ORDER BY ps.created_at ASC;

-- Add RLS policy to allow admins to view pending custom services
-- (Assuming you have an admin role or will add one)
-- This is a placeholder - adjust based on your auth setup
CREATE POLICY "Admins can view all custom services" 
ON public.provider_services 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Function to approve a custom service
CREATE OR REPLACE FUNCTION approve_custom_service(
    service_id UUID
)
RETURNS void AS $$
BEGIN
    UPDATE public.provider_services
    SET 
        custom_service_status = 'approved',
        custom_service_reviewed_at = NOW(),
        custom_service_reviewed_by = auth.uid(),
        is_active = true
    WHERE id = service_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a custom service
CREATE OR REPLACE FUNCTION reject_custom_service(
    service_id UUID,
    rejection_reason TEXT
)
RETURNS void AS $$
BEGIN
    UPDATE public.provider_services
    SET 
        custom_service_status = 'rejected',
        custom_service_rejection_reason = rejection_reason,
        custom_service_reviewed_at = NOW(),
        custom_service_reviewed_by = auth.uid(),
        is_active = false
    WHERE id = service_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to automatically set status to 'pending' for new custom services
CREATE OR REPLACE FUNCTION set_custom_service_pending()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.custom_service_name IS NOT NULL THEN
        NEW.custom_service_status = 'pending';
        NEW.is_active = false; -- Don't show in search until approved
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_custom_service_pending
    BEFORE INSERT ON public.provider_services
    FOR EACH ROW
    EXECUTE FUNCTION set_custom_service_pending();

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION approve_custom_service(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_custom_service(UUID, TEXT) TO authenticated;

