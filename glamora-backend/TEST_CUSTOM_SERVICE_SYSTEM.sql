-- ============================================================================
-- CUSTOM SERVICE SYSTEM - COMPLETE TEST & VERIFICATION SCRIPT
-- ============================================================================
-- This script will:
-- 1. Check if migrations are already deployed
-- 2. Provide verification queries
-- 3. Create test data
-- 4. Test all functionality
-- ============================================================================

-- ============================================================================
-- PART 1: VERIFICATION - Check if migrations are deployed
-- ============================================================================

-- Check 1: Does custom_service_status enum exist?
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'custom_service_status') THEN
        RAISE NOTICE '✅ custom_service_status enum exists';
    ELSE
        RAISE NOTICE '❌ custom_service_status enum NOT found - Run add_custom_service_approval.sql';
    END IF;
END $$;

-- Check 2: Do the new columns exist in provider_services?
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'provider_services' 
        AND column_name = 'custom_service_status'
    ) THEN
        RAISE NOTICE '✅ custom_service_status column exists';
    ELSE
        RAISE NOTICE '❌ custom_service_status column NOT found - Run add_custom_service_approval.sql';
    END IF;
END $$;

-- Check 3: Do the functions exist?
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'approve_custom_service'
    ) THEN
        RAISE NOTICE '✅ approve_custom_service function exists';
    ELSE
        RAISE NOTICE '❌ approve_custom_service function NOT found - Run add_custom_service_approval.sql';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'reject_custom_service'
    ) THEN
        RAISE NOTICE '✅ reject_custom_service function exists';
    ELSE
        RAISE NOTICE '❌ reject_custom_service function NOT found - Run add_custom_service_approval.sql';
    END IF;
END $$;

-- Check 4: Does notifications table exist?
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications'
    ) THEN
        RAISE NOTICE '✅ notifications table exists';
    ELSE
        RAISE NOTICE '❌ notifications table NOT found - Run add_custom_service_notifications.sql';
    END IF;
END $$;

-- Check 5: Does custom_service_analytics table exist?
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_service_analytics'
    ) THEN
        RAISE NOTICE '✅ custom_service_analytics table exists';
    ELSE
        RAISE NOTICE '❌ custom_service_analytics table NOT found - Run add_custom_service_notifications.sql';
    END IF;
END $$;

-- Check 6: Do analytics views exist?
DO $$
DECLARE
    view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views 
    WHERE table_name LIKE '%custom_service%';
    
    IF view_count >= 10 THEN
        RAISE NOTICE '✅ Analytics views exist (% views found)', view_count;
    ELSE
        RAISE NOTICE '❌ Analytics views incomplete (% views found, expected 10+) - Run add_custom_service_analytics_views.sql', view_count;
    END IF;
END $$;

-- ============================================================================
-- PART 2: DETAILED VERIFICATION QUERIES
-- ============================================================================

-- List all custom service related tables
SELECT 
    '📊 Tables' as category,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name IN ('provider_services', 'notifications', 'custom_service_analytics')
ORDER BY table_name;

-- List all custom service related views
SELECT 
    '📈 Analytics Views' as category,
    table_name as view_name
FROM information_schema.views 
WHERE table_name LIKE '%custom_service%'
ORDER BY table_name;

-- List all custom service related functions
SELECT 
    '⚙️ Functions' as category,
    routine_name as function_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%custom_service%'
ORDER BY routine_name;

-- Check provider_services columns
SELECT 
    '📋 provider_services Columns' as category,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'provider_services' 
AND column_name IN (
    'is_custom',
    'custom_service_name',
    'custom_service_status',
    'rejection_reason',
    'reviewed_at',
    'reviewed_by'
)
ORDER BY column_name;

-- ============================================================================
-- PART 3: TEST DATA CREATION
-- ============================================================================

-- Note: Replace 'YOUR_PROVIDER_ID' with an actual provider user ID from your database
-- To find a provider ID, run: SELECT id, email FROM profiles WHERE role = 'provider' LIMIT 1;

