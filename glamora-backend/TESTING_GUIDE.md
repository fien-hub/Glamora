# 🧪 Custom Service System - Complete Testing Guide

## Overview

This guide will walk you through testing every component of the custom service system step by step.

---

## 📋 Pre-Testing Checklist

Before starting, ensure you have:
- [ ] Supabase project access
- [ ] Glamora mobile app running locally
- [ ] Admin access to your Supabase project
- [ ] Test provider account created
- [ ] Test customer account created (optional)

---

## 🚀 Test 1: Database Migrations

### **Goal:** Deploy and verify all database migrations

### **Steps:**

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your Glamora project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Run Migration 1: Core Approval System**
   ```sql
   -- Copy contents from: glamora-backend/supabase/migrations/add_custom_service_approval.sql
   -- Paste and click "Run"
   ```

4. **Verify Migration 1**
   ```sql
   -- Check if enum was created
   SELECT unnest(enum_range(NULL::custom_service_status));
   
   -- Check if columns were added
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'provider_services' 
   AND column_name IN ('custom_service_status', 'rejection_reason', 'reviewed_at', 'reviewed_by');
   
   -- Check if functions exist
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name IN ('approve_custom_service', 'reject_custom_service');
   ```

5. **Run Migration 2: Notifications**
   ```sql
   -- Copy contents from: glamora-backend/supabase/migrations/add_custom_service_notifications.sql
   -- Paste and click "Run"
   ```

6. **Verify Migration 2**
   ```sql
   -- Check if notifications table exists
   SELECT table_name FROM information_schema.tables WHERE table_name = 'notifications';
   
   -- Check if analytics table exists
   SELECT table_name FROM information_schema.tables WHERE table_name = 'custom_service_analytics';
   ```

7. **Run Migration 3: Analytics Views**
   ```sql
   -- Copy contents from: glamora-backend/supabase/migrations/add_custom_service_analytics_views.sql
   -- Paste and click "Run"
   ```

8. **Verify Migration 3**
   ```sql
   -- List all analytics views
   SELECT table_name 
   FROM information_schema.views 
   WHERE table_name LIKE 'custom_service%' OR table_name LIKE '%custom_service%';
   ```

### **Expected Results:**
- ✅ All migrations run without errors
- ✅ Enum type created
- ✅ Columns added to provider_services
- ✅ Functions created
- ✅ Tables created (notifications, custom_service_analytics)
- ✅ 10 analytics views created

### **Troubleshooting:**
- If error "type already exists": Migration already ran, skip it
- If error "column already exists": Migration already ran, skip it
- If error "permission denied": Ensure you're using service role key

---

## 🔔 Test 2: In-App Notifications

### **Goal:** Test notification bell and real-time updates

### **Steps:**

1. **Start the Mobile App**
   ```bash
   cd glamora-app
   npm start
   ```

2. **Login as Provider**
   - Open app in simulator/device
   - Login with provider account
   - Navigate to any screen

3. **Check Notification Bell**
   - Look at top-right corner of screen
   - You should see a bell icon
   - If no notifications, badge should not show

4. **Create Test Notification (via SQL)**
   ```sql
   -- In Supabase SQL Editor, run:
   INSERT INTO notifications (user_id, type, title, message, data)
   VALUES (
     'YOUR_PROVIDER_USER_ID',  -- Replace with your provider's user ID
     'custom_service_approved',
     'Test Notification',
     'This is a test notification to verify the bell is working',
     '{"test": true}'::jsonb
   );
   ```

5. **Verify Real-Time Update**
   - Bell should show badge with "1"
   - Badge should be red/coral color
   - No need to refresh app

6. **Open Notifications**
   - Tap the notification bell
   - Modal should open
   - Test notification should appear
   - Should show "Test Notification" title
   - Should show time (e.g., "just now")

7. **Mark as Read**
   - Tap on the notification
   - Notification should be marked as read
   - Badge count should decrease
   - Close modal

8. **Verify Badge Updated**
   - Bell badge should now show "0" or disappear

### **Expected Results:**
- ✅ Bell icon visible on all screens
- ✅ Badge appears when notification created
- ✅ Real-time update (no refresh needed)
- ✅ Modal opens when bell tapped
- ✅ Notifications display correctly
- ✅ Mark as read works
- ✅ Badge count updates

### **Troubleshooting:**
- If bell not visible: Check CurvedHeader.tsx import
- If no real-time update: Check Supabase realtime is enabled
- If modal doesn't open: Check console for errors

