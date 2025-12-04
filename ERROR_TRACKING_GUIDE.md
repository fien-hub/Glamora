# 🔍 Glamora App - Error Tracking Guide

## Overview

The Glamora app uses **Sentry** for comprehensive error tracking and performance monitoring in production. This guide covers setup, usage, and best practices.

---

## 📦 Installation

Sentry is already installed and configured. The following package is included:

```bash
npm install @sentry/react-native
```

---

## ⚙️ Configuration

### **1. Environment Variables**

Add your Sentry DSN to `.env`:

```bash
# Sentry Configuration
EXPO_PUBLIC_SENTRY_DSN=https://your_sentry_dsn_here@sentry.io/your_project_id
EXPO_PUBLIC_ENV=production  # or staging, development
```

### **2. Get Your Sentry DSN**

1. Create a Sentry account at https://sentry.io/
2. Create a new **React Native** project
3. Copy the DSN from **Project Settings > Client Keys (DSN)**
4. Add it to your `.env` file

### **3. Sentry Initialization**

Sentry is automatically initialized in `App.tsx`:

```typescript
import { initSentry } from './src/services/sentry';

useEffect(() => {
  initSentry();
}, []);
```

**Note:** Sentry only runs in `production` and `staging` environments, not in `development`.

---

## 🛡️ Error Boundary

The app is wrapped in an `ErrorBoundary` component that catches React errors and displays a fallback UI.

### **Features:**
- ✅ Catches all React component errors
- ✅ Automatically reports errors to Sentry
- ✅ Shows user-friendly error message
- ✅ Provides "Try Again" and "Go to Home" buttons
- ✅ Shows error details in development mode

### **Usage:**

The Error Boundary is already set up in `App.tsx`:

```typescript
<ErrorBoundary>
  <GestureHandlerRootView style={{ flex: 1 }}>
    {/* Your app content */}
  </GestureHandlerRootView>
</ErrorBoundary>
```

You can also use it for specific components:

```typescript
<ErrorBoundary
  fallback={<CustomErrorUI />}
  onError={(error, errorInfo) => {
    console.log('Custom error handler', error);
  }}
>
  <YourComponent />
</ErrorBoundary>
```

---

## 📊 Performance Monitoring

### **1. Screen Performance Tracking**

Use the `usePerformanceMonitoring` hook to track screen load times:

```typescript
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';

function MyScreen() {
  const { markOperation } = usePerformanceMonitoring('MyScreen');

  const handleLoadData = async () => {
    const operation = markOperation('load_data');
    try {
      await fetchData();
    } finally {
      operation.finish();
    }
  };

  return <View>...</View>;
}
```

### **2. API Performance Tracking**

Use the `useApiPerformanceMonitoring` hook to track API calls:

```typescript
import { useApiPerformanceMonitoring } from '../hooks/usePerformanceMonitoring';

function MyComponent() {
  const { trackApiCall } = useApiPerformanceMonitoring('fetchBookings');

  const fetchData = async () => {
    const span = trackApiCall('GET', '/api/bookings');
    try {
      const response = await fetch('/api/bookings');
      span.finish(response.status);
      return response.json();
    } catch (error) {
      span.finish(500);
      throw error;
    }
  };

  return <View>...</View>;
}
```

### **3. Render Performance Tracking**

Use the `useRenderPerformanceMonitoring` hook to detect slow renders:

```typescript
import { useRenderPerformanceMonitoring } from '../hooks/usePerformanceMonitoring';

function MyComponent() {
  useRenderPerformanceMonitoring('MyComponent');
  // Automatically reports renders > 100ms
  return <View>...</View>;
}
```

---

## 🎯 Error Tracking Utilities

### **1. Track Authentication Errors**

```typescript
import { trackAuthError } from '../utils/errorTracking';

try {
  await signIn(email, password);
} catch (error) {
  trackAuthError(error, {
    method: 'email',
    userId: user?.id,
  });
}
```

### **2. Track Payment Errors**

```typescript
import { trackPaymentError } from '../utils/errorTracking';

try {
  await processPayment();
} catch (error) {
  trackPaymentError(error, {
    bookingId: booking.id,
    amount: 5000,
    currency: 'USD',
    paymentMethod: 'card',
  });
}
```

### **3. Track Booking Errors**

```typescript
import { trackBookingError } from '../utils/errorTracking';

try {
  await createBooking();
} catch (error) {
  trackBookingError(error, {
    bookingId: booking.id,
    providerId: provider.id,
    serviceId: service.id,
    action: 'create',
  });
}
```

### **4. Track API Errors**

