-- Migration: Create Storage Bucket for Verification Documents
-- Description: Sets up Supabase Storage bucket with RLS policies for secure document storage

-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'verification-documents',
    'verification-documents',
    false, -- Private bucket
    10485760, -- 10MB file size limit
    ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for verification-documents bucket

-- Allow providers to upload their own verification documents
CREATE POLICY "Providers can upload own verification documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] IN (
        SELECT pp.id::text
        FROM provider_profiles pp
        JOIN profiles p ON p.id = pp.id
        WHERE p.user_id = auth.uid()
    )
);

-- Allow providers to view their own verification documents
CREATE POLICY "Providers can view own verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] IN (
        SELECT pp.id::text
        FROM provider_profiles pp
        JOIN profiles p ON p.id = pp.id
        WHERE p.user_id = auth.uid()
    )
);

-- Allow providers to update their own verification documents
CREATE POLICY "Providers can update own verification documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] IN (
        SELECT pp.id::text
        FROM provider_profiles pp
        JOIN profiles p ON p.id = pp.id
        WHERE p.user_id = auth.uid()
    )
);

-- Allow providers to delete their own verification documents
CREATE POLICY "Providers can delete own verification documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] IN (
        SELECT pp.id::text
        FROM provider_profiles pp
        JOIN profiles p ON p.id = pp.id
        WHERE p.user_id = auth.uid()
    )
);

-- Allow admins to view all verification documents
CREATE POLICY "Admins can view all verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'verification-documents'
    AND EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);

-- Allow admins to update all verification documents
CREATE POLICY "Admins can update all verification documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'verification-documents'
    AND EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);

-- Allow admins to delete all verification documents
CREATE POLICY "Admins can delete all verification documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'verification-documents'
    AND EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);

-- Comment on bucket
COMMENT ON TABLE storage.buckets IS 'Storage bucket for provider identity verification documents';

