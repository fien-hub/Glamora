-- Fix get_personalized_feed function to use double precision for distance_km
-- This fixes the error: "Returned type double precision does not match expected type numeric"

-- Drop existing function
DROP FUNCTION IF EXISTS get_personalized_feed(DECIMAL, DECIMAL, UUID, TEXT, INTEGER, INTEGER);

-- Recreate with double precision for distance
CREATE OR REPLACE FUNCTION get_personalized_feed(
    customer_lat DOUBLE PRECISION,
    customer_lon DOUBLE PRECISION,
    customer_id_param UUID DEFAULT NULL,
    category_filter TEXT DEFAULT NULL,
    page_num INTEGER DEFAULT 0,
    page_size INTEGER DEFAULT 10
)
RETURNS TABLE (
    portfolio_id UUID,
    provider_id UUID,
    provider_name TEXT,
    provider_avatar TEXT,
    provider_rating NUMERIC,
    provider_reviews INTEGER,
    provider_verified BOOLEAN,
    image_url TEXT,
    caption TEXT,
    tags TEXT[],
    like_count INTEGER,
    view_count INTEGER,
    distance_km DOUBLE PRECISION,
    is_liked BOOLEAN,
    is_saved BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pi.id AS portfolio_id,
        pp.id AS provider_id,
        pp.business_name AS provider_name,
        COALESCE(pp.avatar_url, p.avatar_url) AS provider_avatar,
        pp.rating AS provider_rating,
        pp.total_reviews AS provider_reviews,
        pp.is_verified AS provider_verified,
        pi.image_url,
        pi.caption,
        ARRAY[]::TEXT[] AS tags,
        pi.like_count,
        pi.view_count,
        CASE 
            WHEN customer_lat IS NOT NULL AND customer_lon IS NOT NULL 
                 AND pp.latitude IS NOT NULL AND pp.longitude IS NOT NULL
            THEN (
                6371 * acos(
                    cos(radians(customer_lat)) * cos(radians(pp.latitude)) *
                    cos(radians(pp.longitude) - radians(customer_lon)) +
                    sin(radians(customer_lat)) * sin(radians(pp.latitude))
                )
            )::DOUBLE PRECISION
            ELSE NULL
        END AS distance_km,
        EXISTS(
            SELECT 1 FROM public.portfolio_likes pl 
            WHERE pl.portfolio_item_id = pi.id 
            AND pl.customer_id = customer_id_param
        ) AS is_liked,
        EXISTS(
            SELECT 1 FROM public.portfolio_saves ps 
            WHERE ps.portfolio_item_id = pi.id 
            AND ps.customer_id = customer_id_param
        ) AS is_saved,
        pi.created_at
    FROM public.portfolio_items pi
    INNER JOIN public.provider_profiles pp ON pi.provider_id = pp.id
    INNER JOIN public.profiles p ON pp.id = p.id
    WHERE pi.is_visible = true
    AND (category_filter IS NULL OR pi.service_category = category_filter)
    ORDER BY 
        -- Featured items first
        pi.is_featured DESC,
        -- Then by distance (if location provided)
        CASE 
            WHEN customer_lat IS NOT NULL AND customer_lon IS NOT NULL 
                 AND pp.latitude IS NOT NULL AND pp.longitude IS NOT NULL
            THEN (
                6371 * acos(
                    cos(radians(customer_lat)) * cos(radians(pp.latitude)) *
                    cos(radians(pp.longitude) - radians(customer_lon)) +
                    sin(radians(customer_lat)) * sin(radians(pp.latitude))
                )
            )
            ELSE 999999
        END ASC,
        -- Then by engagement (likes + views)
        (pi.like_count + (pi.view_count / 10)) DESC,
        -- Finally by recency
        pi.created_at DESC
    LIMIT page_size
    OFFSET page_num * page_size;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_personalized_feed IS 'Returns personalized feed sorted by proximity, engagement, and recency. Fixed to use double precision for distance_km.';

