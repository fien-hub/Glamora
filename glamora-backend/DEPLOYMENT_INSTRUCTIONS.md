# 🚀 Custom Service System - Deployment Instructions

## Overview

This guide will walk you through deploying the custom service approval system, notifications, and analytics to your Supabase project.

---

## 📋 Prerequisites

- Access to your Supabase project dashboard
- Admin access to the database
- The migration files in `glamora-backend/supabase/migrations/`

---

## 🔧 Deployment Steps

### **Option 1: Using Supabase Dashboard (Recommended)**

#### **Step 1: Open Supabase SQL Editor**

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your **Glamora** project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

---

#### **Step 2: Run Migration 1 - Approval Workflow**

1. Open the file: `glamora-backend/supabase/migrations/add_custom_service_approval.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. ✅ Verify: You should see "Success. No rows returned"

**What this does:**
- Creates approval status enum
- Adds approval fields to `provider_services` table
- Creates `approve_custom_service()` function
- Creates `reject_custom_service()` function
- Sets up triggers and RLS policies

---

#### **Step 3: Run Migration 2 - Notifications System**

1. Open the file: `glamora-backend/supabase/migrations/add_custom_service_notifications.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run**
5. ✅ Verify: You should see "Success. No rows returned"

**What this does:**
- Creates `notifications` table
- Creates `custom_service_analytics` table
- Updates approve/reject functions to send notifications
- Creates tracking functions
- Sets up RLS policies

---

#### **Step 4: Run Migration 3 - Analytics Views**

1. Open the file: `glamora-backend/supabase/migrations/add_custom_service_analytics_views.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run**
5. ✅ Verify: You should see "Success. No rows returned"

**What this does:**
- Creates 10 analytics views
- Sets up trend analysis queries
- Creates business intelligence views

---

#### **Step 5: Grant Admin Access**

1. In the SQL Editor, run this query (replace with your email):

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-admin@email.com';
```

2. ✅ Verify: You should see "Success. 1 rows affected"

---

#### **Step 6: Verify Deployment**

Run these queries to verify everything is set up correctly:

**1. Check if tables exist:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('notifications', 'custom_service_analytics');
```
Expected: 2 rows returned

**2. Check if views exist:**
```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE 'custom_service%';
```
Expected: 10 rows returned

**3. Check if functions exist:**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('approve_custom_service', 'reject_custom_service');
```
Expected: 2 rows returned

**4. Check if approval fields exist:**
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'provider_services' 
  AND column_name LIKE 'custom_service%';
```
Expected: 4 rows returned (custom_service_status, custom_service_rejection_reason, custom_service_reviewed_at, custom_service_reviewed_by)

---

### **Option 2: Using Supabase CLI (If Installed)**

If you have Supabase CLI installed:

```bash
cd glamora-backend
supabase db push
```

This will automatically run all pending migrations.

---

## ✅ Post-Deployment Verification

### **Test the System:**

#### **1. Test Notification Creation:**
```sql
SELECT create_notification(
    auth.uid(),
    'test',
    'Test Notification',
    'This is a test message',
    NULL
);
```

#### **2. Check Pending Services:**
```sql
SELECT * FROM pending_custom_services_count;
```

#### **3. View Overall Stats:**
```sql
SELECT * FROM custom_service_stats_overall;
```

---

## 🎯 Next Steps After Deployment

### **1. Test in the Mobile App:**

1. Sign up as a provider
2. Go to service selection
3. Click "Add Custom Service"
4. Fill in details
5. Verify "Pending Review" badge appears

### **2. Test Admin Functions:**

```sql
-- Get a pending service ID
SELECT id, custom_service_name 
FROM provider_services 
WHERE custom_service_status = 'pending' 
LIMIT 1;

-- Approve it (replace with actual ID)
SELECT approve_custom_service('service-uuid-here');

-- Check if notification was created
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 1;
```

### **3. Test Analytics:**

```sql
-- View overall stats
SELECT * FROM custom_service_stats_overall;

