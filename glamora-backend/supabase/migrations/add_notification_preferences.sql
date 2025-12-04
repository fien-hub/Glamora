-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Push notification preferences
    push_new_booking BOOLEAN DEFAULT TRUE,
    push_booking_cancelled BOOLEAN DEFAULT TRUE,
    push_booking_reminder BOOLEAN DEFAULT TRUE,
    push_payment_received BOOLEAN DEFAULT TRUE,
    push_new_review BOOLEAN DEFAULT TRUE,
    push_new_message BOOLEAN DEFAULT TRUE,
    
    -- Email notification preferences
    email_new_booking BOOLEAN DEFAULT TRUE,
    email_booking_cancelled BOOLEAN DEFAULT TRUE,
    email_booking_reminder BOOLEAN DEFAULT FALSE,
    email_payment_received BOOLEAN DEFAULT TRUE,
    email_new_review BOOLEAN DEFAULT TRUE,
    email_new_message BOOLEAN DEFAULT FALSE,
    email_weekly_summary BOOLEAN DEFAULT TRUE,
    email_monthly_report BOOLEAN DEFAULT TRUE,
    
    -- SMS notification preferences
    sms_new_booking BOOLEAN DEFAULT FALSE,
    sms_booking_cancelled BOOLEAN DEFAULT FALSE,
    sms_booking_reminder BOOLEAN DEFAULT FALSE,
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON public.notification_preferences(user_id);

-- Add updated_at trigger
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notification preferences"
    ON public.notification_preferences FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification preferences"
    ON public.notification_preferences FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification preferences"
    ON public.notification_preferences FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notification preferences"
    ON public.notification_preferences FOR DELETE
    USING (user_id = auth.uid());

-- Add comment
COMMENT ON TABLE public.notification_preferences IS 'User notification preferences for push, email, and SMS notifications';

