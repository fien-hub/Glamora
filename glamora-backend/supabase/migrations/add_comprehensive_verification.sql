-- Migration: Comprehensive Verification System
-- Description: Adds phone/email verification for all users, enhanced document verification for providers

-- =====================================================
-- PART 1: Add phone and email verification to profiles
-- =====================================================

-- Add verification fields to profiles (for both customers and providers)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS phone_verification_code TEXT,
ADD COLUMN IF NOT EXISTS phone_verification_expires_at TIMESTAMPTZ;

-- Add customer verification status to customer_profiles
ALTER TABLE public.customer_profiles
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'email_verified', 'phone_verified', 'fully_verified')),
ADD COLUMN IF NOT EXISTS payment_method_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_method_verified_at TIMESTAMPTZ;

-- =====================================================
-- PART 2: Enhanced Provider Document Types
-- =====================================================

-- Add new document types to the enum (if not exists)
DO $$
BEGIN
    -- Add 'selfie' type
    ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'selfie';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'certification';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'professional_license';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- PART 3: Add social media links to provider_profiles
-- =====================================================

ALTER TABLE public.provider_profiles
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS selfie_url TEXT,
ADD COLUMN IF NOT EXISTS selfie_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS selfie_verified_at TIMESTAMPTZ;

-- =====================================================
-- PART 4: Create verification checklist table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.provider_verification_checklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE UNIQUE,
    -- Required items
    govt_id_uploaded BOOLEAN DEFAULT FALSE,
    selfie_uploaded BOOLEAN DEFAULT FALSE,
    selfie_matched BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    profile_photo_uploaded BOOLEAN DEFAULT FALSE,
    portfolio_uploaded BOOLEAN DEFAULT FALSE,
    services_added BOOLEAN DEFAULT FALSE,
    business_name_added BOOLEAN DEFAULT FALSE,
    -- Optional items
    certifications_uploaded BOOLEAN DEFAULT FALSE,
    professional_license_uploaded BOOLEAN DEFAULT FALSE,
    social_media_linked BOOLEAN DEFAULT FALSE,
    -- Progress tracking
    required_items_complete INTEGER DEFAULT 0,
    optional_items_complete INTEGER DEFAULT 0,
    total_progress_percent INTEGER DEFAULT 0,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.provider_verification_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view own checklist"
ON public.provider_verification_checklist FOR SELECT
USING (
    provider_id IN (
        SELECT pp.id FROM provider_profiles pp
        JOIN profiles p ON p.id = pp.id
        WHERE p.user_id = auth.uid()
    )
);

CREATE POLICY "Providers can update own checklist"
ON public.provider_verification_checklist FOR UPDATE
USING (
    provider_id IN (
        SELECT pp.id FROM provider_profiles pp
        JOIN profiles p ON p.id = pp.id
        WHERE p.user_id = auth.uid()
    )
);

CREATE POLICY "Providers can insert own checklist"
ON public.provider_verification_checklist FOR INSERT
WITH CHECK (
    provider_id IN (
        SELECT pp.id FROM provider_profiles pp
        JOIN profiles p ON p.id = pp.id
        WHERE p.user_id = auth.uid()
    )
);

-- Create trigger to update progress
CREATE OR REPLACE FUNCTION update_verification_progress()
RETURNS TRIGGER AS $$
DECLARE
    required_count INTEGER;
    optional_count INTEGER;
BEGIN
    -- Count required items (9 total required)
    required_count := 0;
    IF NEW.govt_id_uploaded THEN required_count := required_count + 1; END IF;
    IF NEW.selfie_uploaded THEN required_count := required_count + 1; END IF;
    IF NEW.selfie_matched THEN required_count := required_count + 1; END IF;
    IF NEW.phone_verified THEN required_count := required_count + 1; END IF;
    IF NEW.email_verified THEN required_count := required_count + 1; END IF;
    IF NEW.profile_photo_uploaded THEN required_count := required_count + 1; END IF;
    IF NEW.portfolio_uploaded THEN required_count := required_count + 1; END IF;
    IF NEW.services_added THEN required_count := required_count + 1; END IF;
    IF NEW.business_name_added THEN required_count := required_count + 1; END IF;

    -- Count optional items
    optional_count := 0;
    IF NEW.certifications_uploaded THEN optional_count := optional_count + 1; END IF;
    IF NEW.professional_license_uploaded THEN optional_count := optional_count + 1; END IF;
    IF NEW.social_media_linked THEN optional_count := optional_count + 1; END IF;

    NEW.required_items_complete := required_count;
    NEW.optional_items_complete := optional_count;
    NEW.total_progress_percent := (required_count * 100) / 9;
    NEW.updated_at := NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_verification_progress ON public.provider_verification_checklist;
CREATE TRIGGER trigger_update_verification_progress
    BEFORE INSERT OR UPDATE ON public.provider_verification_checklist
    FOR EACH ROW
    EXECUTE FUNCTION update_verification_progress();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_phone_verified ON public.profiles(phone_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON public.profiles(email_verified);
CREATE INDEX IF NOT EXISTS idx_customer_verification_status ON public.customer_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_provider_checklist_progress ON public.provider_verification_checklist(total_progress_percent);

-- =====================================================
-- PART 5: Phone Verification OTP Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.phone_verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS
ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own codes"
ON public.phone_verification_codes FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own codes"
ON public.phone_verification_codes FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own codes"
ON public.phone_verification_codes FOR UPDATE
USING (user_id = auth.uid());

-- Create index for lookup
CREATE INDEX IF NOT EXISTS idx_phone_verification_user ON public.phone_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verification_phone ON public.phone_verification_codes(phone_number);

-- Add comments
COMMENT ON TABLE public.provider_verification_checklist IS 'Tracks provider verification progress through onboarding';
COMMENT ON TABLE public.phone_verification_codes IS 'Stores OTP codes for phone number verification';
COMMENT ON COLUMN public.profiles.phone_verified IS 'Whether the user phone number has been verified via OTP';
COMMENT ON COLUMN public.profiles.email_verified IS 'Whether the user email has been verified';
COMMENT ON COLUMN public.customer_profiles.verification_status IS 'Overall verification status: unverified, email_verified, phone_verified, fully_verified';
