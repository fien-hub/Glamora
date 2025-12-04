-- Fix portfolio_items table - add missing columns
ALTER TABLE portfolio_items 
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_category TEXT DEFAULT NULL;

-- Create function to update portfolio counts from related tables
CREATE OR REPLACE FUNCTION update_portfolio_counts()
RETURNS void AS $$
BEGIN
  UPDATE portfolio_items pi
  SET 
    like_count = (SELECT COUNT(*) FROM portfolio_likes WHERE portfolio_item_id = pi.id),
    view_count = (SELECT COUNT(*) FROM portfolio_views WHERE portfolio_item_id = pi.id);
END;
$$ LANGUAGE plpgsql;

-- Run initial count update
SELECT update_portfolio_counts();

-- Create triggers to keep counts updated
CREATE OR REPLACE FUNCTION increment_portfolio_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE portfolio_items 
  SET like_count = like_count + 1 
  WHERE id = NEW.portfolio_item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_portfolio_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE portfolio_items 
  SET like_count = GREATEST(0, like_count - 1)
  WHERE id = OLD.portfolio_item_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_portfolio_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE portfolio_items 
  SET view_count = view_count + 1 
  WHERE id = NEW.portfolio_item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_portfolio_like_added ON portfolio_likes;
DROP TRIGGER IF EXISTS on_portfolio_like_removed ON portfolio_likes;
DROP TRIGGER IF EXISTS on_portfolio_view_added ON portfolio_views;

-- Create new triggers
CREATE TRIGGER on_portfolio_like_added
AFTER INSERT ON portfolio_likes
FOR EACH ROW
EXECUTE FUNCTION increment_portfolio_like_count();

CREATE TRIGGER on_portfolio_like_removed
AFTER DELETE ON portfolio_likes
FOR EACH ROW
EXECUTE FUNCTION decrement_portfolio_like_count();

CREATE TRIGGER on_portfolio_view_added
AFTER INSERT ON portfolio_views
FOR EACH ROW
EXECUTE FUNCTION increment_portfolio_view_count();

-- Fix get_feed_posts function - change distance_km return type to double precision
DROP FUNCTION IF EXISTS get_feed_posts(double precision, double precision, integer, integer);

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
    pi.like_count::bigint AS likes_count,
    pi.view_count::bigint AS views_count,
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

