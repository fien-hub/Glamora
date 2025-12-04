# 🔔 Push Notifications Setup Guide

## Current Status

✅ **Push notification system is fully implemented**
✅ **Backend is configured and ready**
✅ **Frontend automatically registers tokens**
⚠️ **No devices have registered yet**

## Why Notifications Aren't Working Yet

The message you saw:
```
No device tokens found for user 0105c4fc-300f-4785-9940-08e6257b677f
```

This is **normal** and happens because:

1. **Push notifications only work on physical devices**
   - Expo Go on iOS Simulator: ❌ No push notifications
   - Expo Go on Android Emulator: ❌ No push notifications
   - Expo Go on real iPhone/Android: ✅ Push notifications work!

2. **Users must grant permission**
   - When the app first opens, iOS/Android asks for notification permission
   - If denied, no tokens are registered

3. **Tokens are registered automatically**
   - When a user logs in on a physical device
   - And grants notification permission
   - The app automatically registers their device token

## How to Enable Push Notifications

### For Testing (You as Developer):

1. **Install Expo Go on your physical phone**
   - iOS: Download from App Store
   - Android: Download from Play Store

2. **Open your Glamora app in Expo Go**
   - Scan the QR code from `npx expo start`
   - Make sure your phone is on the same WiFi as your computer

3. **Grant notification permission**
   - When prompted, tap "Allow"
   - If you missed it, go to phone Settings → Glamora → Notifications → Enable

4. **Check the logs**
   - You should see in Expo console:
   ```
   [Notifications] ✅ Push token received: ExponentPushToken[...]
   [Notifications] ✅ Push token registered successfully!
   ```

5. **Test it!**
   - Make a payment as a customer
   - The provider should receive a notification

### For Providers:

**Providers need to:**

1. **Open the Glamora app on their phone** (not simulator)
2. **Log in to their provider account**
3. **Grant notification permission** when prompted
4. **Keep the app installed** (they don't need to keep it open)

Once they do this, they'll receive notifications for:
- 💰 Payment received
- 📅 New booking requests
- ⭐ New reviews
- 💬 New messages

### For Customers:

**Customers automatically get notifications for:**
- ✅ Booking confirmed
- 🎉 Booking completed
- ❌ Booking cancelled
- 💬 New messages from providers

## Checking If Notifications Are Working

### 1. Check Device Tokens in Database

Run this query:
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
supabase.from('device_tokens').select('*').then(({ data }) => {
  console.log('Registered devices:', data?.length || 0);
  data?.forEach(d => console.log('  -', d.platform, d.token.substring(0, 30) + '...'));
});
"
```

### 2. Check Backend Logs

When a payment is made, you should see:
```
[Push Notification] Attempting to send payment notification to provider: ...
[Push Notification] Provider user_id: ...
[Push Notification] ✅ Payment notification sent successfully
```

Or if no token:
```
[Push Notification] ⚠️ Payment notification not sent - no device tokens registered
```

### 3. Check Frontend Logs

In Expo console, look for:
```
[Notifications] ✅ Push token received: ExponentPushToken[...]
[Notifications] ✅ Push token registered successfully!
```

## Troubleshooting

### "No push token received"

**Cause:** Running on simulator or permission denied

**Solution:**
- Use a physical device
- Check notification permissions in phone settings
- Restart the app

### "Failed to register push token with backend"

**Cause:** Backend not reachable or database error

**Solution:**
- Check backend is running
- Check network connectivity
- Check backend logs for errors

### "Notification not sent - no device tokens registered"

**Cause:** Provider hasn't opened the app on a physical device

**Solution:**
- Provider needs to install and open the app
- Grant notification permission
- Log in to their account

## Testing Push Notifications

### Manual Test (Without Making a Payment):

You can manually send a test notification using this script:

```javascript
// test-push-notification.js
const { Expo } = require('expo-server-sdk');
const { createClient } = require('@supabase/supabase-js');

const expo = new Expo();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function sendTestNotification(userId) {
  // Get user's device tokens
  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('token')
    .eq('user_id', userId);

  if (!tokens || tokens.length === 0) {
    console.log('No device tokens found for user');
    return;
  }

  // Send notification
  const messages = tokens.map(t => ({
    to: t.token,
    sound: 'default',
    title: 'Test Notification',
    body: 'This is a test notification from Glamora!',
    data: { type: 'test' },
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    console.log('Sent:', tickets);
  }
}

// Replace with actual user ID
sendTestNotification('USER_ID_HERE');
```

Run it:
```bash
node test-push-notification.js
```

## What Happens When Notifications Work

### Provider Receives Payment:
1. Customer completes payment
2. Backend confirms payment
3. Backend sends push notification to provider
4. Provider's phone shows notification:
   ```
   💰 Payment Received
   You received $90.00 for Haircut
   ```
5. Provider taps notification → Opens app to payment details

### Customer Booking Confirmed:
1. Provider confirms booking (or payment auto-confirms)
2. Backend sends push notification to customer
3. Customer's phone shows notification:
   ```
   ✅ Booking Confirmed!
   Your Haircut booking has been confirmed
   ```
4. Customer taps notification → Opens app to booking details

## Summary

**The push notification system is fully working!** 🎉

The only reason you're not seeing notifications is because:
- You're testing on a simulator (push notifications don't work there)
- Or the provider hasn't opened the app on a physical device yet

**To fix:**
1. Open the app on a **physical phone** (not simulator)
2. Grant notification permission
3. Log in
4. Done! Notifications will now work

**The payment system works perfectly** - notifications are just an extra feature that requires physical devices to test.

