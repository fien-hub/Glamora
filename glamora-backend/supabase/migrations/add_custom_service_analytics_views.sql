-- =====================================================
-- CUSTOM SERVICE ANALYTICS VIEWS
-- =====================================================
-- Pre-built views for common analytics queries
-- =====================================================

-- View: Custom Service Submission Stats (Overall)
CREATE OR REPLACE VIEW public.custom_service_stats_overall AS
SELECT 
    COUNT(*) FILTER (WHERE event_type = 'submitted') as total_submitted,
    COUNT(*) FILTER (WHERE event_type = 'approved') as total_approved,
    COUNT(*) FILTER (WHERE event_type = 'rejected') as total_rejected,
    ROUND(
        COUNT(*) FILTER (WHERE event_type = 'approved')::NUMERIC / 
        NULLIF(COUNT(*) FILTER (WHERE event_type = 'submitted'), 0) * 100, 
        2
    ) as approval_rate_percent,
    ROUND(
        COUNT(*) FILTER (WHERE event_type = 'rejected')::NUMERIC / 
        NULLIF(COUNT(*) FILTER (WHERE event_type = 'submitted'), 0) * 100, 
        2
    ) as rejection_rate_percent
FROM public.custom_service_analytics;

-- View: Custom Service Stats by Date (Last 30 days)
CREATE OR REPLACE VIEW public.custom_service_stats_by_date AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE event_type = 'submitted') as submitted,
    COUNT(*) FILTER (WHERE event_type = 'approved') as approved,
    COUNT(*) FILTER (WHERE event_type = 'rejected') as rejected
FROM public.custom_service_analytics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View: Most Common Custom Services
CREATE OR REPLACE VIEW public.most_common_custom_services AS
SELECT 
    custom_service_name,
    COUNT(*) as submission_count,
    COUNT(*) FILTER (WHERE event_type = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE event_type = 'rejected') as rejected_count,
    MAX(created_at) as last_submitted
FROM public.custom_service_analytics
WHERE event_type = 'submitted'
GROUP BY custom_service_name
HAVING COUNT(*) >= 2  -- Only show services submitted by multiple providers
ORDER BY submission_count DESC
LIMIT 50;

-- View: Custom Service Rejection Reasons
CREATE OR REPLACE VIEW public.custom_service_rejection_reasons AS
SELECT 
    csa.custom_service_name,
    ps.custom_service_rejection_reason as rejection_reason,
    csa.created_at as rejected_at,
    p.full_name as provider_name,
    pp.business_name
FROM public.custom_service_analytics csa
JOIN public.provider_services ps ON csa.service_id = ps.id
JOIN public.profiles p ON csa.provider_id = p.id
JOIN public.provider_profiles pp ON csa.provider_id = pp.id
WHERE csa.event_type = 'rejected'
ORDER BY csa.created_at DESC
LIMIT 100;

-- View: Provider Custom Service Activity
CREATE OR REPLACE VIEW public.provider_custom_service_activity AS
SELECT 
    csa.provider_id,
    p.full_name as provider_name,
    pp.business_name,
    COUNT(*) FILTER (WHERE csa.event_type = 'submitted') as total_submitted,
    COUNT(*) FILTER (WHERE csa.event_type = 'approved') as total_approved,
    COUNT(*) FILTER (WHERE csa.event_type = 'rejected') as total_rejected,
    MAX(csa.created_at) as last_submission_date
FROM public.custom_service_analytics csa
JOIN public.profiles p ON csa.provider_id = p.id
JOIN public.provider_profiles pp ON csa.provider_id = pp.id
GROUP BY csa.provider_id, p.full_name, pp.business_name
ORDER BY total_submitted DESC;

-- View: Average Review Time
CREATE OR REPLACE VIEW public.custom_service_review_times AS
SELECT 
    AVG(
        EXTRACT(EPOCH FROM (ps.custom_service_reviewed_at - ps.created_at)) / 3600
    ) as avg_review_hours,
    MIN(
        EXTRACT(EPOCH FROM (ps.custom_service_reviewed_at - ps.created_at)) / 3600
    ) as min_review_hours,
    MAX(
        EXTRACT(EPOCH FROM (ps.custom_service_reviewed_at - ps.created_at)) / 3600
    ) as max_review_hours,
    COUNT(*) as total_reviewed
FROM public.provider_services ps
WHERE ps.custom_service_name IS NOT NULL
  AND ps.custom_service_reviewed_at IS NOT NULL
  AND ps.custom_service_status IN ('approved', 'rejected');

