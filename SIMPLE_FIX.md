# Simple Database Fix - Copy and Paste This SQL

## Step 1: Open Supabase SQL Editor

Click this link: https://supabase.com/dashboard/project/hygbxfkkdmenpkvgpwhn/sql/new

## Step 2: Copy ALL the SQL below (including the comments)

```sql
-- Add missing columns to portfolio_items table
ALTER TABLE portfolio_items 
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_category TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS caption TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Drop the old function with wrong return type
DROP FUNCTION IF EXISTS get_feed_posts(double precision, double precision, integer, integer);

-- Create the new function with correct return type
CREATE OR REPLACE FUNCTION get_feed_posts(
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
```

## Step 3: Paste it in the SQL Editor

## Step 4: Click "RUN" button (bottom right)

## Step 5: You should see "Success. No rows returned"

## Step 6: Go back to your terminal and press 'r' to reload the app

## What This Fixes:

✅ Adds missing `like_count`, `view_count`, `service_category`, `caption`, `display_order` columns  
✅ Fixes the feed posts type mismatch error  
✅ Allows posts to load correctly  
✅ Allows portfolio to display correctly  

## After Running:

All these errors should be GONE:
- ❌ `column portfolio_items.caption does not exist`
- ❌ `column portfolio_items.display_order does not exist`
- ❌ `Returned type double precision does not match expected type numeric`

