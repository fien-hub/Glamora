// expo-notifications is lazy-loaded — it calls native ATT/push modules at
// module-evaluation time which can throw in New Architecture builds.
let Notifications: typeof import('expo-notifications') = {} as any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require('expo-notifications');
} catch (e) { console.warn('[notifications.ts] expo-notifications unavailable:', e); }
let Device: typeof import('expo-device') = {} as any;
try { Device = require('expo-device'); } catch (e) { console.warn('[notifications.ts] expo-device unavailable:', e); }
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../services/supabase';

let notificationHandlerInitialized = false;

export const initializeNotificationHandler = () => {
  if (notificationHandlerInitialized) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      // iOS behavior fields to satisfy Expo SDK 54 types
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  notificationHandlerInitialized = true;
};

export interface NotificationData {
  type: 'booking' | 'message' | 'review' | 'payment' | 'reminder' | 'admin';
  bookingId?: string;
  messageId?: string;
  reviewId?: string;
  event_type?: string;
  [key: string]: any;
}

interface RemotePushPayload {
  targetUserId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  type?: 'booking' | 'message' | 'review' | 'payment' | 'system';
}

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Get Expo push token for the device
 */
export const getExpoPushToken = async (): Promise<string | null> => {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFB6C1',
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn('[Notifications] Missing EAS projectId, cannot request Expo push token');
      return null;
    }

    // Note: Push notifications don't work in Expo Go
    // This will only work in a development build or production app
    const token = await Notifications.getExpoPushTokenAsync({ projectId });

    return token.data;
  } catch (error) {
    // Silently fail in Expo Go - this is expected
    if (__DEV__) {
      console.log('Push notifications not available in Expo Go');
    }
    return null;
  }
};

/**
 * Register device token with backend
 */
export const registerDeviceToken = async (
  userId: string,
  token: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('device_tokens')
      .upsert(
        {
          user_id: userId,
          token: token,
          platform: Platform.OS,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,token',
        }
      );

    if (error) {
      // Some environments differ on unique constraints for device_tokens.
      // Fallback to update-or-insert by token to avoid silent registration loss.
      const { data: existing, error: existingError } = await supabase
        .from('device_tokens')
        .select('id')
        .eq('token', token)
        .maybeSingle();

      if (existingError) {
        console.error('Error registering device token:', error);
        return false;
      }

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from('device_tokens')
          .update({
            user_id: userId,
            platform: Platform.OS,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error updating existing device token:', updateError);
          return false;
        }

        return true;
      }

      const { error: insertError } = await supabase
        .from('device_tokens')
        .insert({
          user_id: userId,
          token,
          platform: Platform.OS,
          is_active: true,
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error inserting fallback device token row:', insertError);
        return false;
      }

      return true;
    }

    return true;
  } catch (error) {
    console.error('Error registering device token:', error);
    return false;
  }
};

/**
 * Unregister device token
 */
export const unregisterDeviceToken = async (
  userId: string,
  token: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token);

    if (error) {
      console.error('Error unregistering device token:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error unregistering device token:', error);
    return false;
  }
};

/**
 * Invoke edge function to send remote push notification to an auth user ID
 */
export const sendRemotePushNotification = async ({
  targetUserId,
  title,
  body,
  data,
  type = 'system',
}: RemotePushPayload): Promise<boolean> => {
  const payload = {
    target_user_id: targetUserId,
    title,
    body,
    data: data || {},
    type,
  };

  // Retry transient failures once; network and token refresh races are common on mobile.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: payload,
      });

      if (!error) {
        return true;
      }

      console.error(`[Push] send-push-notification attempt ${attempt} failed:`, error);
      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`[Push] invoke exception attempt ${attempt}:`, error);
      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  return false;
};

/**
 * Send remote push notification to a profile ID (resolves auth user ID first)
 */
