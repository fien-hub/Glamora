-- Migration: Add payment_methods table for storing customer saved payment methods
-- Created: 2024-11-24

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
    stripe_payment_method_id TEXT UNIQUE NOT NULL,
    card_brand TEXT NOT NULL,
    last_four TEXT NOT NULL,
    exp_month INTEGER NOT NULL,
    exp_year INTEGER NOT NULL,
    cardholder_name TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_customer_id ON public.payment_methods(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_id ON public.payment_methods(stripe_payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON public.payment_methods(customer_id, is_default);

-- Add RLS policies
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payment methods
CREATE POLICY "Users can view own payment methods"
    ON public.payment_methods
    FOR SELECT
    USING (
        customer_id IN (
            SELECT cp.id 
            FROM public.customer_profiles cp
            JOIN public.profiles p ON p.id = cp.id
            WHERE p.user_id = auth.uid()
        )
    );

-- Policy: Users can insert their own payment methods
CREATE POLICY "Users can insert own payment methods"
    ON public.payment_methods
    FOR INSERT
    WITH CHECK (
        customer_id IN (
            SELECT cp.id 
            FROM public.customer_profiles cp
            JOIN public.profiles p ON p.id = cp.id
            WHERE p.user_id = auth.uid()
        )
    );

-- Policy: Users can update their own payment methods
CREATE POLICY "Users can update own payment methods"
    ON public.payment_methods
    FOR UPDATE
    USING (
        customer_id IN (
            SELECT cp.id 
            FROM public.customer_profiles cp
            JOIN public.profiles p ON p.id = cp.id
            WHERE p.user_id = auth.uid()
        )
    );

-- Policy: Users can delete their own payment methods
CREATE POLICY "Users can delete own payment methods"
    ON public.payment_methods
    FOR DELETE
    USING (
        customer_id IN (
            SELECT cp.id 
            FROM public.customer_profiles cp
            JOIN public.profiles p ON p.id = cp.id
            WHERE p.user_id = auth.uid()
        )
    );

-- Function to ensure only one default payment method per customer
CREATE OR REPLACE FUNCTION public.ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this payment method as default
    IF NEW.is_default = TRUE THEN
        -- Set all other payment methods for this customer to non-default
        UPDATE public.payment_methods
        SET is_default = FALSE
        WHERE customer_id = NEW.customer_id
        AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one default payment method
DROP TRIGGER IF EXISTS ensure_single_default_payment_method_trigger ON public.payment_methods;
CREATE TRIGGER ensure_single_default_payment_method_trigger
    BEFORE INSERT OR UPDATE ON public.payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_single_default_payment_method();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_payment_methods_updated_at_trigger ON public.payment_methods;
CREATE TRIGGER update_payment_methods_updated_at_trigger
    BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION public.update_payment_methods_updated_at();

