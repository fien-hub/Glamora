-- =====================================================
-- CUSTOM SERVICE NOTIFICATIONS & ANALYTICS
-- =====================================================
-- This adds notification system for custom service approvals/rejections
-- and analytics tracking for custom service submissions
-- =====================================================

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON public.notifications(user_id, read) 
WHERE read = FALSE;

-- Add comment
COMMENT ON TABLE public.notifications IS 
'Stores in-app notifications for users including custom service approval/rejection notifications';

-- Create custom service analytics table
CREATE TABLE IF NOT EXISTS public.custom_service_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.provider_services(id) ON DELETE CASCADE NOT NULL,
    custom_service_name TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('submitted', 'approved', 'rejected')),
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_custom_service_analytics_provider 
ON public.custom_service_analytics(provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_custom_service_analytics_event 
ON public.custom_service_analytics(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_custom_service_analytics_date 
ON public.custom_service_analytics(created_at DESC);

-- Add comment
COMMENT ON TABLE public.custom_service_analytics IS 
'Tracks custom service submission, approval, and rejection events for analytics';

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (p_user_id, p_type, p_title, p_message, p_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track custom service analytics
CREATE OR REPLACE FUNCTION track_custom_service_event(
    p_provider_id UUID,
    p_service_id UUID,
    p_custom_service_name TEXT,
    p_event_type TEXT,
    p_event_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    analytics_id UUID;
BEGIN
    INSERT INTO public.custom_service_analytics (
        provider_id,
        service_id,
        custom_service_name,
        event_type,
        event_data
    )
    VALUES (
        p_provider_id,
        p_service_id,
        p_custom_service_name,
        p_event_type,
        p_event_data
    )
    RETURNING id INTO analytics_id;
    
    RETURN analytics_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update approve_custom_service function to send notification and track analytics
CREATE OR REPLACE FUNCTION approve_custom_service(
    service_id UUID
)
RETURNS void AS $$
DECLARE
    v_provider_id UUID;
    v_custom_service_name TEXT;
    v_business_name TEXT;
BEGIN
    -- Get service details
    SELECT provider_id, custom_service_name
    INTO v_provider_id, v_custom_service_name
    FROM public.provider_services
    WHERE id = service_id;
    
    -- Get business name
    SELECT business_name INTO v_business_name
    FROM public.provider_profiles
    WHERE id = v_provider_id;
    
    -- Update service status
    UPDATE public.provider_services
    SET 
        custom_service_status = 'approved',
        custom_service_reviewed_at = NOW(),
        custom_service_reviewed_by = auth.uid(),
        is_active = true
    WHERE id = service_id;
    
    -- Create notification
    PERFORM create_notification(
        v_provider_id,
        'custom_service_approved',
        '✅ Custom Service Approved!',
        'Your custom service "' || v_custom_service_name || '" has been approved and is now visible to customers.',
        jsonb_build_object(
            'service_id', service_id,
            'service_name', v_custom_service_name,
            'action', 'view_services'
        )
    );
    
    -- Track analytics
    PERFORM track_custom_service_event(
        v_provider_id,
        service_id,
        v_custom_service_name,
        'approved',
        jsonb_build_object(
            'reviewed_by', auth.uid(),
            'business_name', v_business_name
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update reject_custom_service function to send notification and track analytics
CREATE OR REPLACE FUNCTION reject_custom_service(
    service_id UUID,
    rejection_reason TEXT
)
RETURNS void AS $$
DECLARE
    v_provider_id UUID;
    v_custom_service_name TEXT;
    v_business_name TEXT;
BEGIN
    -- Get service details
    SELECT provider_id, custom_service_name
    INTO v_provider_id, v_custom_service_name
    FROM public.provider_services
    WHERE id = service_id;
    
    -- Get business name
    SELECT business_name INTO v_business_name
    FROM public.provider_profiles
    WHERE id = v_provider_id;
    
    -- Update service status
    UPDATE public.provider_services
    SET 
        custom_service_status = 'rejected',
        custom_service_rejection_reason = rejection_reason,
        custom_service_reviewed_at = NOW(),
        custom_service_reviewed_by = auth.uid(),
        is_active = false
    WHERE id = service_id;
    
    -- Create notification
    PERFORM create_notification(
        v_provider_id,
        'custom_service_rejected',
        '❌ Custom Service Not Approved',
        'Your custom service "' || v_custom_service_name || '" was not approved. Reason: ' || rejection_reason,
        jsonb_build_object(
            'service_id', service_id,
            'service_name', v_custom_service_name,
            'rejection_reason', rejection_reason,
            'action', 'view_services'
        )
    );
    
    -- Track analytics
    PERFORM track_custom_service_event(
        v_provider_id,
        service_id,
        v_custom_service_name,
        'rejected',
        jsonb_build_object(
            'reviewed_by', auth.uid(),
            'rejection_reason', rejection_reason,
            'business_name', v_business_name
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to track custom service submissions
CREATE OR REPLACE FUNCTION track_custom_service_submission()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.custom_service_name IS NOT NULL THEN
        -- Track submission analytics
        PERFORM track_custom_service_event(
            NEW.provider_id,
            NEW.id,
            NEW.custom_service_name,
            'submitted',
            jsonb_build_object(
                'base_price', NEW.base_price,
                'duration_minutes', NEW.duration_minutes,
                'description', NEW.description
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tracking submissions
DROP TRIGGER IF EXISTS trigger_track_custom_service_submission ON public.provider_services;
CREATE TRIGGER trigger_track_custom_service_submission
    AFTER INSERT ON public.provider_services
    FOR EACH ROW
    EXECUTE FUNCTION track_custom_service_submission();

-- RLS Policies for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for analytics (admin only)
ALTER TABLE public.custom_service_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all analytics" 
ON public.custom_service_analytics 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION track_custom_service_event(UUID, UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_custom_service(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_custom_service(UUID, TEXT) TO authenticated;

