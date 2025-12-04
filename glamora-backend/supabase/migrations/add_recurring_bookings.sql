-- Add recurring bookings support
-- This migration adds tables and columns to support recurring bookings

-- Create enum for recurring frequency
CREATE TYPE recurring_frequency AS ENUM ('daily', 'weekly', 'bi_weekly', 'monthly');

-- Create enum for recurring end type
CREATE TYPE recurring_end_type AS ENUM ('never', 'after_occurrences', 'on_date');

-- Create recurring_bookings table
CREATE TABLE IF NOT EXISTS public.recurring_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
    provider_service_id UUID REFERENCES public.provider_services(id) ON DELETE CASCADE,
    
    -- Recurring pattern
    frequency recurring_frequency NOT NULL,
    interval INTEGER DEFAULT 1, -- e.g., every 2 weeks
    
    -- Start date and time
    start_date DATE NOT NULL,
    start_time TIME NOT NULL,
    
    -- End conditions
    end_type recurring_end_type NOT NULL DEFAULT 'never',
    end_date DATE, -- Used when end_type is 'on_date'
    max_occurrences INTEGER, -- Used when end_type is 'after_occurrences'
    
    -- Booking details (same for all instances)
    total_price DECIMAL(10, 2) NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add recurring_booking_id to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS recurring_booking_id UUID REFERENCES public.recurring_bookings(id) ON DELETE SET NULL;

-- Add instance_number to bookings table (for tracking which occurrence this is)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS instance_number INTEGER;

-- Add is_recurring_instance flag to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS is_recurring_instance BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_recurring_booking_id ON public.bookings(recurring_booking_id);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_customer_id ON public.recurring_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_provider_id ON public.recurring_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_is_active ON public.recurring_bookings(is_active);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurring_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_recurring_bookings_updated_at
    BEFORE UPDATE ON public.recurring_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_recurring_bookings_updated_at();

-- Add RLS policies for recurring_bookings
ALTER TABLE public.recurring_bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own recurring bookings (as customer or provider)
CREATE POLICY "Users can view their own recurring bookings"
    ON public.recurring_bookings
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.customer_profiles WHERE id = customer_id
            UNION
            SELECT user_id FROM public.provider_profiles WHERE id = provider_id
        )
    );

-- Policy: Customers can create recurring bookings
CREATE POLICY "Customers can create recurring bookings"
    ON public.recurring_bookings
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.customer_profiles WHERE id = customer_id
        )
    );

-- Policy: Customers can update their own recurring bookings
CREATE POLICY "Customers can update their own recurring bookings"
    ON public.recurring_bookings
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.customer_profiles WHERE id = customer_id
        )
    );

-- Policy: Customers can delete their own recurring bookings
CREATE POLICY "Customers can delete their own recurring bookings"
    ON public.recurring_bookings
    FOR DELETE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.customer_profiles WHERE id = customer_id
        )
    );

-- Add comment to table
COMMENT ON TABLE public.recurring_bookings IS 'Stores recurring booking patterns and schedules';
COMMENT ON COLUMN public.bookings.recurring_booking_id IS 'References the parent recurring booking if this is a recurring instance';
COMMENT ON COLUMN public.bookings.instance_number IS 'The occurrence number for recurring bookings (1st, 2nd, 3rd, etc.)';
COMMENT ON COLUMN public.bookings.is_recurring_instance IS 'Flag to indicate if this booking is part of a recurring series';

