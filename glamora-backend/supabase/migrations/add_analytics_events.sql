-- Create analytics_events table for tracking user engagement
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    properties JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_timestamp ON analytics_events(event_type, timestamp);

-- Enable Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow anyone to insert events (for anonymous tracking)
CREATE POLICY "Anyone can insert analytics events"
    ON analytics_events
    FOR INSERT
    WITH CHECK (true);

-- Only authenticated users can view their own events
CREATE POLICY "Users can view their own analytics events"
    ON analytics_events
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all events (add admin role check if needed)
CREATE POLICY "Service role can view all analytics events"
    ON analytics_events
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Create function to get engagement metrics
CREATE OR REPLACE FUNCTION get_engagement_metrics(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    event_type TEXT,
    event_count BIGINT,
    unique_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.event_type,
        COUNT(*) AS event_count,
        COUNT(DISTINCT ae.user_id) AS unique_users
    FROM analytics_events ae
    WHERE ae.timestamp BETWEEN start_date AND end_date
    GROUP BY ae.event_type
    ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get provider engagement metrics
CREATE OR REPLACE FUNCTION get_provider_engagement(
    provider_id_param UUID,
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    total_views BIGINT,
    total_likes BIGINT,
    total_saves BIGINT,
    unique_viewers BIGINT,
    engagement_rate DECIMAL
) AS $$
DECLARE
    views BIGINT;
    likes BIGINT;
    saves BIGINT;
    viewers BIGINT;
BEGIN
    -- Get views
    SELECT COUNT(*) INTO views
    FROM analytics_events
    WHERE event_type = 'post_view'
        AND properties->>'provider_id' = provider_id_param::TEXT
        AND timestamp BETWEEN start_date AND end_date;
    
    -- Get likes
    SELECT COUNT(*) INTO likes
    FROM analytics_events
    WHERE event_type = 'post_like'
        AND properties->>'provider_id' = provider_id_param::TEXT
        AND timestamp BETWEEN start_date AND end_date;
    
    -- Get saves
    SELECT COUNT(*) INTO saves
    FROM analytics_events
    WHERE event_type = 'post_save'
        AND properties->>'provider_id' = provider_id_param::TEXT
        AND timestamp BETWEEN start_date AND end_date;
    
    -- Get unique viewers
    SELECT COUNT(DISTINCT user_id) INTO viewers
    FROM analytics_events
    WHERE event_type = 'post_view'
        AND properties->>'provider_id' = provider_id_param::TEXT
        AND timestamp BETWEEN start_date AND end_date
        AND user_id IS NOT NULL;
    
    -- Calculate engagement rate (likes + saves) / views
    RETURN QUERY
    SELECT 
        views AS total_views,
        likes AS total_likes,
        saves AS total_saves,
        viewers AS unique_viewers,
        CASE 
            WHEN views > 0 THEN ROUND(((likes + saves)::DECIMAL / views::DECIMAL) * 100, 2)
            ELSE 0
        END AS engagement_rate;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get trending posts
CREATE OR REPLACE FUNCTION get_trending_posts(
    hours_back INTEGER DEFAULT 24,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    post_id UUID,
    provider_id UUID,
    view_count BIGINT,
    like_count BIGINT,
    save_count BIGINT,
    engagement_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH post_metrics AS (
        SELECT 
            (properties->>'post_id')::UUID AS post_id,
            (properties->>'provider_id')::UUID AS provider_id,
            COUNT(*) FILTER (WHERE event_type = 'post_view') AS views,
            COUNT(*) FILTER (WHERE event_type = 'post_like') AS likes,
            COUNT(*) FILTER (WHERE event_type = 'post_save') AS saves
        FROM analytics_events
        WHERE timestamp > NOW() - (hours_back || ' hours')::INTERVAL
            AND event_type IN ('post_view', 'post_like', 'post_save')
            AND properties->>'post_id' IS NOT NULL
        GROUP BY properties->>'post_id', properties->>'provider_id'
    )
    SELECT 
        pm.post_id,
        pm.provider_id,
        pm.views AS view_count,
        pm.likes AS like_count,
        pm.saves AS save_count,
        -- Engagement score: (likes * 3 + saves * 5 + views) / hours_back
        ROUND(((pm.likes * 3 + pm.saves * 5 + pm.views)::DECIMAL / hours_back::DECIMAL), 2) AS engagement_score
    FROM post_metrics pm
    ORDER BY engagement_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

