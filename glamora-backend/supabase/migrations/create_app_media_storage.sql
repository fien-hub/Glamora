-- Migration: Create app media storage buckets and RLS policies
-- Description: Sets up Supabase Storage buckets used by the mobile app for
-- profile photos, portfolio media, service images, and chat attachments.

-- =====================================================
-- Buckets
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'profile-pictures',
    'profile-pictures',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  ),
  (
    'portfolio-images',
    'portfolio-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  ),
  (
    'service-images',
    'service-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  ),
  (
    'chat-images',
    'chat-images',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  ),
  (
    'portfolio-videos',
    'portfolio-videos',
    true,
    52428800,
    ARRAY['video/mp4', 'video/quicktime', 'video/webm']
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Public read policies for public buckets
-- =====================================================

DROP POLICY IF EXISTS "Public can view profile pictures" ON storage.objects;
CREATE POLICY "Public can view profile pictures"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

DROP POLICY IF EXISTS "Public can view portfolio images" ON storage.objects;
CREATE POLICY "Public can view portfolio images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'portfolio-images');

DROP POLICY IF EXISTS "Public can view service images" ON storage.objects;
CREATE POLICY "Public can view service images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'service-images');

DROP POLICY IF EXISTS "Public can view portfolio videos" ON storage.objects;
CREATE POLICY "Public can view portfolio videos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'portfolio-videos');

-- =====================================================
-- Profile pictures: users manage only their own folder
-- Path format: <auth_user_id>/<filename>
-- =====================================================

DROP POLICY IF EXISTS "Users can upload own profile pictures" ON storage.objects;
CREATE POLICY "Users can upload own profile pictures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own profile pictures" ON storage.objects;
CREATE POLICY "Users can update own profile pictures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own profile pictures" ON storage.objects;
CREATE POLICY "Users can delete own profile pictures"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- Provider-owned media: only providers manage their own profile folder
-- Path format: <profile_id>/<filename>
-- =====================================================

DROP POLICY IF EXISTS "Providers can upload own portfolio images" ON storage.objects;
CREATE POLICY "Providers can upload own portfolio images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'portfolio-images'
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text
    FROM public.profiles p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.user_id = auth.uid()
      AND u.role = 'provider'
  )
);

DROP POLICY IF EXISTS "Providers can update own portfolio images" ON storage.objects;
CREATE POLICY "Providers can update own portfolio images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'portfolio-images'
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text
    FROM public.profiles p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.user_id = auth.uid()
      AND u.role = 'provider'
  )
)
WITH CHECK (
  bucket_id = 'portfolio-images'
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text
    FROM public.profiles p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.user_id = auth.uid()
      AND u.role = 'provider'
  )
);

DROP POLICY IF EXISTS "Providers can delete own portfolio images" ON storage.objects;
CREATE POLICY "Providers can delete own portfolio images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'portfolio-images'
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text
    FROM public.profiles p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.user_id = auth.uid()
      AND u.role = 'provider'
  )
);

DROP POLICY IF EXISTS "Providers can upload own portfolio videos" ON storage.objects;
CREATE POLICY "Providers can upload own portfolio videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'portfolio-videos'
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text
    FROM public.profiles p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.user_id = auth.uid()
      AND u.role = 'provider'
  )
);

DROP POLICY IF EXISTS "Providers can update own portfolio videos" ON storage.objects;
CREATE POLICY "Providers can update own portfolio videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'portfolio-videos'
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text
    FROM public.profiles p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.user_id = auth.uid()
      AND u.role = 'provider'
  )
)
WITH CHECK (
  bucket_id = 'portfolio-videos'
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text
    FROM public.profiles p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.user_id = auth.uid()
      AND u.role = 'provider'
  )
);

DROP POLICY IF EXISTS "Providers can delete own portfolio videos" ON storage.objects;
CREATE POLICY "Providers can delete own portfolio videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'portfolio-videos'
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text
    FROM public.profiles p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.user_id = auth.uid()
      AND u.role = 'provider'
  )
);

DROP POLICY IF EXISTS "Providers can upload own service images" ON storage.objects;
CREATE POLICY "Providers can upload own service images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-images'
  AND (storage.foldername(name))[1] IN (
    SELECT ps.id::text
    FROM public.provider_services ps
    JOIN public.profiles p ON p.id = ps.provider_id
    WHERE p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Providers can update own service images" ON storage.objects;
CREATE POLICY "Providers can update own service images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'service-images'
  AND (storage.foldername(name))[1] IN (
    SELECT ps.id::text
    FROM public.provider_services ps
    JOIN public.profiles p ON p.id = ps.provider_id
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'service-images'
  AND (storage.foldername(name))[1] IN (
    SELECT ps.id::text
    FROM public.provider_services ps
    JOIN public.profiles p ON p.id = ps.provider_id
    WHERE p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Providers can delete own service images" ON storage.objects;
CREATE POLICY "Providers can delete own service images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'service-images'
  AND (storage.foldername(name))[1] IN (
    SELECT ps.id::text
    FROM public.provider_services ps
    JOIN public.profiles p ON p.id = ps.provider_id
    WHERE p.user_id = auth.uid()
  )
);

-- =====================================================
-- Chat images: private bucket, only sender folder owner can manage.
-- Reads stay private to backend/service-role until the app adds explicit
-- participant-scoped read paths.
-- Path format: <auth_user_id>/<filename>
-- =====================================================

DROP POLICY IF EXISTS "Users can upload own chat images" ON storage.objects;
CREATE POLICY "Users can upload own chat images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own chat images" ON storage.objects;
CREATE POLICY "Users can update own chat images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'chat-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own chat images" ON storage.objects;
CREATE POLICY "Users can delete own chat images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);