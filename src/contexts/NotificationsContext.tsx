import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthContext';
import {
  getExpoPushToken,
  registerDeviceToken,
  unregisterDeviceToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  NotificationData,
} from '../utils/notifications';

interface NotificationsContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  isRegistered: boolean;
}

const NotificationsContext = createContext<NotificationsContextType>({
  expoPushToken: null,
  notification: null,
  isRegistered: false,
});

export const useNotifications = () => useContext(NotificationsContext);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(
    null
  );
  const [isRegistered, setIsRegistered] = useState(false);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (user) {
      registerForPushNotifications();
    } else {
      // Unregister when user logs out
      if (expoPushToken && user) {
        unregisterDeviceToken(user.id, expoPushToken);
      }
      setExpoPushToken(null);
      setIsRegistered(false);
    }

    // Set up notification listeners
    notificationListener.current = addNotificationReceivedListener((notification) => {
      setNotification(notification);
      console.log('Notification received:', notification);
    });

    responseListener.current = addNotificationResponseListener((response) => {
      console.log('Notification response:', response);
      handleNotificationResponse(response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user]);

  const registerForPushNotifications = async () => {
    try {
      if (!user) {
        console.log('[Notifications] No user logged in, skipping registration');
        return;
      }

      console.log('[Notifications] Requesting push token for user:', user.id);
      const token = await getExpoPushToken();

      if (token) {
        console.log('[Notifications] ✅ Push token received:', token);
        setExpoPushToken(token);

        console.log('[Notifications] Registering token with backend...');
        const success = await registerDeviceToken(user.id, token);
        setIsRegistered(success);

        if (success) {
          console.log('[Notifications] ✅ Push token registered successfully!');
          console.log('[Notifications] You will now receive notifications');
        } else {
          console.error('[Notifications] ❌ Failed to register push token with backend');
        }
      } else {
        console.log('[Notifications] ⚠️ No push token received');
        console.log('[Notifications] This is normal in Expo Go on simulator');
        console.log('[Notifications] Push notifications only work on physical devices');
      }
    } catch (error) {
      console.error('[Notifications] Error registering for push notifications:', error);
    }
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data as NotificationData;

    // Handle different notification types
    switch (data.type) {
      case 'booking':
        // Navigate to booking details
        console.log('Navigate to booking:', data.bookingId);
        break;
      case 'message':
        // Navigate to chat
        console.log('Navigate to message:', data.messageId);
        break;
      case 'review':
        // Navigate to review
        console.log('Navigate to review:', data.reviewId);
        break;
      case 'payment':
        // Navigate to payment details
        console.log('Navigate to payment');
        break;
      case 'reminder':
        // Navigate to booking
        console.log('Navigate to booking reminder:', data.bookingId);
        break;
      default:
        console.log('Unknown notification type:', data.type);
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        expoPushToken,
        notification,
        isRegistered,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