export const sendRemotePushToProfile = async (
  profileId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
  type: 'booking' | 'message' | 'review' | 'payment' | 'system' = 'system'
): Promise<boolean> => {
  try {
    const { data: profileById, error: profileByIdError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', profileId)
      .maybeSingle();

    if (profileByIdError) {
      console.error('Error resolving profile by id for push:', profileByIdError);
      return false;
    }

    // Some call sites may pass auth user IDs instead of profile IDs.
    const resolvedUserId = profileById?.user_id || profileId;

    return sendRemotePushNotification({
      targetUserId: resolvedUserId,
      title,
      body,
      data,
      type,
    });
  } catch (error) {
    console.error('Error sending remote push to profile:', error);
    return false;
  }
};

/**
 * Schedule a local notification
 */
export const scheduleLocalNotification = async (
  title: string,
  body: string,
  data?: NotificationData,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string | null> => {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: trigger || null,
    });

    return id;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

/**
 * Cancel a scheduled notification
 */
export const cancelNotification = async (notificationId: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
};

/**
 * Get badge count
 */
export const getBadgeCount = async (): Promise<number> => {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.error('Error getting badge count:', error);
    return 0;
  }
};

/**
 * Set badge count
 */
export const setBadgeCount = async (count: number): Promise<void> => {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
};

/**
 * Clear badge
 */
export const clearBadge = async (): Promise<void> => {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.error('Error clearing badge:', error);
  }
};

/**
 * Add notification received listener
 */
export const addNotificationReceivedListener = (
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Add notification response listener (when user taps notification)
 */
export const addNotificationResponseListener = (
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Schedule booking reminder notification
 */
export const scheduleBookingReminder = async (
  bookingId: string,
  bookingDate: Date,
  serviceName: string
): Promise<string | null> => {
  try {
    // Schedule notification 1 hour before booking
    const reminderTime = new Date(bookingDate.getTime() - 60 * 60 * 1000);

    if (reminderTime <= new Date()) {
      return null; // Don't schedule if time has passed
    }

    return await scheduleLocalNotification(
      'Upcoming Booking Reminder',
      `Your ${serviceName} appointment is in 1 hour`,
      {
        type: 'reminder',
        bookingId,
      },
      {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime,
      }
    );
  } catch (error) {
    console.error('Error scheduling booking reminder:', error);
    return null;
  }
};

/**
 * Send immediate notification for new message
 */
export const notifyNewMessage = async (
  senderName: string,
  messagePreview: string
): Promise<void> => {
  try {
    await scheduleLocalNotification(
      `New message from ${senderName}`,
      messagePreview,
      {
        type: 'message',
      }
    );
  } catch (error) {
    console.error('Error sending message notification:', error);
  }
};

/**
 * Send notification for booking status change
 */
export const notifyBookingStatusChange = async (
  bookingId: string,
  status: string,
  serviceName: string
): Promise<void> => {
  try {
    let title = 'Booking Update';
    let body = '';

    switch (status) {
      case 'confirmed':
        title = 'Booking Confirmed!';
        body = `Your ${serviceName} booking has been confirmed`;
        break;
      case 'completed':
        title = 'Booking Completed';
        body = `Your ${serviceName} service is complete. Please leave a review!`;
        break;
      case 'cancelled':
        title = 'Booking Cancelled';
        body = `Your ${serviceName} booking has been cancelled`;
        break;
      default:
        body = `Your ${serviceName} booking status: ${status}`;
    }

    await scheduleLocalNotification(title, body, {
      type: 'booking',
      bookingId,
    });
  } catch (error) {
    console.error('Error sending booking notification:', error);
  }
};

/**
 * Send a push notification to every user with role='admin'.
 * Best-effort: never throws, silently logs errors so callers don't need try/catch.
 */
export const notifyAdmin = async (
  title: string,
  body: string,
  eventType: 'provider_signup' | 'service_added',
  data?: Record<string, any>
): Promise<void> => {
  const payload = {
    title,
    body,
    event_type: eventType,
    data: data || {},
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();

      // If session is not hydrated yet (common right after signup), retry briefly.
      if (!sessionData?.session?.access_token) {
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          continue;
        }
      }

      const { error } = await supabase.functions.invoke('notify-admin', {
        body: payload,
      });

      if (!error) {
        return;
      }

      console.warn(`[notifyAdmin] invoke attempt ${attempt} failed:`, error);
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    } catch (err) {
      console.warn(`[notifyAdmin] invoke exception attempt ${attempt}:`, err);
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
  }
};

