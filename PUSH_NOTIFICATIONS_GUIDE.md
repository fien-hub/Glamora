# Push Notifications Setup Guide for Glamora

## 📋 Overview

This guide will help you set up push notifications using Expo's push notification service.

## 🎯 What You'll Get

- **Booking notifications**: New bookings, cancellations, confirmations
- **Message notifications**: New messages from customers/providers
- **Review notifications**: New reviews received
- **Reminder notifications**: Upcoming appointments
- **Custom notifications**: Marketing, promotions, updates

## 🚀 Setup Steps

### Step 1: Install Dependencies

```bash
cd glamora-app
npx expo install expo-notifications expo-device expo-constants
```

### Step 2: Configure app.json

Add to `glamora-app/app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#D4AF37",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#D4AF37",
      "androidMode": "default",
      "androidCollapsedTitle": "{{unread_count}} new notifications"
    }
  }
}
```

### Step 3: Create Notification Service

Create `glamora-app/src/services/notifications.ts`:

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D4AF37',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

export async function savePushToken(userId: string, token: string) {
  await supabase
    .from('user_push_tokens')
    .upsert({
      user_id: userId,
      push_token: token,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    });
}
```

### Step 4: Create Push Tokens Table

Add migration `glamora-backend/supabase/migrations/add_push_tokens.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, push_token)
);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tokens"
  ON public.user_push_tokens
  FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_push_tokens_user ON public.user_push_tokens(user_id);
```

### Step 5: Register on App Launch

Update `glamora-app/App.tsx`:

```typescript
import { registerForPushNotifications, savePushToken } from './src/services/notifications';
import * as Notifications from 'expo-notifications';

function App() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      registerForPushNotifications().then(token => {
        if (token) {
          savePushToken(user.id, token);
        }
      });

      // Handle notification received while app is open
      const subscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
      });

      // Handle notification tapped
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification tapped:', response);
        // Navigate to relevant screen based on notification data
      });

      return () => {
        subscription.remove();
        responseSubscription.remove();
      };
    }
  }, [user]);

  return (
    // Your app
  );
}
```

### Step 6: Create Backend Notification Sender

Create Supabase Edge Function `supabase/functions/send-notification/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  const { userIds, title, body, data } = await req.json();

  // Get push tokens for users
  const { data: tokens } = await supabase
    .from('user_push_tokens')
    .select('push_token')
    .in('user_id', userIds);

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ error: 'No tokens found' }), {
      status: 404,
    });
  }

  // Send notifications
  const messages = tokens.map(({ push_token }) => ({
    to: push_token,
    sound: 'default',
    title,
    body,
    data,
  }));

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  const result = await response.json();
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## 📱 Usage Examples

### Send Booking Notification

```typescript
// When new booking is created
await supabase.functions.invoke('send-notification', {
  body: {
    userIds: [providerId],
    title: '🎉 New Booking!',
    body: `${customerName} booked ${serviceName} for ${date}`,
    data: {
      type: 'new_booking',
      bookingId: booking.id,
      screen: 'BookingDetails',
    },
  },
});
```

### Send Message Notification

```typescript
await supabase.functions.invoke('send-notification', {
  body: {
    userIds: [recipientId],
    title: `💬 ${senderName}`,
    body: messageText,
    data: {
      type: 'new_message',
      conversationId: conversation.id,
      screen: 'Chat',
    },
  },
});
```

## 🧪 Testing

### Test on Physical Device

1. Build development client:
   ```bash
   npx expo run:ios
   # or
   npx expo run:android
   ```

2. Grant notification permissions when prompted

3. Check console for push token

4. Send test notification from Expo dashboard

### Test Notification Tool

Use Expo's push notification tool:
[expo.dev/notifications](https://expo.dev/notifications)

## 🔔 Notification Types

Configure in your app:

```typescript
export const NotificationTypes = {
  NEW_BOOKING: 'new_booking',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_CONFIRMED: 'booking_confirmed',
  NEW_MESSAGE: 'new_message',
  NEW_REVIEW: 'new_review',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  PAYMENT_RECEIVED: 'payment_received',
};
```

## 📊 Best Practices

1. **Respect Quiet Hours**: Check user's notification preferences
2. **Batch Notifications**: Don't spam users
3. **Rich Content**: Include images and actions when possible
4. **Deep Linking**: Navigate to relevant screen on tap
5. **Badge Count**: Update app badge count
6. **Sound**: Use appropriate sounds for different notification types

## 🚀 Going Live

- [ ] Test on both iOS and Android
- [ ] Configure notification icons and sounds
- [ ] Set up notification categories
- [ ] Implement notification actions (reply, dismiss, etc.)
- [ ] Add analytics tracking
- [ ] Test quiet hours functionality
- [ ] Verify deep linking works
- [ ] Test notification grouping

## 📞 Resources

- **Expo Docs**: [docs.expo.dev/push-notifications](https://docs.expo.dev/push-notifications/overview/)
- **Expo Push Tool**: [expo.dev/notifications](https://expo.dev/notifications)

