# Glamora Database Migration Guide

## 📋 Overview

This guide will help you run all database migrations for the Glamora provider features.

## 🔧 Prerequisites

1. **Supabase CLI** installed:
   ```bash
   npm install -g supabase
   ```

2. **Supabase Project** created at [supabase.com](https://supabase.com)

3. **Project credentials** from your Supabase dashboard

## 🚀 Quick Start

### Step 1: Link to Your Supabase Project

```bash
cd glamora-backend/supabase
supabase link --project-ref YOUR_PROJECT_REF
```

Find your project ref in your Supabase dashboard URL:
`https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

### Step 2: Run Migrations

**Option A: Using the script (Recommended)**
```bash
chmod +x run-migrations.sh
./run-migrations.sh
```

**Option B: Manual migration**
```bash
supabase db push
```

### Step 3: Verify

1. Go to your Supabase dashboard
2. Navigate to **Table Editor**
3. Verify these new tables/columns exist:
   - `customer_notes` table
   - `notification_preferences` table
   - `provider_profiles` - new columns (stripe fields, location fields, business settings)
   - `reviews` - new columns (provider_response, provider_response_date)
   - `portfolio_items` - enhanced columns (tags, view_count, like_count, etc.)

## 📦 Migration Files

Here are all the migrations that will be applied:

1. **add_stripe_fields.sql** - Stripe Connect integration fields
2. **add_provider_location_fields.sql** - Location and service area fields
3. **add_review_response_fields.sql** - Provider review response capability
4. **add_customer_notes.sql** - Customer notes and favorites
5. **add_notification_preferences.sql** - Notification settings
6. **add_business_settings.sql** - Business rules and policies
7. **enhance_portfolio_items.sql** - Portfolio enhancements
8. **add_personalization_fields.sql** - Personalization features
9. **add_recurring_bookings.sql** - Recurring booking support
10. **add_security_audit_log.sql** - Security audit logging

## 🔒 Security Check

After running migrations, verify RLS (Row Level Security) is enabled:

```sql
-- Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;
```

If any tables show `rowsecurity = false`, enable it:

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

## 🧪 Testing

After migrations, test these features in the app:

- [ ] Edit profile with new fields
- [ ] Set availability and time off
- [ ] Manage services
- [ ] View earnings (Stripe fields)
- [ ] Respond to reviews
- [ ] View analytics
- [ ] Manage customers with notes
- [ ] Set location and service area
- [ ] Configure notification preferences
- [ ] Set business settings

## 🆘 Troubleshooting

### Error: "relation already exists"
Some migrations use `IF NOT EXISTS` - this is safe to ignore.

### Error: "permission denied"
Make sure you're using the correct project credentials and have admin access.

### Error: "column already exists"
Some columns may already exist from previous migrations - this is safe.

## 🔄 Rollback

If you need to rollback migrations:

```bash
supabase db reset
```

⚠️ **WARNING**: This will delete all data! Only use in development.

## 📞 Support

If you encounter issues:
1. Check Supabase logs in dashboard
2. Verify your project is linked correctly
3. Ensure you have the latest Supabase CLI version