-- View services to add
SELECT * FROM services_to_add_to_platform;
```

---

## 🚨 Troubleshooting

### **Error: "relation already exists"**

This means the table/view already exists. You can either:
- Skip that migration
- Drop the existing table/view first (be careful!)

### **Error: "function already exists"**

Run this to replace the function:
```sql
DROP FUNCTION IF EXISTS approve_custom_service(UUID);
DROP FUNCTION IF EXISTS reject_custom_service(UUID, TEXT);
```
Then re-run the migration.

### **Error: "column already exists"**

The column was already added. You can skip that part of the migration.

### **Error: "permission denied"**

Make sure you're logged in as the database owner or have sufficient permissions.

---

## 📊 Verify Data Flow

### **Complete End-to-End Test:**

1. **Provider adds custom service** (via mobile app)
2. **Check it's tracked:**
   ```sql
   SELECT * FROM custom_service_analytics 
   WHERE event_type = 'submitted' 
   ORDER BY created_at DESC LIMIT 1;
   ```

3. **Approve the service:**
   ```sql
   SELECT approve_custom_service('service-uuid');
   ```

4. **Check notification was sent:**
   ```sql
   SELECT * FROM notifications 
   ORDER BY created_at DESC LIMIT 1;
   ```

5. **Check analytics was updated:**
   ```sql
   SELECT * FROM custom_service_analytics 
   WHERE event_type = 'approved' 
   ORDER BY created_at DESC LIMIT 1;
   ```

6. **Check overall stats:**
   ```sql
   SELECT * FROM custom_service_stats_overall;
   ```

---

## 🎉 Success Indicators

✅ All 3 migrations ran without errors  
✅ Tables created: `notifications`, `custom_service_analytics`  
✅ Views created: 10 analytics views  
✅ Functions created: `approve_custom_service`, `reject_custom_service`  
✅ Admin role granted  
✅ Test notification created successfully  
✅ Analytics tracking working  

---

## 📞 Need Help?

If you encounter issues:
1. Check the error message carefully
2. Verify you're in the correct Supabase project
3. Ensure you have admin/owner permissions
4. Review the migration file for syntax errors
5. Check if tables/functions already exist

---

## 🔄 Rollback (If Needed)

If you need to rollback the changes:

```sql
-- Drop analytics views
DROP VIEW IF EXISTS custom_service_stats_overall CASCADE;
DROP VIEW IF EXISTS custom_service_stats_by_date CASCADE;
DROP VIEW IF EXISTS most_common_custom_services CASCADE;
DROP VIEW IF EXISTS custom_service_rejection_reasons CASCADE;
DROP VIEW IF EXISTS provider_custom_service_activity CASCADE;
DROP VIEW IF EXISTS custom_service_review_times CASCADE;
DROP VIEW IF EXISTS pending_custom_services_count CASCADE;
DROP VIEW IF EXISTS custom_service_trends_weekly CASCADE;
DROP VIEW IF EXISTS custom_service_trends_monthly CASCADE;
DROP VIEW IF EXISTS services_to_add_to_platform CASCADE;

-- Drop tables
DROP TABLE IF EXISTS custom_service_analytics CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS approve_custom_service(UUID);
DROP FUNCTION IF EXISTS reject_custom_service(UUID, TEXT);
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS track_custom_service_event(UUID, UUID, TEXT, TEXT, JSONB);

-- Remove columns (optional - be careful!)
ALTER TABLE provider_services DROP COLUMN IF EXISTS custom_service_status;
ALTER TABLE provider_services DROP COLUMN IF EXISTS custom_service_rejection_reason;
ALTER TABLE provider_services DROP COLUMN IF EXISTS custom_service_reviewed_at;
ALTER TABLE provider_services DROP COLUMN IF EXISTS custom_service_reviewed_by;
```

---

**Ready to deploy? Follow the steps above and you'll have the complete custom service system running!** 🚀

