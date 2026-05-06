import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
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
  type: 'booking' | 'message' | 'review' | 'payment' | 'reminder';
  bookingId?: string;
  messageId?: string;
  reviewId?: string;
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
      console.error('Error registering device token:', error);
      return false;
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
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        target_user_id: targetUserId,
        title,
        body,
        data: data || {},
        type,
      },
    });

    if (error) {
      console.error('Error invoking send-push-notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending remote push notification:', error);
    return false;
  }
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
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', profileId)
      .single();

    if (error || !profile?.user_id) {
      console.error('Error resolving profile -> user_id for push:', error);
      return false;
    }

    return sendRemotePushNotification({
      targetUserId: profile.user_id,
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

