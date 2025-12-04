-- =====================================================
-- ADD "OTHER" CATEGORY FOR CUSTOM SERVICES
-- =====================================================
-- This allows providers to offer services not in the predefined list
-- and customers to search for unique/custom services
-- =====================================================

-- Add "Other" service category
INSERT INTO public.service_categories (id, name, description, icon) VALUES
    ('550e8400-e29b-41d4-a716-446655440007', 'Other', 'Custom and specialty services', '✨')
ON CONFLICT (id) DO NOTHING;

-- Add a generic "Custom Service" entry that providers can use
INSERT INTO public.services (id, category_id, name, description, base_duration_minutes) VALUES
    ('550e8400-e29b-41d4-a716-446655440999', '550e8400-e29b-41d4-a716-446655440007', 'Custom Service', 'Provider will specify service details', 60)
ON CONFLICT (id) DO NOTHING;

-- Add custom_service_name column to provider_services table
-- This allows providers to specify their own service name when using "Custom Service"
ALTER TABLE public.provider_services 
ADD COLUMN IF NOT EXISTS custom_service_name TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN public.provider_services.custom_service_name IS 
'Custom service name when service_id points to the generic "Custom Service" entry. Allows providers to offer services not in the predefined list.';

-- Create index for searching custom services
CREATE INDEX IF NOT EXISTS idx_provider_services_custom_name 
ON public.provider_services(custom_service_name) 
WHERE custom_service_name IS NOT NULL;

