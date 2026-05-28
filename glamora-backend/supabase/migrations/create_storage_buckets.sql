-- Create Supabase Storage buckets for Glamora media uploads
-- profile-pictures: public read (avatars shown to all users)
-- portfolio-images: public read (provider portfolio shown to customers)
-- chat-images:      authenticated read only (private between parties)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('profile-pictures', 'profile-pictures', true,  5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('portfolio-images', 'portfolio-images', true,  10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('chat-images',      'chat-images',      false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── profile-pictures RLS policies ───────────────────────────────────────────
-- Anyone can view profile pictures (public bucket already allows reads, but
-- explicit policy is needed for storage.objects SELECT if RLS is enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'profile-pictures: public read'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "profile-pictures: public read"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'profile-pictures');
    $p$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'profile-pictures: authenticated upload'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "profile-pictures: authenticated upload"
        ON storage.objects FOR INSERT
        WITH CHECK (
          bucket_id = 'profile-pictures'
          AND auth.role() = 'authenticated'
          -- Users may only write into their own folder: <user_id>/<filename>
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
    $p$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'profile-pictures: owner update'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "profile-pictures: owner update"
        ON storage.objects FOR UPDATE
        USING (
          bucket_id = 'profile-pictures'
          AND auth.role() = 'authenticated'
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
    $p$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'profile-pictures: owner delete'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "profile-pictures: owner delete"
        ON storage.objects FOR DELETE
        USING (
          bucket_id = 'profile-pictures'
          AND auth.role() = 'authenticated'
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
    $p$;
  END IF;
END $$;

-- ─── portfolio-images RLS policies ───────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'portfolio-images: public read'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "portfolio-images: public read"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'portfolio-images');
    $p$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'portfolio-images: authenticated upload'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "portfolio-images: authenticated upload"
        ON storage.objects FOR INSERT
        WITH CHECK (
          bucket_id = 'portfolio-images'
          AND auth.role() = 'authenticated'
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
    $p$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'portfolio-images: owner update'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "portfolio-images: owner update"
        ON storage.objects FOR UPDATE
        USING (
          bucket_id = 'portfolio-images'
          AND auth.role() = 'authenticated'
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
    $p$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'portfolio-images: owner delete'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "portfolio-images: owner delete"
        ON storage.objects FOR DELETE
        USING (
          bucket_id = 'portfolio-images'
          AND auth.role() = 'authenticated'
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
    $p$;
  END IF;
END $$;

-- ─── chat-images RLS policies ─────────────────────────────────────────────────
-- Only authenticated users can read; only the uploader can write/delete.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'chat-images: authenticated read'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "chat-images: authenticated read"
        ON storage.objects FOR SELECT
        USING (
          bucket_id = 'chat-images'
          AND auth.role() = 'authenticated'
        );
    $p$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'chat-images: authenticated upload'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "chat-images: authenticated upload"
        ON storage.objects FOR INSERT
        WITH CHECK (
          bucket_id = 'chat-images'
          AND auth.role() = 'authenticated'
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
    $p$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'chat-images: owner delete'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "chat-images: owner delete"
        ON storage.objects FOR DELETE
        USING (
          bucket_id = 'chat-images'
          AND auth.role() = 'authenticated'
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
    $p$;
  END IF;
END $$;
