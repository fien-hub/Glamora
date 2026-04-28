# Search and Verification Fixes

## Issues Fixed

### 1. ✅ Search Not Showing Verified Providers
**Problem:** The default filter `verifiedOnly: true` was filtering OUT all providers because it checked for `identity_verification_status === 'approved'`.

**Solution:** Changed default filter to `verifiedOnly: false` to show all providers by default, while still prioritizing verified ones in the sorting.

**File Changed:** `glamora-app/src/screens/customer/SearchScreen.tsx`
- Line 73: Changed `verifiedOnly: true` to `verifiedOnly: false`

### 2. ✅ Network Request Failed Errors
**Problem:** The app was trying to call backend API endpoints for verification status, but the backend might not be running or accessible, causing "Network request failed" errors.

**Solution:** Modified verification functions to query Supabase directly instead of calling the backend API.

**Files Changed:**
- `glamora-app/src/services/verification.ts`
  - `getUserVerificationStatus()` - Now queries Supabase directly (lines 346-394)
  - `getVerificationStatus()` - Now queries Supabase directly (lines 112-161)

### 3. ✅ Search Functionality Now Works
**How it works:**
1. Searches all active `provider_services`
2. Filters by service name or provider business name
3. Sorts by verification status (approved first) then by rating
4. Shows all providers by default, with verified ones at the top

## Provider Verification Process

### How Providers Get Verified

#### Option 1: KYC Verification (Stripe Identity)
1. Provider navigates to onboarding Step 4 (Verification)
2. Clicks "Start Verification" on Identity Verification (KYC)
3. Opens Stripe Identity hosted page
4. Uploads government ID and takes selfie
5. Stripe processes verification
6. Backend webhook updates `provider_profiles.identity_verification_status` to 'approved'
7. Sets `provider_profiles.is_verified` to `true`

#### Option 2: Manual Admin Verification
Admins can manually verify providers through the admin panel:
- Endpoint: `POST /api/admin/providers/:id/verify`
- Sets `is_verified` to `true`

### Database Fields for Verification

**provider_profiles table:**
- `is_verified` (boolean) - Main verification flag
- `identity_verification_status` (text) - 'pending', 'processing', 'approved', 'rejected', 'manual_review'
- `identity_verified_at` (timestamp)
- `kyc_verification_id` (UUID) - Links to kyc_verifications table

## Testing: Manually Verify Providers

To test the search functionality, you need to manually verify some providers in the database.

### SQL Script to Verify All Providers

```sql
-- Update all provider profiles to be verified
UPDATE provider_profiles
SET 
  is_verified = true,
  identity_verification_status = 'approved',
  identity_verified_at = NOW()
WHERE is_verified = false OR identity_verification_status != 'approved';

-- Check the results
SELECT 
  id,
  business_name,
  is_verified,
  identity_verification_status,
  identity_verified_at
FROM provider_profiles;
```

### SQL Script to Verify Specific Provider

```sql
-- Find a provider by business name
SELECT id, business_name, is_verified, identity_verification_status
FROM provider_profiles
WHERE business_name ILIKE '%your-provider-name%';

-- Verify that specific provider
UPDATE provider_profiles
SET 
  is_verified = true,
  identity_verification_status = 'approved',
  identity_verified_at = NOW()
WHERE id = 'provider-id-here';
```

## How to Test

1. **Run the SQL script** in Supabase SQL Editor to verify providers
2. **Restart the app** to clear any cached data
3. **Search for a service** that a verified provider offers
4. **You should now see results** with verified providers at the top

## Search Filter Options

Users can filter search results by:
- ✅ Verified providers only (toggle on/off)
- ⭐ Minimum rating (3+, 4+, 4.5+, 5)
- 💰 Price range
- 📍 Maximum distance
- ⏰ Available now

## Verification Status Fields

### Provider Profiles Table
- `is_verified` (boolean) - Main flag used for search filtering
- `identity_verification_status` (text) - Status of KYC verification
  - Values: 'pending', 'processing', 'approved', 'rejected', 'manual_review'
- `identity_verified_at` (timestamp) - When verification was completed
- `kyc_verification_id` (UUID) - Links to kyc_verifications table

### Customer Profiles Table
- `verification_status` (text) - Overall verification status
- `payment_method_verified` (boolean) - Has valid payment method

### Profiles Table (Both)
- `email_verified` (boolean) - Email verification status
- `phone_verified` (boolean) - Phone verification status
- `phone_verified_at` (timestamp) - When phone was verified

## Common Issues & Solutions

### Issue: "No providers found" when searching
**Cause:** No verified providers in database OR providers don't have active services

**Solution:**
1. Run `verify-providers.sql` to verify all providers
2. Check that providers have active services:
```sql
SELECT pp.business_name, COUNT(ps.id) as service_count
FROM provider_profiles pp
LEFT JOIN provider_services ps ON ps.provider_id = pp.id AND ps.is_active = true
GROUP BY pp.id, pp.business_name;
```

### Issue: "Network request failed" errors
**Cause:** App trying to call backend API that's not running

**Solution:** ✅ FIXED - Now queries Supabase directly instead of backend API

### Issue: Search shows providers but can't book
**Cause:** Provider services missing required fields (base_price, platform_commission_rate)

**Solution:**
```sql
-- Check for missing fields
SELECT id, provider_id, service_id, base_price, platform_commission_rate
FROM provider_services
WHERE base_price IS NULL OR platform_commission_rate IS NULL;

-- Fix missing fields
UPDATE provider_services
SET
  base_price = COALESCE(base_price, 5000),  -- Default $50
  platform_commission_rate = COALESCE(platform_commission_rate, 0.20)  -- 20%
WHERE base_price IS NULL OR platform_commission_rate IS NULL;
```

## Next Steps

1. ✅ Verify some providers in the database (run `verify-providers.sql`)
2. ✅ Test search functionality
3. ✅ Test verification flow for new providers
4. Consider implementing email/phone verification for customers
5. Consider adding admin panel for manual verification review
6. Monitor verification completion rates
7. Add automated verification reminders

