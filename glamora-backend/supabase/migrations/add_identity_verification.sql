-- Migration: Add Identity Verification System
-- Description: Adds verification documents table and fields for provider identity verification

-- Add verification status enum
DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM ('pending', 'under_review', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add verification document type enum
DO $$ BEGIN
    CREATE TYPE document_type AS ENUM ('drivers_license', 'passport', 'national_id', 'business_license', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add verification fields to provider_profiles
ALTER TABLE public.provider_profiles
ADD COLUMN IF NOT EXISTS identity_verification_status verification_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS identity_verification_notes TEXT,
ADD COLUMN IF NOT EXISTS identity_verified_by UUID REFERENCES auth.users(id);

-- Create verification_documents table
CREATE TABLE IF NOT EXISTS public.verification_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    document_url TEXT NOT NULL,
    document_number TEXT,
    expiry_date DATE,
    status verification_status DEFAULT 'pending',
    rejection_reason TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_verification_documents_provider 
ON public.verification_documents(provider_id);

CREATE INDEX IF NOT EXISTS idx_verification_documents_status 
ON public.verification_documents(status);

CREATE INDEX IF NOT EXISTS idx_provider_profiles_verification_status 
ON public.provider_profiles(identity_verification_status);

-- Add updated_at trigger for verification_documents
DROP TRIGGER IF EXISTS update_verification_documents_updated_at ON public.verification_documents;
CREATE TRIGGER update_verification_documents_updated_at
    BEFORE UPDATE ON public.verification_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for verification_documents
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

-- Providers can view their own documents
CREATE POLICY "Providers can view own verification documents"
ON public.verification_documents
FOR SELECT
USING (
    provider_id IN (
        SELECT pp.id 
        FROM provider_profiles pp
        JOIN profiles p ON p.id = pp.id
        WHERE p.user_id = auth.uid()
    )
);

-- Providers can insert their own documents
CREATE POLICY "Providers can upload own verification documents"
ON public.verification_documents
FOR INSERT
WITH CHECK (
    provider_id IN (
        SELECT pp.id 
        FROM provider_profiles pp
        JOIN profiles p ON p.id = pp.id
        WHERE p.user_id = auth.uid()
    )
);

-- Providers can update their own pending documents
CREATE POLICY "Providers can update own pending documents"
ON public.verification_documents
FOR UPDATE
USING (
    provider_id IN (
        SELECT pp.id 
        FROM provider_profiles pp
        JOIN profiles p ON p.id = pp.id
        WHERE p.user_id = auth.uid()
    )
    AND status = 'pending'
)
WITH CHECK (
    provider_id IN (
        SELECT pp.id 
        FROM provider_profiles pp
        JOIN profiles p ON p.id = pp.id
        WHERE p.user_id = auth.uid()
    )
);

-- Providers can delete their own pending documents
CREATE POLICY "Providers can delete own pending documents"
ON public.verification_documents
FOR DELETE
USING (
    provider_id IN (
        SELECT pp.id 
        FROM provider_profiles pp
        JOIN profiles p ON p.id = pp.id
        WHERE p.user_id = auth.uid()
    )
    AND status = 'pending'
);

-- Admins can view all documents (for future admin panel)
CREATE POLICY "Admins can view all verification documents"
ON public.verification_documents
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);

-- Admins can update all documents (for review)
CREATE POLICY "Admins can update all verification documents"
ON public.verification_documents
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);

-- Comment on table and columns
COMMENT ON TABLE public.verification_documents IS 'Stores identity verification documents uploaded by providers';
COMMENT ON COLUMN public.provider_profiles.identity_verification_status IS 'Current status of provider identity verification';
COMMENT ON COLUMN public.provider_profiles.identity_verified_at IS 'Timestamp when identity was verified';

