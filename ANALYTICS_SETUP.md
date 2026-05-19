# Analytics Integration Setup Guide

## Overview

Glamora uses **Mixpanel** for analytics tracking to monitor user behavior, feature usage, and app performance. This guide will help you set up and configure analytics for the app.

---

## Features

### ✅ Implemented Analytics

- **User Identification**: Automatically identifies users when they sign in
- **Screen Tracking**: Tracks screen views with custom properties
- **Event Tracking**: Tracks key user actions and events
- **Revenue Tracking**: Tracks payment transactions and revenue
- **User Properties**: Stores user attributes (role, email, etc.)
- **Automatic Reset**: Clears analytics data on logout

### 📊 Tracked Events

#### Authentication Events
- `Sign Up` - User creates a new account (method: email/google/apple, role: customer/provider)
- `Sign In` - User signs into their account (method: email/google/apple)
- `Sign Out` - User signs out of their account

#### Booking Events
- `Booking Created` - User creates a new booking (serviceType, price, providerId)
- `Booking Completed` - Booking is marked as completed
- `Booking Cancelled` - Booking is cancelled

#### Payment Events
- `Payment Success` - Payment is successfully processed (amount, bookingId)
- `Payment Failed` - Payment fails (amount, bookingId, error)

#### Search Events
- `Search Performed` - User searches for services (query, filters)

#### Profile Events
- `Profile Viewed` - User views a profile (profileType: customer/provider, profileId)
- `Profile Edited` - User edits their profile

#### Message Events
- `Message Sent` - User sends a message (conversationId, hasImage)

#### Service Events
- `Service Added` - Provider adds a new service (serviceType, price)
- `Service Edited` - Provider edits a service
- `Service Deleted` - Provider deletes a service

#### Review Events
- `Review Submitted` - User submits a review (rating, bookingId)

---

## Setup Instructions

### 1. Create a Mixpanel Account

