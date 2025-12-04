# 🚀 Quick Start - Testing Custom Service System

## Step 1: Deploy Migrations (If Not Already Done)

### Option A: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your Glamora project

2. **Go to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "+ New Query"

3. **Run Each Migration in Order:**

   **Migration 1: Core Approval System**
   - Open file: `supabase/migrations/add_custom_service_approval.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)
   - Wait for success message

   **Migration 2: Notifications**
   - Open file: `supabase/migrations/add_custom_service_notifications.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run"

   **Migration 3: Analytics Views**
   - Open file: `supabase/migrations/add_custom_service_analytics_views.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run"

   **Migration 4: Email Notifications (Optional - requires Edge Function)**
   - Open file: `supabase/migrations/add_email_notifications.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run"

---

## Step 2: Verify Migrations

1. **In Supabase SQL Editor, run:**
   - Open file: `TEST_CUSTOM_SERVICE_SYSTEM.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run"

2. **Check the output:**
   - Look for ✅ checkmarks (means component exists)
   - Look for ❌ crosses (means component missing)
   - If you see ❌, run the corresponding migration

---

## Step 3: Test Mobile App

### 3.1 Start the App

```bash
cd glamora-app
npm start
```

### 3.2 Test Notification Bell

1. Login as a provider
2. Look at top-right corner of any screen
3. You should see a bell icon 🔔

### 3.3 Create Test Notification

In Supabase SQL Editor, run:

```sql
-- First, get your provider user ID
SELECT id, email, role FROM profiles WHERE role = 'provider' LIMIT 1;

-- Then create a test notification (replace YOUR_PROVIDER_ID)
INSERT INTO notifications (user_id, type, title, message, data)
VALUES (
  'YOUR_PROVIDER_ID',  -- Replace with ID from above
  'custom_service_approved',
  'Test Notification 🎉',
  'This is a test to verify notifications are working!',
  '{"test": true}'::jsonb
);
```

### 3.4 Verify Real-Time Update

- Bell should show red badge with "1"
- Tap bell to open notifications
- You should see the test notification
- Tap notification to mark as read
- Badge should disappear

---

## Step 4: Test Custom Service Flow

### 4.1 Add Custom Service

1. In app, go to Provider Onboarding (or Services screen)
2. Go to Step 2: "Select Your Services"
3. Scroll down to see "Can't find your service? Add a custom one below"
4. Tap "Add Custom Service" button
5. Fill in:
   - Name: "Test Lash Lift"
   - Price: 45
   - Duration: 60
   - Description: "Test service"
6. Tap "Add Service"

### 4.2 Verify Pending Status

- Service should appear with yellow "Pending Review" badge
- Should show message: "Will be reviewed before appearing in search"

### 4.3 Check Database

In Supabase SQL Editor:

```sql
-- View your custom service
SELECT 
  id,
  custom_service_name,
  price,
  duration,
  custom_service_status,
  created_at
FROM provider_services
WHERE is_custom = true
ORDER BY created_at DESC
LIMIT 1;
```

Copy the `id` for next steps!

---

## Step 5: Test Admin Approval

### 5.1 Open Admin Dashboard

```bash
cd glamora-admin-dashboard
open index.html
```

### 5.2 Test Mock Functionality

- Click "Approve" on a service → Should show toast and remove card
- Click "Reject" on a service → Should show modal for reason
- Enter reason and submit → Should show toast and remove card

### 5.3 Test Real Approval (via SQL)

In Supabase SQL Editor:

```sql
-- Approve the service (replace with your service ID from Step 4.3)
SELECT approve_custom_service('YOUR_SERVICE_ID_HERE');

-- Verify it worked
SELECT 
  custom_service_status,
  reviewed_at,
  custom_service_name
FROM provider_services
WHERE id = 'YOUR_SERVICE_ID_HERE';
```

### 5.4 Check Notification Received

- Go back to mobile app
- Bell should show badge "1"
- Tap bell
- Should see "Custom Service Approved! 🎉"
- Should show your service name

---

## Step 6: Test Rejection

### 6.1 Add Another Custom Service

Repeat Step 4.1 with different service name

### 6.2 Reject It

In Supabase SQL Editor:

```sql
-- Get the new service ID
SELECT id, custom_service_name 
FROM provider_services 
WHERE is_custom = true 
AND custom_service_status = 'pending'
ORDER BY created_at DESC 
LIMIT 1;

-- Reject it (replace with service ID)
SELECT reject_custom_service(
  'YOUR_SERVICE_ID_HERE',
  'This is a test rejection to verify the system works'
);
```

### 6.3 Check Notification

- Bell should show badge
- Open notifications
- Should see rejection message with reason

---

## Step 7: Test Analytics

In Supabase SQL Editor, run:

```sql
-- Overall stats
SELECT * FROM custom_service_stats_overall;

-- Pending count
SELECT * FROM pending_custom_services_count;

-- Most common services
SELECT * FROM most_common_custom_services LIMIT 5;

-- Recent rejections
SELECT * FROM custom_service_rejection_reasons LIMIT 5;

-- Provider activity
SELECT * FROM provider_custom_service_activity LIMIT 5;

-- Review times
SELECT * FROM custom_service_review_times LIMIT 5;
```

---

## ✅ Testing Checklist

After completing all steps, verify:

- [ ] Migrations deployed successfully
- [ ] Notification bell visible in app
- [ ] Test notification received in real-time
- [ ] Custom service can be added
- [ ] "Pending Review" badge shows
- [ ] Admin dashboard loads
- [ ] Approval creates notification
- [ ] Rejection creates notification
- [ ] Analytics views return data
- [ ] Service status updates correctly

---

## 🐛 Troubleshooting

### Migrations fail with "already exists" error
- This is OK! It means the migration already ran
- Skip to next migration

### Notification bell not visible
- Check that CurvedHeader.tsx was modified
- Restart the app
- Check console for errors

### No real-time notification update
- Check Supabase Realtime is enabled
- Go to Database → Replication
- Enable replication for `notifications` table

### Admin dashboard doesn't load
- Check browser console for errors
- Make sure all files (HTML, CSS, JS) are in same folder
- Try opening in different browser

### Analytics views return empty
- This is normal if no custom services exist yet
- Add test data using Step 4

---

## 📞 Need Help?

Check these files for detailed information:
- `TESTING_GUIDE.md` - Complete testing guide
- `CUSTOM_SERVICE_SYSTEM_COMPLETE_SUMMARY.md` - System overview
- `EMAIL_NOTIFICATIONS_SETUP_GUIDE.md` - Email setup
- `DEPLOYMENT_INSTRUCTIONS.md` - Deployment help

---

**Ready to test? Start with Step 1!** 🚀

