-- Create function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL,
    lon1 DECIMAL,
    lat2 DECIMAL,
    lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    earth_radius DECIMAL := 6371; -- Earth's radius in kilometers
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    -- Convert degrees to radians
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    
    -- Haversine formula
    a := sin(dlat/2) * sin(dlat/2) + 
         cos(radians(lat1)) * cos(radians(lat2)) * 
         sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    
    RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to get personalized feed for a customer
CREATE OR REPLACE FUNCTION get_personalized_feed(
    customer_lat DECIMAL,
    customer_lon DECIMAL,
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
        (pi.like_count + (pi.view_count / 10)) DESC,
        -- Finally by recency
        pi.created_at DESC
    LIMIT page_size
    OFFSET page_num * page_size;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get trending portfolio items
CREATE OR REPLACE FUNCTION get_trending_portfolio(
    days_back INTEGER DEFAULT 7,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    portfolio_id UUID,
    provider_id UUID,
    provider_name TEXT,
    image_url TEXT,
    like_count INTEGER,
    view_count INTEGER,
    engagement_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pi.id AS portfolio_id,
        pp.id AS provider_id,
        pp.business_name AS provider_name,
        pi.image_url,
        pi.like_count,
        pi.view_count,
        -- Engagement score: likes * 10 + views, weighted by recency
        (pi.like_count * 10 + pi.view_count) * 
        (1 + (1 - EXTRACT(EPOCH FROM (NOW() - pi.created_at)) / (days_back * 86400))) AS engagement_score
    FROM public.portfolio_items pi
    INNER JOIN public.provider_profiles pp ON pi.provider_id = pp.id
    WHERE pi.is_visible = true
    AND pi.created_at >= NOW() - (days_back || ' days')::INTERVAL
    ORDER BY engagement_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comments
COMMENT ON FUNCTION calculate_distance IS 'Calculates distance in kilometers between two lat/lon points using Haversine formula';
COMMENT ON FUNCTION get_personalized_feed IS 'Returns personalized feed sorted by proximity, engagement, and recency';
COMMENT ON FUNCTION get_trending_portfolio IS 'Returns trending portfolio items based on engagement score';

