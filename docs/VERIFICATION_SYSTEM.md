# Glamora Verification System

## Overview
The Glamora app implements a two-tier verification system for customers to ensure security and enable payment processing.

## Verification Requirements

### 1. Email Verification (Required for all actions)
- **Purpose**: Confirm user identity and enable communication
- **Process**: 
  - User receives verification email upon signup
  - Must click verification link to activate account
  - Status stored in `profiles.email_verified`
- **Required for**: All customer actions (booking, messaging, favorites, likes)

### 2. Payment Method Verification (Required for bookings)
- **Purpose**: Enable payment processing for service bookings
- **Process**:
  - User adds payment method in profile settings
  - Payment method is verified through Stripe
  - Status stored in `customer_profiles.payment_method_verified`
- **Required for**: Booking services, payment-related actions

### 3. Phone Verification (NOT REQUIRED)
- Phone verification is **not required** for any customer actions
- The system does not enforce phone verification
- Users can use the app fully without phone verification

## Implementation

### Database Schema

#### profiles table
```sql
- email_verified: boolean (default: false)
```

#### customer_profiles table
```sql
- payment_method_verified: boolean (default: false)
```

### Verification Guard Hook

Location: `glamora-app/src/hooks/useVerificationGuard.ts`

The `useVerificationGuard` hook provides:
- Real-time verification status checking
- User-friendly alerts when verification is required
- Navigation to appropriate verification screens
- Refresh capability to update verification status

#### Usage Example
```typescript
import { useVerificationGuard } from '../hooks/useVerificationGuard';

function MyComponent() {
  const { requireVerification, emailVerified, paymentMethodVerified } = useVerificationGuard();

  const handleBooking = () => {
    // Check if user can book (requires email + payment method)
    if (!requireVerification('booking')) {
      return; // User will see appropriate alert
    }
    
    // Proceed with booking
    proceedWithBooking();
  };

  const handleLike = () => {
    // Check if user can like (requires email only)
    if (!requireVerification('like')) {
      return;
    }
    
    // Proceed with like
    proceedWithLike();
  };
}
```

### Action Requirements

| Action | Email Required | Payment Required |
|--------|---------------|------------------|
| Booking | ✅ | ✅ |
| Messaging | ✅ | ❌ |
| Favorites | ✅ | ❌ |
| Likes | ✅ | ❌ |
| Saving Posts | ✅ | ❌ |
| Payment | ✅ | ✅ |

### Protected Screens

The following screens have verification guards:

1. **BookingFlowScreen** (`glamora-app/src/screens/customer/BookingFlowScreen.tsx`)
   - Requires: Email + Payment Method
   - Checks on screen mount
   - Redirects back if not verified

2. **ChatScreen** (`glamora-app/src/screens/shared/ChatScreen.tsx`)
   - Requires: Email
   - Checks on screen mount
   - Redirects back if not verified

3. **SearchScreen** (`glamora-app/src/screens/customer/SearchScreen.tsx`)
   - Requires: Email (for favorites)
   - Checks when toggling favorites

4. **SocialDiscoveryFeed** (`glamora-app/src/components/SocialDiscoveryFeed.tsx`)
   - Requires: Email (for likes and saves)
   - Checks when liking or saving posts

### UI Updates (Phone Verification Removed)

The following UI components have been updated to remove phone verification requirements:

1. **VerificationStatusCard** (`glamora-app/src/components/VerificationBadge.tsx`)
   - Removed phone verification item
   - Only shows Email and Payment Method verification

2. **ProfileScreen** (`glamora-app/src/screens/customer/ProfileScreen.tsx`)
   - Removed phone verification from verification status card
   - Phone number still displayed as optional contact info

3. **HomeScreen** (`glamora-app/src/screens/customer/HomeScreen.tsx`)
   - Removed phone verification from verification banner
   - Banner only prompts for email and payment method verification

## User Experience

### Email Not Verified
When a user tries to perform an action without email verification:
```
Alert: "Email Verification Required"
Message: "Please verify your email address to continue. You can do this from your profile settings."
Actions: [Cancel] [Verify Now]
```

### Payment Method Not Added
When a user tries to book without a payment method:
```
Alert: "Payment Method Required"
Message: "Please add a payment method to book services. You can do this from your profile settings."
Actions: [Cancel] [Add Payment]
```

## Verification Flow

### Email Verification
1. User signs up
2. Verification email sent automatically
3. User clicks link in email
4. `profiles.email_verified` set to `true`
5. User can now perform all non-payment actions

### Payment Method Verification
1. User navigates to Profile → Payment Methods
2. User adds payment method (card details)
3. Stripe verifies payment method
4. `customer_profiles.payment_method_verified` set to `true`
5. User can now book services

## Security Considerations

- All verification checks happen on the client side for UX
- Backend should also verify before processing sensitive actions
- Payment processing always requires Stripe verification
- Email verification prevents spam and ensures communication channel

## Future Enhancements

Potential improvements to the verification system:
- Add backend verification checks in RLS policies
- Implement verification badges in UI
- Add verification progress indicator in profile
- Send reminder emails for unverified accounts
- Implement verification rewards/incentives