```typescript
import { trackApiError } from '../utils/errorTracking';

try {
  const response = await fetch('/api/endpoint');
  if (!response.ok) {
    throw new Error('API request failed');
  }
} catch (error) {
  trackApiError(error, {
    endpoint: '/api/endpoint',
    method: 'GET',
    statusCode: 500,
  });
}
```

---

## 📝 User Context and Tags

### **1. Set User Context**

User context is automatically set when a user signs in (in `AuthContext.tsx`):

```typescript
import { setSentryUser } from '../services/sentry';

setSentryUser({
  id: user.id,
  email: user.email,
  role: user.role,
});
```

### **2. Clear User Context**

User context is automatically cleared when a user signs out:

```typescript
import { clearSentryUser } from '../services/sentry';

clearSentryUser();
```

### **3. Add Custom Tags**

```typescript
import { setSentryTag } from '../services/sentry';

setSentryTag('user_role', 'customer');
setSentryTag('subscription_tier', 'premium');
```

### **4. Add Custom Context**

```typescript
import { setSentryContext } from '../services/sentry';

setSentryContext('booking', {
  bookingId: '123',
  providerId: '456',
  status: 'pending',
});
```

---

## 🍞 Breadcrumbs

Breadcrumbs are automatically captured for:
- ✅ Navigation events
- ✅ Console logs
- ✅ Network requests
- ✅ User interactions

### **Manual Breadcrumbs:**

```typescript
import { addBreadcrumb } from '../services/sentry';

addBreadcrumb({
  message: 'User clicked checkout button',
  category: 'user_action',
  level: 'info',
  data: {
    bookingId: '123',
    amount: 5000,
  },
});
```

---

## 🔒 Data Privacy

Sentry is configured to **automatically filter sensitive data**:

### **Filtered Data:**
- ❌ Authorization headers
- ❌ Passwords
- ❌ API keys
- ❌ Credit card numbers
- ❌ Tokens

### **Filtered Breadcrumbs:**
- ❌ Navigation to payment screens
- ❌ Console logs with sensitive data

---

## 📈 Sentry Dashboard

### **View Errors:**
1. Go to https://sentry.io/
2. Select your project
3. View **Issues** tab for all errors
4. Click on an issue to see:
   - Error message and stack trace
   - User context (email, role)
   - Breadcrumbs (user actions before error)
   - Device info (OS, app version)
   - Tags and custom context

### **View Performance:**
1. Go to **Performance** tab
2. View transaction summaries
3. See slow screens and API calls
4. Analyze performance trends

---

## 🧪 Testing

### **Test Error Tracking:**

```typescript
import { captureException, captureMessage } from '../services/sentry';

// Test error capture
try {
  throw new Error('Test error');
} catch (error) {
  captureException(error);
}

// Test message capture
captureMessage('Test message', 'info');
```

---

## ✅ Best Practices

1. **Always use error tracking utilities** - Don't manually call `Sentry.captureException()`
2. **Add context to errors** - Include relevant IDs, user info, and action details
3. **Track user actions** - Use breadcrumbs to understand user flow before errors
4. **Monitor performance** - Use performance hooks on critical screens
5. **Review Sentry regularly** - Check for new errors and performance issues
6. **Set up alerts** - Configure Sentry to notify you of critical errors
7. **Filter noise** - Ignore known errors that don't need fixing

---

## 🐛 Troubleshooting

### **"Unable to resolve promise/setimmediate/done" error:**
- **Solution**: Install the `promise` package
  ```bash
  npm install promise --legacy-peer-deps
  ```
- This is a known issue with `@sentry/react-native` in Expo
- The package is required for React Native error handling polyfills

### **"Sentry DSN not configured" warning:**
- This is expected in development mode
- Sentry only runs in production/staging environments
- Add `EXPO_PUBLIC_SENTRY_DSN` to `.env` for staging/production

### **"User context not set" warning:**
- Make sure user is logged in
- User context is automatically set on login in `AuthContext.tsx`

### **Errors not appearing in Sentry dashboard:**
- Check environment is set to production or staging (not development)
- Verify DSN is correct in `.env`
- Check network connectivity
- Errors may take a few minutes to appear

### **Performance transactions not showing:**
- Verify `tracesSampleRate` is > 0 in `sentry.ts`
- Check environment (development mode skips Sentry)
- Performance data may take longer to process than errors

---

## 📚 Additional Resources

- **Sentry Docs:** https://docs.sentry.io/platforms/react-native/
- **Performance Monitoring:** https://docs.sentry.io/platforms/react-native/performance/
- **Error Tracking:** https://docs.sentry.io/platforms/react-native/usage/
- **Breadcrumbs:** https://docs.sentry.io/platforms/react-native/enriching-events/breadcrumbs/

---

**Status:** ✅ Configured and ready for production

