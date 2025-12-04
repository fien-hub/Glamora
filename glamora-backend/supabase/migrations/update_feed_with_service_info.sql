-- Update get_personalized_feed function to include service information
CREATE OR REPLACE FUNCTION get_personalized_feed(
    customer_lat DECIMAL,
    customer_lon DECIMAL,
    profile_id_param UUID DEFAULT NULL,
    category_filter TEXT DEFAULT NULL,
    page_num INTEGER DEFAULT 0,
    page_size INTEGER DEFAULT 10
)
RETURNS TABLE (
    portfolio_id UUID,
    provider_id UUID,
    provider_name TEXT,
    provider_avatar TEXT,
    provider_rating DECIMAL,
    provider_reviews INTEGER,
    provider_verified BOOLEAN,
    image_url TEXT,
    caption TEXT,
    tags TEXT[],
    like_count INTEGER,
    view_count INTEGER,
    distance_km DECIMAL,
    is_liked BOOLEAN,
    is_saved BOOLEAN,
    created_at TIMESTAMPTZ,
    provider_service_id UUID,
    service_name TEXT,
    service_price INTEGER
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
        pi.tags,
        pi.like_count,
        pi.view_count,
        CASE 
            WHEN customer_lat IS NOT NULL AND customer_lon IS NOT NULL 
                 AND pp.latitude IS NOT NULL AND pp.longitude IS NOT NULL
            THEN calculate_distance(customer_lat, customer_lon, pp.latitude, pp.longitude)
            ELSE NULL
        END AS distance_km,
        EXISTS(
            SELECT 1 FROM public.portfolio_likes pl 
            WHERE pl.portfolio_item_id = pi.id 
            AND pl.profile_id = profile_id_param
        ) AS is_liked,
        EXISTS(
            SELECT 1 FROM public.portfolio_saves ps 
            WHERE ps.portfolio_item_id = pi.id 
            AND ps.profile_id = profile_id_param
        ) AS is_saved,
        pi.created_at,
        pi.provider_service_id,
        CASE 
            WHEN ps_data.custom_service_name IS NOT NULL THEN ps_data.custom_service_name
            WHEN s.name IS NOT NULL THEN s.name
            ELSE NULL
        END AS service_name,
        ps_data.base_price AS service_price
    FROM public.portfolio_items pi
    INNER JOIN public.provider_profiles pp ON pi.provider_id = pp.id
    INNER JOIN public.profiles p ON pp.id = p.id
    LEFT JOIN public.provider_services ps_data ON pi.provider_service_id = ps_data.id
    LEFT JOIN public.services s ON ps_data.service_id = s.id
    WHERE pi.is_visible = true
    AND (category_filter IS NULL OR pi.service_category_id IN (
        SELECT id FROM public.service_categories WHERE name = category_filter
    ))
    ORDER BY 
        -- Featured items first
        pi.is_featured DESC,
        -- Then by distance (if location provided)
        CASE 
            WHEN customer_lat IS NOT NULL AND customer_lon IS NOT NULL 
                 AND pp.latitude IS NOT NULL AND pp.longitude IS NOT NULL
            THEN calculate_distance(customer_lat, customer_lon, pp.latitude, pp.longitude)
            ELSE 999999
        END ASC,
        -- Then by engagement (likes + views)
        (pi.like_count * 2 + pi.view_count) DESC,
        -- Finally by recency
        pi.created_at DESC
    LIMIT page_size
    OFFSET page_num * page_size;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update get_trending_posts function to include service information
CREATE OR REPLACE FUNCTION get_trending_posts(
    profile_id_param UUID DEFAULT NULL,
    page_num INTEGER DEFAULT 0,
    page_size INTEGER DEFAULT 10
)
RETURNS TABLE (
    portfolio_id UUID,
    provider_id UUID,
    provider_name TEXT,
    provider_avatar TEXT,
    provider_rating DECIMAL,
    provider_reviews INTEGER,
    provider_verified BOOLEAN,
    image_url TEXT,
    caption TEXT,
    tags TEXT[],
    like_count INTEGER,
    view_count INTEGER,
    engagement_score DECIMAL,
    is_liked BOOLEAN,
    is_saved BOOLEAN,
    created_at TIMESTAMPTZ,
    provider_service_id UUID,
    service_name TEXT,
    service_price INTEGER
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
        pi.tags,
        pi.like_count,
        pi.view_count,
        -- Calculate engagement score (likes worth 3x views)
        (pi.like_count * 3.0 + pi.view_count * 1.0) AS engagement_score,
        EXISTS(
            SELECT 1 FROM public.portfolio_likes pl 
            WHERE pl.portfolio_item_id = pi.id 
            AND pl.profile_id = profile_id_param
        ) AS is_liked,
        EXISTS(
            SELECT 1 FROM public.portfolio_saves ps 
            WHERE ps.portfolio_item_id = pi.id 
            AND ps.profile_id = profile_id_param
        ) AS is_saved,
        pi.created_at,
        pi.provider_service_id,
        CASE 
            WHEN ps_data.custom_service_name IS NOT NULL THEN ps_data.custom_service_name
            WHEN s.name IS NOT NULL THEN s.name
            ELSE NULL
        END AS service_name,
        ps_data.base_price AS service_price
    FROM public.portfolio_items pi
    INNER JOIN public.provider_profiles pp ON pi.provider_id = pp.id
    INNER JOIN public.profiles p ON pp.id = p.id
    LEFT JOIN public.provider_services ps_data ON pi.provider_service_id = ps_data.id
    LEFT JOIN public.services s ON ps_data.service_id = s.id
    WHERE pi.is_visible = true
    AND pi.created_at >= NOW() - INTERVAL '30 days'
    ORDER BY 
        engagement_score DESC,
        pi.created_at DESC
    LIMIT page_size
    OFFSET page_num * page_size;
END;
$$ LANGUAGE plpgsql STABLE;

