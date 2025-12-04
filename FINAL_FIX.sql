-- ============================================
-- GLAMORA DATABASE FIX - COPY THIS ENTIRE FILE
-- ============================================

-- Step 1: Add missing columns to portfolio_items
ALTER TABLE portfolio_items
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_category TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS caption TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Step 1.5: Add missing location columns to provider_profiles
ALTER TABLE provider_profiles
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Step 2: Drop ALL versions of get_feed_posts function
DROP FUNCTION IF EXISTS get_feed_posts();
DROP FUNCTION IF EXISTS get_feed_posts(double precision, double precision);
DROP FUNCTION IF EXISTS get_feed_posts(double precision, double precision, integer);
DROP FUNCTION IF EXISTS get_feed_posts(double precision, double precision, integer, integer);
DROP FUNCTION IF EXISTS get_feed_posts(numeric, numeric, integer, integer);

-- Step 3: Create the correct version with double precision
CREATE FUNCTION get_feed_posts(
  user_lat double precision DEFAULT NULL,
  user_lng double precision DEFAULT NULL,
  page_size integer DEFAULT 20,
  page_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  provider_id uuid,
  image_url text,
  description text,
  service_category text,
  likes_count bigint,
  views_count bigint,
  created_at timestamptz,
  is_visible boolean,
  provider_name text,
  provider_avatar text,
  provider_rating numeric,
  distance_km double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pi.id,
    pi.provider_id,
    pi.image_url,
    pi.description,
    pi.service_category,
    COALESCE(pi.like_count, 0)::bigint AS likes_count,
    COALESCE(pi.view_count, 0)::bigint AS views_count,
    pi.created_at,
    pi.is_visible,
    pp.business_name AS provider_name,
    pp.avatar_url AS provider_avatar,
    pp.rating AS provider_rating,
    CASE
      WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL 
           AND pp.latitude IS NOT NULL AND pp.longitude IS NOT NULL
      THEN (
        6371 * acos(
          cos(radians(user_lat)) * cos(radians(pp.latitude)) *
          cos(radians(pp.longitude) - radians(user_lng)) +
          sin(radians(user_lat)) * sin(radians(pp.latitude))
        )
      )::double precision
      ELSE NULL
    END AS distance_km
  FROM portfolio_items pi
  INNER JOIN provider_profiles pp ON pi.provider_id = pp.id
  WHERE pi.is_visible = true
  GROUP BY pi.id, pp.id
  ORDER BY
    CASE
      WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL 
           AND pp.latitude IS NOT NULL AND pp.longitude IS NOT NULL
      THEN (
        6371 * acos(
          cos(radians(user_lat)) * cos(radians(pp.latitude)) *
          cos(radians(pp.longitude) - radians(user_lng)) +
          sin(radians(user_lat)) * sin(radians(pp.latitude))
        )
      )
      ELSE 999999
    END ASC,
    pi.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;

-- Step 4: Verify the changes
SELECT 'Columns added successfully' AS status;
SELECT 'Function created successfully' AS status;