---

## 🎨 Test 3: Provider Custom Service Flow

### **Goal:** Test complete provider experience

### **Steps:**

1. **Navigate to Provider Onboarding**
   - In app, go to Provider Onboarding
   - Or if already onboarded, go to Services screen

2. **Go to Service Selection (Step 2)**
   - You should see "Select Your Services" screen
   - Search bar at top
   - Service categories below

3. **Check Guidance Text**
   - Look for text: "Can't find your service? Add a custom one below"
   - Should be above the "Add Custom Service" button

4. **Check Add Custom Service Button**
   - Button should have dashed border
   - Should have "+" icon
   - Should say "Add Custom Service"
   - Should have notice: "Custom services will be reviewed..."

5. **Add Custom Service**
   - Tap "Add Custom Service" button
   - Modal should open
   - Fill in:
     - Service Name: "Test Lash Lift"
     - Price: 45
     - Duration: 60
     - Description: "This is a test custom service"
   - Tap "Add Service"

6. **Verify Pending Badge**
   - Service should appear in "Your Services" list
   - Should have yellow "Pending Review" badge
   - Should show message: "Will be reviewed before appearing in search"

7. **Check Database**
   ```sql
   -- In Supabase SQL Editor:
   SELECT 
     id,
     custom_service_name,
     price,
     duration,
     is_custom,
     custom_service_status
   FROM provider_services
   WHERE is_custom = true
   ORDER BY created_at DESC
   LIMIT 1;
   ```

### **Expected Results:**
- ✅ Guidance text visible
- ✅ Button styled correctly
- ✅ Modal opens
- ✅ Service added successfully
- ✅ "Pending Review" badge shows
- ✅ Status message displays
- ✅ Database record created with status = 'pending'

### **Troubleshooting:**
- If button not visible: Check ProviderOnboardingScreen.tsx
- If modal doesn't open: Check console for errors
- If service not added: Check database connection

---

## 🖥️ Test 4: Web Admin Dashboard

### **Goal:** Test admin review interface

### **Steps:**

1. **Open Admin Dashboard**
   ```bash
   cd glamora-admin-dashboard
   open index.html
   ```

2. **Check Dashboard Layout**
   - Sidebar on left with 8 menu items
   - Header with "Admin Dashboard" title
   - 4 stats cards (Pending, Approved, Rejected, Avg Review Time)
   - Pending services section below

3. **Check Mock Data**
   - Should see 3 sample services
   - Each card shows: service name, provider, price, duration, description
   - Each has "Approve" and "Reject" buttons

4. **Test Approve Flow**
   - Click "Approve" on first service
   - Confirmation should appear
   - Click "Confirm"
   - Toast notification: "Service approved successfully"
   - Card should disappear
   - Pending count should decrease

5. **Test Reject Flow**
   - Click "Reject" on second service
   - Modal should open asking for reason
   - Enter: "This is not a beauty service"
   - Click "Submit"
   - Toast notification: "Service rejected"
   - Card should disappear
   - Pending count should decrease

6. **Test Filtering (Mock)**
   - Try changing category filter
   - Try changing sort order
   - Note: These are placeholders in mock version

### **Expected Results:**
- ✅ Dashboard loads correctly
- ✅ Layout is clean and professional
- ✅ Stats cards display
- ✅ Service cards display
- ✅ Approve button works
- ✅ Reject modal opens
- ✅ Toast notifications show
- ✅ Cards animate out
- ✅ Counts update

### **Troubleshooting:**
- If dashboard doesn't load: Check browser console
- If buttons don't work: Check script.js is loaded
- If styles broken: Check styles.css is loaded

---

## 📧 Test 5: Email Notifications (Setup Required)

### **Goal:** Set up and test email sending

### **Prerequisites:**
- Resend account created
- API key obtained
- Edge Function deployed

### **Steps:**

1. **Create Resend Account**
   - Go to https://resend.com
   - Sign up for free account
   - Verify email
   - Go to API Keys
   - Create new API key
   - Copy the key (starts with `re_`)

2. **Deploy Edge Function**
   ```bash
   cd glamora-backend
   
   # Login to Supabase
   supabase login
   
   # Link project
   supabase link --project-ref YOUR_PROJECT_REF
   
   # Set Resend API key
   supabase secrets set RESEND_API_KEY=re_your_api_key_here
   
   # Deploy function
   supabase functions deploy send-custom-service-email
   ```