1. Go to [https://mixpanel.com/](https://mixpanel.com/)
2. Sign up for a free account
3. Create a new project for Glamora

### 2. Get Your Project Token

1. Log in to your Mixpanel dashboard
2. Click on your project name in the top left
3. Go to **Settings** → **Project Settings**
4. Copy your **Project Token**

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Mixpanel token to `.env`:
   ```
   EXPO_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_project_token_here
   ```

3. **Important**: Never commit your `.env` file to version control!

### 4. Verify Installation

The analytics package is already installed:
```bash
npm list mixpanel-react-native
```

If not installed, run:
```bash
npm install mixpanel-react-native --legacy-peer-deps
```

---

## Usage

### Automatic Tracking

The following are tracked automatically:

1. **User Identification**: When a user signs in, their ID and properties are automatically sent to Mixpanel
2. **Screen Views**: Use the `useScreenTracking` hook in any screen component
3. **Authentication Events**: Sign up, sign in, and sign out events are tracked automatically

### Manual Event Tracking

Use the `useAnalytics` hook to track custom events:

```typescript
import { useAnalytics } from '../contexts/AnalyticsContext';

function MyComponent() {
  const { trackEvent } = useAnalytics();

  const handleButtonPress = () => {
    trackEvent('Button Pressed', {
      buttonName: 'Submit',
      screenName: 'MyScreen',
    });
  };

  return <Button onPress={handleButtonPress} title="Submit" />;
}
```

### Screen Tracking

Add screen tracking to any screen component:

```typescript
import { useScreenTracking } from '../hooks/useScreenTracking';

export default function MyScreen() {
  useScreenTracking('My Screen', { category: 'main' });

  return <View>...</View>;
}
```

### Convenience Functions

Use pre-built tracking functions for common events:

```typescript
import {
  trackSignUp,
  trackSignIn,
  trackBookingCreated,
  trackPaymentSuccess,
  trackSearchPerformed,
} from '../utils/analytics';

// Track sign up
trackSignUp('email', 'customer');

// Track booking
trackBookingCreated('Haircut', 50, 'provider-id-123');

// Track payment
trackPaymentSuccess(50, 'booking-id-456');

// Track search
trackSearchPerformed('Haircut', { minRating: 4, maxDistance: 10 });
```

---

## Best Practices

### Event Naming

- Use **Title Case** for event names: `Booking Created`, not `booking_created`
- Use **descriptive names**: `Payment Success` instead of `payment_ok`
- Be **consistent**: Always use the same name for the same event

### Event Properties

- Use **camelCase** for property names: `serviceType`, not `service_type`
- Include **relevant context**: userId, timestamp, screen name, etc.
- Keep properties **simple**: Use strings, numbers, and booleans
- Avoid **sensitive data**: Don't track passwords, credit card numbers, etc.

### User Properties

- Set user properties when they change:
  ```typescript
  const { setUserProperties } = useAnalytics();
  
  setUserProperties({
    role: 'provider',
    isVerified: true,
    totalBookings: 10,
  });
  ```

### Revenue Tracking

- Always track revenue for payment events:
  ```typescript
  trackPaymentSuccess(amount, bookingId);
  // This automatically calls trackRevenue() internally
  ```

---

## Privacy Considerations

### Data Collection

Glamora collects the following data:

- **User ID**: Unique identifier for each user
- **Email**: User's email address
- **Role**: Customer or provider
- **Device Info**: Platform, model, app version
- **Event Data**: Actions performed in the app
- **Revenue Data**: Payment amounts and transaction IDs

### Data NOT Collected

- Passwords
- Credit card numbers
- Full addresses (only city/state)
- Phone numbers
- Personal messages content

### User Consent

- Inform users about analytics in your privacy policy
- Consider adding an opt-out option in settings
- Comply with GDPR, CCPA, and other privacy regulations

---

## Testing

### Development Mode

In development, analytics events are logged to the console:

```
[Analytics] Event tracked: Sign Up
[Analytics] Properties: { method: 'email', role: 'customer', ... }
```

### Production Mode

In production, events are sent to Mixpanel without console logs.

### Verify Events in Mixpanel

1. Log in to your Mixpanel dashboard
2. Go to **Events** → **Live View**
3. Perform actions in your app
4. Watch events appear in real-time

---

## Troubleshooting

### Events Not Appearing in Mixpanel

1. **Check your token**: Verify `EXPO_PUBLIC_MIXPANEL_TOKEN` is set correctly
2. **Check initialization**: Look for initialization logs in the console
3. **Check network**: Ensure your device has internet connection
4. **Wait a few minutes**: Events may take time to appear in Mixpanel
5. **Check Live View**: Use Mixpanel's Live View to see events in real-time

### TypeScript Errors

If you see TypeScript errors related to analytics:

1. Restart your TypeScript server
2. Clear your Metro bundler cache: `npm start -- --reset-cache`
3. Rebuild your app

### Analytics Not Initializing

1. Check that `AnalyticsProvider` is wrapped around your app in `App.tsx`
2. Verify the provider is placed after `AuthProvider`
3. Check for errors in the console

---

## API Reference

### `useAnalytics()` Hook

Returns an object with the following methods:

- `trackEvent(eventName, properties?)` - Track a custom event
- `trackScreenView(screenName, properties?)` - Track a screen view
- `setUserProperties(properties)` - Set user properties
- `incrementUserProperty(property, value?)` - Increment a user property
- `trackRevenue(amount, properties?)` - Track revenue
- `isInitialized` - Boolean indicating if analytics is initialized

### `useScreenTracking(screenName, properties?)` Hook

Automatically tracks a screen view when the component mounts.

### Convenience Functions

All convenience functions are exported from `utils/analytics.ts`:

- `trackSignUp(method, role)`
- `trackSignIn(method)`
- `trackSignOut()`
- `trackBookingCreated(serviceType, price, providerId)`
- `trackBookingCompleted(bookingId)`
- `trackBookingCancelled(bookingId, reason?)`
- `trackPaymentSuccess(amount, bookingId)`
- `trackPaymentFailed(amount, bookingId, error)`
- `trackSearchPerformed(query, filters?)`
- `trackProfileViewed(profileType, profileId)`
- `trackProfileEdited()`
- `trackMessageSent(conversationId, hasImage?)`
- `trackServiceAdded(serviceType, price)`
- `trackServiceEdited(serviceId)`
- `trackServiceDeleted(serviceId)`
- `trackReviewSubmitted(rating, bookingId)`

---

## Support

For issues or questions:

1. Check the [Mixpanel Documentation](https://docs.mixpanel.com/)
2. Review the [mixpanel-react-native GitHub](https://github.com/mixpanel/mixpanel-react-native)
3. Contact the Glamora development team

---

**Happy Tracking! 📊**