-- Create a test custom service (UNCOMMENT AND REPLACE YOUR_PROVIDER_ID)
/*
INSERT INTO provider_services (
    provider_id,
    custom_service_name,
    price,
    duration,
    is_custom,
    custom_service_status
)
VALUES (
    'YOUR_PROVIDER_ID',  -- Replace with actual provider ID
    'Test Lash Lift & Tint',
    55.00,
    75,
    true,
    'pending'
)
RETURNING id, custom_service_name, custom_service_status;
*/

-- ============================================================================
-- PART 4: QUERY CURRENT STATE
-- ============================================================================

-- Count custom services by status
SELECT 
    '📊 Custom Services by Status' as report,
    custom_service_status,
    COUNT(*) as count
FROM provider_services
WHERE is_custom = true
GROUP BY custom_service_status
ORDER BY custom_service_status;

-- List all pending custom services
SELECT 
    '⏳ Pending Custom Services' as report,
    ps.id,
    ps.custom_service_name,
    ps.price,
    ps.duration,
    p.business_name as provider_name,
    p.email as provider_email,
    ps.created_at
FROM provider_services ps
JOIN profiles p ON ps.provider_id = p.id
WHERE ps.is_custom = true 
AND ps.custom_service_status = 'pending'
ORDER BY ps.created_at DESC;

-- List recent notifications
SELECT 
    '🔔 Recent Notifications' as report,
    n.id,
    n.type,
    n.title,
    n.message,
    n.is_read,
    n.created_at,
    p.email as recipient_email
FROM notifications n
JOIN profiles p ON n.user_id = p.id
WHERE n.type IN ('custom_service_approved', 'custom_service_rejected')
ORDER BY n.created_at DESC
LIMIT 10;

-- List recent analytics events
SELECT 
    '📈 Recent Analytics Events' as report,
    csa.id,
    csa.custom_service_name,
    csa.event_type,
    csa.created_at,
    p.email as provider_email
FROM custom_service_analytics csa
JOIN profiles p ON csa.provider_id = p.id
ORDER BY csa.created_at DESC
LIMIT 10;

-- ============================================================================
-- PART 5: TEST ANALYTICS VIEWS
-- ============================================================================

-- Test all analytics views
SELECT '📊 Overall Stats' as view_name, * FROM custom_service_stats_overall;

SELECT '📅 Pending Count' as view_name, * FROM pending_custom_services_count;

SELECT '🔝 Most Common Services' as view_name, * FROM most_common_custom_services LIMIT 5;

-- ============================================================================
-- PART 6: INSTRUCTIONS FOR MANUAL TESTING
-- ============================================================================

/*
🧪 MANUAL TESTING STEPS:

1. CREATE TEST CUSTOM SERVICE:
   - Uncomment the INSERT statement in PART 3
   - Replace 'YOUR_PROVIDER_ID' with actual provider ID
   - Run the INSERT statement
   - Note the returned service ID

2. TEST APPROVAL:
   SELECT approve_custom_service('SERVICE_ID_HERE');
   
   Then verify:
   - Service status changed to 'approved'
   - Notification created
   - Analytics event recorded

3. TEST REJECTION:
   SELECT reject_custom_service('SERVICE_ID_HERE', 'This is a test rejection reason');
   
   Then verify:
   - Service status changed to 'rejected'
   - Rejection reason saved
   - Notification created
   - Analytics event recorded

4. CHECK NOTIFICATIONS:
   SELECT * FROM notifications WHERE type LIKE 'custom_service%' ORDER BY created_at DESC;

5. CHECK ANALYTICS:
   SELECT * FROM custom_service_analytics ORDER BY created_at DESC;

6. TEST ANALYTICS VIEWS:
   Run all the SELECT statements from PART 5 above
*/

-- ============================================================================
-- END OF TEST SCRIPT
-- ============================================================================

