-- =====================================================
-- CREATE TEST NOTIFICATION
-- =====================================================
-- This script creates a test notification to verify the system works
-- =====================================================

-- Step 1: Find a provider user to send notification to
SELECT 
    '📋 Available Providers' as section,
    u.id as user_id,
    u.email,
    CONCAT(p.first_name, ' ', p.last_name) as name,
    pp.business_name
FROM users u
JOIN profiles p ON u.id = p.user_id
JOIN provider_profiles pp ON p.id = pp.id
WHERE u.role = 'provider'
LIMIT 5;

-- Step 2: Create a test notification
-- REPLACE 'YOUR_PROVIDER_USER_ID' with an actual user ID from above
/*
INSERT INTO notifications (user_id, type, title, message, data)
VALUES (
    'YOUR_PROVIDER_USER_ID',  -- Replace with actual provider user ID
    'custom_service_approved',
    '🎉 Test Notification',
    'This is a test notification to verify the notification bell is working correctly!',
    jsonb_build_object(
        'test', true,
        'timestamp', NOW()
    )
)
RETURNING 
    id,
    title,
    message,
    created_at,
    '✅ Notification created successfully!' as status;
*/

-- Step 3: Verify notification was created
-- Run this after creating the notification above
/*
SELECT 
    '🔔 Recent Notifications' as section,
    n.id,
    n.title,
    n.message,
    n.is_read,
    n.created_at,
    u.email as recipient_email
FROM notifications n
JOIN users u ON n.user_id = u.id
ORDER BY n.created_at DESC
LIMIT 5;
*/

-- Step 4: Check unread count for a user
-- REPLACE 'YOUR_PROVIDER_USER_ID' with the user ID
/*
SELECT 
    '📊 Unread Count' as section,
    COUNT(*) as unread_notifications
FROM notifications
WHERE user_id = 'YOUR_PROVIDER_USER_ID'
AND is_read = FALSE;
*/

-- =====================================================
-- QUICK TEST INSTRUCTIONS
-- =====================================================
/*
1. Run Step 1 to find a provider user ID
2. Copy the user_id from the results
3. Uncomment Step 2 and replace 'YOUR_PROVIDER_USER_ID' with the actual ID
4. Run Step 2 to create the test notification
5. Open the mobile app and check if the notification bell shows a badge
6. Tap the bell to see the notification
7. Tap the notification to mark it as read
8. Verify the badge disappears

Expected Results:
✅ Notification appears in database
✅ Bell shows badge with "1"
✅ Notification appears in modal
✅ Tapping notification marks it as read
✅ Badge disappears after marking as read
*/