3. **Enable pg_net Extension**
   ```sql
   -- In Supabase SQL Editor:
   CREATE EXTENSION IF NOT EXISTS pg_net;
   ```

4. **Set Configuration**
   ```sql
   -- Replace with your values:
   ALTER DATABASE postgres SET app.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
   ALTER DATABASE postgres SET app.supabase_service_role_key = 'YOUR_SERVICE_ROLE_KEY';
   ```

5. **Run Email Migration**
   ```sql
   -- Copy contents from: glamora-backend/supabase/migrations/add_email_notifications.sql
   -- Paste and click "Run"
   ```

6. **Test Approval Email**
   ```sql
   -- Get a pending service ID
   SELECT id, custom_service_name FROM provider_services WHERE custom_service_status = 'pending' LIMIT 1;
   
   -- Approve it (replace SERVICE_ID)
   SELECT approve_custom_service('SERVICE_ID_HERE');
   ```

7. **Check Results**
   - Check provider's email inbox
   - Should receive approval email
   - Email should have Glamora branding
   - Should show service details
   - Should have "View in App" button

8. **Test Rejection Email**
   ```sql
   -- Get another pending service
   SELECT id, custom_service_name FROM provider_services WHERE custom_service_status = 'pending' LIMIT 1;
   
   -- Reject it
   SELECT reject_custom_service('SERVICE_ID_HERE', 'This is a test rejection');
   ```

9. **Check Rejection Email**
   - Check provider's email inbox
   - Should receive rejection email
   - Should show rejection reason
   - Should have helpful guidance

### **Expected Results:**
- ✅ Edge Function deployed successfully
- ✅ Approval email received
- ✅ Email has correct branding
- ✅ Service details included
- ✅ Rejection email received
- ✅ Rejection reason included
- ✅ Both in-app and email notifications sent

### **Troubleshooting:**
- If function fails to deploy: Check Supabase CLI version
- If email not sent: Check Edge Function logs
- If email in spam: Add domain to Resend
- If wrong email content: Check template in Edge Function

---

## 📊 Test 6: Analytics Views

### **Goal:** Verify all analytics views work

### **Steps:**

Run each query in Supabase SQL Editor:

```sql
-- 1. Overall Stats
SELECT * FROM custom_service_stats_overall;

-- 2. Stats by Date (last 30 days)
SELECT * FROM custom_service_stats_by_date ORDER BY date DESC LIMIT 10;

-- 3. Most Common Custom Services
SELECT * FROM most_common_custom_services LIMIT 10;

-- 4. Recent Rejection Reasons
SELECT * FROM custom_service_rejection_reasons LIMIT 10;

-- 5. Provider Activity
SELECT * FROM provider_custom_service_activity LIMIT 10;

-- 6. Review Times
SELECT * FROM custom_service_review_times LIMIT 10;

-- 7. Pending Count
SELECT * FROM pending_custom_services_count;

-- 8. Weekly Trends
SELECT * FROM custom_service_trends_weekly ORDER BY week_start DESC LIMIT 10;

-- 9. Monthly Trends
SELECT * FROM custom_service_trends_monthly ORDER BY month_start DESC LIMIT 10;

-- 10. Services to Add to Platform
SELECT * FROM services_to_add_to_platform LIMIT 10;
```

### **Expected Results:**
- ✅ All queries run without errors
- ✅ Data returned (may be empty if no custom services yet)
- ✅ Columns match expected structure
- ✅ Calculations are correct

---

## ✅ Complete System Test

### **End-to-End Flow:**

1. **Provider adds custom service** → Pending badge shows
2. **Notification bell** → No notification yet
3. **Admin approves service** → Database updated
4. **Provider receives notification** → Bell badge shows "1"
5. **Provider receives email** → Inbox has approval email
6. **Provider opens notification** → Sees approval message
7. **Service becomes active** → Visible in search
8. **Analytics updated** → Views show new data

---

## 📝 Testing Checklist

- [ ] All migrations deployed
- [ ] Notification bell visible
- [ ] Real-time notifications work
- [ ] Custom service can be added
- [ ] Pending badge shows
- [ ] Admin dashboard loads
- [ ] Approve function works
- [ ] Reject function works
- [ ] Email notifications sent
- [ ] Analytics views work
- [ ] End-to-end flow complete

---

**Once all tests pass, the system is ready for production!** 🚀✨

