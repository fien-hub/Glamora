-- Add business settings fields to provider_profiles table
ALTER TABLE public.provider_profiles
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT DEFAULT 'Standard cancellation policy applies',
ADD COLUMN IF NOT EXISTS cancellation_window_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS booking_buffer_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deposit_percentage DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS min_lead_time_hours INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS max_advance_booking_days INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS auto_accept_bookings BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS instant_booking_enabled BOOLEAN DEFAULT TRUE;

-- Add comments
COMMENT ON COLUMN public.provider_profiles.cancellation_policy IS 'Provider cancellation policy text';
COMMENT ON COLUMN public.provider_profiles.cancellation_window_hours IS 'Hours before appointment when cancellation is allowed';
COMMENT ON COLUMN public.provider_profiles.booking_buffer_minutes IS 'Buffer time between appointments in minutes';
COMMENT ON COLUMN public.provider_profiles.deposit_required IS 'Whether deposit is required for bookings';
COMMENT ON COLUMN public.provider_profiles.deposit_percentage IS 'Percentage of total price required as deposit (0-100)';
COMMENT ON COLUMN public.provider_profiles.min_lead_time_hours IS 'Minimum hours in advance for booking';
COMMENT ON COLUMN public.provider_profiles.max_advance_booking_days IS 'Maximum days in advance customers can book';
COMMENT ON COLUMN public.provider_profiles.auto_accept_bookings IS 'Automatically accept booking requests';
COMMENT ON COLUMN public.provider_profiles.instant_booking_enabled IS 'Allow instant booking without approval';

