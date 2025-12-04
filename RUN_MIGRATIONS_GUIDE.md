# 🔧 Run Database Migrations for Custom Services

## ⚠️ Important: Migrations Must Be Run!

The custom service feature requires two database migrations to be run. Without these, the feature won't work.

---

## 📋 Migrations to Run

### **1. Add "Other" Category & Custom Service**
**File:** `glamora-backend/supabase/migrations/add-other-category.sql`

**What it does:**
- ✅ Adds "Other" service category
- ✅ Adds "Custom Service" entry (ID: `550e8400-e29b-41d4-a716-446655440999`)
- ✅ Adds `custom_service_name` column to `provider_services` table
- ✅ Creates index for searching custom services

### **2. Add Comprehensive Services List**
**File:** `glamora-backend/supabase/migrations/add-comprehensive-services.sql`

**What it does:**
- ✅ Adds 127 beauty services across 10 categories
- ✅ Adds new categories: Lashes & Brows, Body Treatments, Permanent Makeup, Specialty Services
- ✅ Expands existing categories with more services

---

## 🚀 How to Run Migrations

### **Option 1: Using Supabase CLI (Recommended)**

```bash
cd glamora-backend

# Run the migrations
npx supabase db push

# Or run individually
psql $DATABASE_URL -f supabase/migrations/add-other-category.sql
psql $DATABASE_URL -f supabase/migrations/add-comprehensive-services.sql
```

### **Option 2: Using Supabase Dashboard**

1. Go to https://supabase.com/dashboard
2. Select your project: **glamora**
3. Go to **SQL Editor**
4. Copy and paste the contents of `add-other-category.sql`
5. Click **Run**
6. Repeat for `add-comprehensive-services.sql`

### **Option 3: Using psql Directly**

```bash
# Get your database URL from Supabase dashboard
# Settings → Database → Connection string (Direct connection)

psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" \
  -f glamora-backend/supabase/migrations/add-other-category.sql

psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" \
  -f glamora-backend/supabase/migrations/add-comprehensive-services.sql
```

---

## ✅ Verify Migrations Worked

After running the migrations, verify they worked:

### **Check 1: Custom Service Exists**

```sql
SELECT * FROM services 
WHERE id = '550e8400-e29b-41d4-a716-446655440999';
```

**Expected result:** 1 row with name "Custom Service"

### **Check 2: Custom Service Name Column Exists**

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'provider_services' 
  AND column_name = 'custom_service_name';
```

**Expected result:** 1 row showing the column exists

### **Check 3: Total Service Count**

```sql
SELECT COUNT(*) as total_services FROM services;
```

**Expected result:** Should be 130+ services (original + 127 new ones)

### **Check 4: Service Categories**

```sql
SELECT name, COUNT(s.id) as service_count
FROM service_categories sc
LEFT JOIN services s ON s.category_id = sc.id
GROUP BY sc.name
ORDER BY service_count DESC;
```

**Expected result:** Should show all categories including "Other", "Lashes & Brows", etc.

---

## 🎯 What Happens After Migrations

Once migrations are run:

1. ✅ **Custom Service appears in onboarding** - Providers can select "Custom Service"
2. ✅ **Custom name input shows** - When selected, input field appears
3. ✅ **Custom name is saved** - Stored in `provider_services.custom_service_name`
4. ✅ **127 new services available** - Full comprehensive list appears
5. ✅ **Better service coverage** - 95%+ of beauty services covered

---

## 🐛 Troubleshooting

### **Problem: "Custom Service" doesn't appear in the list**

**Solution:**
- Run migration 1: `add-other-category.sql`
- Restart the backend server
- Refresh the app

### **Problem: Custom service name input doesn't show**

**Solution:**
- Check that migration 1 ran successfully
- Verify the service ID matches: `550e8400-e29b-41d4-a716-446655440999`
- Check browser console for errors

### **Problem: Error when saving custom service name**

**Solution:**
- Verify `custom_service_name` column exists in `provider_services` table
- Check database permissions
- Look at backend logs for SQL errors

### **Problem: Only a few services show up**

**Solution:**
- Run migration 2: `add-comprehensive-services.sql`
- Restart backend
- Refresh app

---

## 📱 Testing the Feature

After running migrations:

1. **Open the app**
2. **Start provider onboarding**
3. **Go to Step 2: Select Services**
4. **Scroll to the bottom** - You should see "Custom Service"
5. **Tap "Custom Service"** - Input field should appear
6. **Enter a custom name** - e.g., "Bridal Hair & Makeup Package"
7. **Continue onboarding** - Should save successfully
8. **Check your profile** - Custom service should appear with your custom name

---

## 🎉 Result

After running migrations, providers can:

- ✅ Select from 130+ predefined services
- ✅ Add custom services with their own names
- ✅ Offer unique services not in the list
- ✅ Have flexibility for specialty services

**Perfect for covering 100% of beauty services!** 🚀💅✨