-- View: Pending Custom Services Count
CREATE OR REPLACE VIEW public.pending_custom_services_count AS
SELECT 
    COUNT(*) as pending_count,
    MIN(created_at) as oldest_pending_date,
    MAX(created_at) as newest_pending_date
FROM public.provider_services
WHERE custom_service_name IS NOT NULL
  AND custom_service_status = 'pending';

-- View: Custom Service Trends (Weekly)
CREATE OR REPLACE VIEW public.custom_service_trends_weekly AS
SELECT 
    DATE_TRUNC('week', created_at) as week_start,
    COUNT(*) FILTER (WHERE event_type = 'submitted') as submitted,
    COUNT(*) FILTER (WHERE event_type = 'approved') as approved,
    COUNT(*) FILTER (WHERE event_type = 'rejected') as rejected,
    ROUND(
        COUNT(*) FILTER (WHERE event_type = 'approved')::NUMERIC / 
        NULLIF(COUNT(*) FILTER (WHERE event_type = 'submitted'), 0) * 100, 
        2
    ) as approval_rate_percent
FROM public.custom_service_analytics
WHERE created_at >= NOW() - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week_start DESC;

-- View: Custom Service Trends (Monthly)
CREATE OR REPLACE VIEW public.custom_service_trends_monthly AS
SELECT 
    DATE_TRUNC('month', created_at) as month_start,
    COUNT(*) FILTER (WHERE event_type = 'submitted') as submitted,
    COUNT(*) FILTER (WHERE event_type = 'approved') as approved,
    COUNT(*) FILTER (WHERE event_type = 'rejected') as rejected,
    ROUND(
        COUNT(*) FILTER (WHERE event_type = 'approved')::NUMERIC / 
        NULLIF(COUNT(*) FILTER (WHERE event_type = 'submitted'), 0) * 100, 
        2
    ) as approval_rate_percent
FROM public.custom_service_analytics
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month_start DESC;

-- View: Services That Should Be Added to Platform
-- (Custom services that have been approved multiple times)
CREATE OR REPLACE VIEW public.services_to_add_to_platform AS
SELECT 
    custom_service_name,
    COUNT(DISTINCT provider_id) as unique_providers,
    COUNT(*) as times_approved,
    AVG((event_data->>'base_price')::NUMERIC) as avg_price,
    AVG((event_data->>'duration_minutes')::INTEGER) as avg_duration,
    MAX(created_at) as last_approved
FROM public.custom_service_analytics
WHERE event_type = 'approved'
GROUP BY custom_service_name
HAVING COUNT(DISTINCT provider_id) >= 3  -- At least 3 different providers
ORDER BY unique_providers DESC, times_approved DESC;

-- Grant SELECT permissions on views to authenticated users with admin role
GRANT SELECT ON public.custom_service_stats_overall TO authenticated;
GRANT SELECT ON public.custom_service_stats_by_date TO authenticated;
GRANT SELECT ON public.most_common_custom_services TO authenticated;
GRANT SELECT ON public.custom_service_rejection_reasons TO authenticated;
GRANT SELECT ON public.provider_custom_service_activity TO authenticated;
GRANT SELECT ON public.custom_service_review_times TO authenticated;
GRANT SELECT ON public.pending_custom_services_count TO authenticated;
GRANT SELECT ON public.custom_service_trends_weekly TO authenticated;
GRANT SELECT ON public.custom_service_trends_monthly TO authenticated;
GRANT SELECT ON public.services_to_add_to_platform TO authenticated;

-- Add comments
COMMENT ON VIEW public.custom_service_stats_overall IS 
'Overall statistics for custom service submissions, approvals, and rejections';

COMMENT ON VIEW public.custom_service_stats_by_date IS 
'Daily statistics for custom services over the last 30 days';

COMMENT ON VIEW public.most_common_custom_services IS 
'Most frequently submitted custom services (submitted by 2+ providers)';

COMMENT ON VIEW public.custom_service_rejection_reasons IS 
'Recent custom service rejections with reasons';

COMMENT ON VIEW public.provider_custom_service_activity IS 
'Provider-level custom service submission activity';

COMMENT ON VIEW public.custom_service_review_times IS 
'Average time taken to review custom services';

COMMENT ON VIEW public.pending_custom_services_count IS 
'Count of pending custom services awaiting review';

COMMENT ON VIEW public.custom_service_trends_weekly IS 
'Weekly trends for custom service submissions and approvals';

COMMENT ON VIEW public.custom_service_trends_monthly IS 
'Monthly trends for custom service submissions and approvals';

COMMENT ON VIEW public.services_to_add_to_platform IS 
'Custom services that should be considered for addition to the platform (approved by 3+ providers)';

