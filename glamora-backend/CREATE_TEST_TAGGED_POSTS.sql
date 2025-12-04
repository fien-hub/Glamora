-- Create Test Tagged Portfolio Posts
-- This script tags existing portfolio items with services for testing

-- First, let's see what we have
SELECT 
    pi.id as portfolio_item_id,
    pi.provider_id,
    pi.caption,
    ps.id as provider_service_id,
    s.name as service_name,
    ps.base_price
FROM portfolio_items pi
LEFT JOIN provider_services ps ON ps.provider_id = pi.provider_id AND ps.is_active = true
LEFT JOIN services s ON s.id = ps.service_id
WHERE pi.is_visible = true
LIMIT 10;

-- Tag the first 3 portfolio items with their provider's first service
WITH portfolio_with_service AS (
    SELECT DISTINCT ON (pi.id)
        pi.id as portfolio_item_id,
        ps.id as provider_service_id
    FROM portfolio_items pi
    INNER JOIN provider_services ps ON ps.provider_id = pi.provider_id AND ps.is_active = true
    WHERE pi.is_visible = true
    AND pi.provider_service_id IS NULL
    ORDER BY pi.id, ps.created_at
    LIMIT 3
)
UPDATE portfolio_items
SET provider_service_id = pws.provider_service_id
FROM portfolio_with_service pws
WHERE portfolio_items.id = pws.portfolio_item_id;

-- Verify the update
SELECT 
    pi.id,
    pi.caption,
    pi.provider_service_id,
    ps.custom_service_name,
    s.name as service_name,
    ps.base_price / 100.0 as price_dollars
FROM portfolio_items pi
LEFT JOIN provider_services ps ON ps.id = pi.provider_service_id
LEFT JOIN services s ON s.id = ps.service_id
WHERE pi.provider_service_id IS NOT NULL;

-- Check how many posts are now tagged
SELECT 
    COUNT(*) as total_posts,
    COUNT(provider_service_id) as tagged_posts,
    ROUND(COUNT(provider_service_id)::numeric / COUNT(*) * 100, 1) as tagged_percentage
FROM portfolio_items
WHERE is_visible = true;

