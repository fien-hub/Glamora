# Account Deletion Implementation

## Overview
This implementation provides users with the ability to permanently delete their Glamora account and all associated data, complying with GDPR and privacy regulations.

## Features

### 1. Account Settings Screen
- New dedicated screen for account management
- Located at: `src/screens/AccountSettingsScreen.tsx`
- Accessible from both Customer and Provider profile screens
- Features:
  - View account information
  - Export user data (GDPR compliance)
  - Deactivate account (temporary, coming soon)
  - Delete account (permanent)

### 2. Account Deletion Service
- Located at: `src/services/accountDeletion.ts`
- Provides:
  - `deleteUserAccount()` - Main deletion function
  - `confirmAccountDeletion()` - Two-step confirmation dialog
  - `exportUserData()` - Data export for GDPR compliance

### 3. Database Migration
- SQL file: `supabase/migrations/account_deletion.sql`
- Creates database functions for safe data deletion
- Handles cascading deletes across all user data tables

## Data Deletion Scope

When a user deletes their account, the following data is permanently removed:

### Customer Data
- Customer profile
- Booking history (marked as cancelled)
- Reviews written
- Favorites
- Loyalty points
- Saved payment methods

### Provider Data
- Provider profile
- Service listings
- Portfolio items
- Availability schedules
- Reviews received

### Shared Data
- User profile
- Messages and conversations
- Notifications
- Profile pictures

### Retained Data (for audit/legal reasons)
- Payment records (anonymized - marked as deleted)
- Cancelled bookings (kept for financial records)

## User Flow

1. **Access Account Settings**
   - Navigate to Profile → Account Settings

2. **Export Data (Optional)**
   - User can export their data before deletion
   - Provides JSON file with all personal information

3. **Delete Account**
   - Click "Delete Account" button
   - First confirmation dialog appears
   - Second confirmation dialog for extra safety
   - Data deletion process begins
   - User is signed out
   - Success message displayed

## Implementation Details

### Navigation Integration
The Account Settings screen is integrated into both customer and provider navigation stacks:

**Customer Navigation:**
```typescript
<Stack.Screen
  name="AccountSettings"
  component={AccountSettingsScreen}
  options={{ headerShown: false }}
/>
```

**Provider Navigation:**
```typescript
<Stack.Screen
  name="AccountSettings"
  component={AccountSettingsScreen}
  options={{ headerShown: false }}
/>
```

### Database Functions

#### `delete_user_account(user_id UUID)`
Deletes all user data from the database in the correct order to respect foreign key constraints:

1. Customer-specific data
2. Provider-specific data
3. Reviews
4. Messages
5. Bookings (soft delete)
6. Payments (anonymize)
7. Notifications
8. User profile

#### `delete_auth_user(user_id UUID)`
Placeholder function for auth user deletion. Actual auth user deletion should be done via Supabase Admin API with service role.

## Security Considerations

1. **Authentication Required**: Users must be logged in to delete their account
2. **User Verification**: Function verifies the requesting user owns the account
3. **Two-Step Confirmation**: Requires double confirmation to prevent accidental deletion
4. **Irreversible Action**: Clearly communicated to users that deletion is permanent
5. **Secure Storage**: Uses Supabase security policies for data access

## Database Setup

Run the migration in Supabase SQL Editor:

```bash
# Copy the contents of supabase/migrations/account_deletion.sql
# Paste into Supabase SQL Editor and execute
```

Or via Supabase CLI:

```bash
supabase db push
```

## Testing

### Test Account Deletion

1. Create a test user account
2. Add some data (bookings, reviews, favorites)
3. Navigate to Account Settings
4. Export data to verify all information is captured
5. Delete account
6. Verify:
   - User is signed out
   - Cannot log in with deleted credentials
   - Data is removed from database
   - No orphaned records remain

### Test Data Export

1. Log in with a user account
2. Navigate to Account Settings
3. Click "Export My Data"
4. Verify exported JSON includes:
   - Profile information
   - Customer/Provider profiles
   - Bookings
   - Reviews

## Future Enhancements

1. **Account Deactivation**
   - Temporary account suspension
   - Reactivation via login
   - Auto-deletion after X days

2. **Email Notification**
   - Send confirmation email when account is deleted
   - Allow 30-day grace period for recovery

3. **Admin Dashboard**
   - View deletion requests
   - Manual review for suspicious activity
   - Bulk cleanup of orphaned auth users

4. **Data Download**
   - Save exported data to device storage
   - Email data export to user
   - Support multiple export formats (CSV, PDF)

## Compliance

This implementation helps meet requirements for:

- **GDPR Article 17**: Right to erasure ("right to be forgotten")
- **CCPA**: Right to deletion
- **Apple App Store**: Account deletion requirement
- **Google Play Store**: Account deletion requirement

## Support

For users who accidentally deleted their accounts:

1. Check if backup/recovery is possible (within grace period)
2. Contact support with account details
3. Review deletion logs for verification

---

**Note**: Always backup user data before implementing account deletion in production. Consider implementing a grace period where deleted accounts can be recovered.
