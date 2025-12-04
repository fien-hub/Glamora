-- Add Stripe Connect fields to provider_profiles
ALTER TABLE public.provider_profiles
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE;

-- Add platform_fee field to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10, 2) DEFAULT 0.00;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_provider_profiles_stripe_account ON public.provider_profiles(stripe_account_id);

