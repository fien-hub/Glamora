# Phase 1: Add "Other/Custom" Service Category

## ✅ What This Does

Adds an "Other" category that allows providers to offer custom services not in the predefined list.

---

## 🚀 How to Apply This Migration

### Option 1: Supabase Dashboard (EASIEST)

1. **Go to your Supabase project dashboard**
2. **Click on "SQL Editor"** in the left sidebar
3. **Click "New Query"**
4. **Copy and paste the SQL below**
5. **Click "Run"**

### Option 2: Command Line

```bash
cd glamora-backend
npx supabase db execute --file supabase/migrations/add-other-category.sql
```

---

## 📝 SQL to Run

```sql
-- =====================================================
-- ADD "OTHER" CATEGORY FOR CUSTOM SERVICES
-- =====================================================
-- This allows providers to offer services not in the predefined list
-- and customers to search for unique/custom services
-- =====================================================

-- Add "Other" service category
INSERT INTO public.service_categories (id, name, description, icon) VALUES
    ('550e8400-e29b-41d4-a716-446655440007', 'Other', 'Custom and specialty services', '✨')
ON CONFLICT (id) DO NOTHING;

-- Add a generic "Custom Service" entry that providers can use
INSERT INTO public.services (id, category_id, name, description, base_duration_minutes) VALUES
    ('550e8400-e29b-41d4-a716-446655440999', '550e8400-e29b-41d4-a716-446655440007', 'Custom Service', 'Provider will specify service details', 60)
ON CONFLICT (id) DO NOTHING;

-- Add custom_service_name column to provider_services table
-- This allows providers to specify their own service name when using "Custom Service"
ALTER TABLE public.provider_services 
ADD COLUMN IF NOT EXISTS custom_service_name TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN public.provider_services.custom_service_name IS 
'Custom service name when service_id points to the generic "Custom Service" entry. Allows providers to offer services not in the predefined list.';

-- Create index for searching custom services
CREATE INDEX IF NOT EXISTS idx_provider_services_custom_name 
ON public.provider_services(custom_service_name) 
WHERE custom_service_name IS NOT NULL;
```

---

## ✅ Verification

After running the SQL, verify it worked:

```sql
-- Check if "Other" category was added
SELECT * FROM service_categories WHERE name = 'Other';

-- Check if "Custom Service" was added
SELECT * FROM services WHERE name = 'Custom Service';

-- Check if column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'provider_services' 
AND column_name = 'custom_service_name';
```

You should see:
- ✅ 1 row for "Other" category
- ✅ 1 row for "Custom Service"
- ✅ 1 row showing the custom_service_name column

---

## 🎉 What You Can Do Now

**Providers can:**
1. Select "Custom Service" from the service list
2. Enter their own service name (e.g., "Lash Extensions", "Microblading", "Henna Tattoos")
3. Set their own price and duration
4. Offer any beauty service they want!

**Customers can:**
1. See "Other" in the service categories
2. Find providers offering unique/custom services
3. Book services not in the standard list

---

## 📱 App Changes Already Made

✅ Updated TypeScript types to include `custom_service_name`  
✅ Updated ServicesScreen to show custom service name input  
✅ Updated service display to show custom service badge  
✅ Updated save logic to handle custom services  
✅ Added validation for custom service names  

---

## 🔄 Next: Phase 2

After this is working, I'll research and add 80-100 comprehensive beauty services across all categories!


