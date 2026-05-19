import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
// expo-notifications is lazy-loaded to prevent module-level native crashes.
let Notifications: typeof import('expo-notifications') = {} as any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require('expo-notifications');
} catch (e) { console.warn('[NotificationsContext] expo-notifications unavailable:', e); }
import { useAuth } from './AuthContext';
import {
  getExpoPushToken,
  registerDeviceToken,
  unregisterDeviceToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  initializeNotificationHandler,
  NotificationData,
} from '../utils/notifications';
import { navigate, isNavigationReady } from '../navigation/RootNavigation';
import { supabase } from '../services/supabase';

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
  const { user, userRole } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(
    null
  );
  const [isRegistered, setIsRegistered] = useState(false);
  const lastRegisteredRef = useRef<{ userId: string; token: string } | null>(null);
  // Initialize refs with null to satisfy React 19 types
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const handledNotificationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    initializeNotificationHandler();

    if (user) {
      registerForPushNotifications();
    } else {
      // On logout, attempt to unregister previous token if we know it
      if (lastRegisteredRef.current) {
        unregisterDeviceToken(lastRegisteredRef.current.userId, lastRegisteredRef.current.token)
          .catch((error) => console.error('[Notifications] Failed to unregister previous token:', error));
        lastRegisteredRef.current = null;
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
      handleNotificationResponse(response).catch((error) => {
        console.error('[Notifications] Failed to handle notification tap:', error);
      });
    });

    // Handle cold-start notification tap
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          handleNotificationResponse(response).catch((error) => {
            console.error('[Notifications] Failed to handle last notification response:', error);
          });
        }
      })
      .catch((error) => {
        console.error('[Notifications] Failed to fetch last notification response:', error);
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
        notificationListener.current = null;
      }
      if (responseListener.current) {
        responseListener.current.remove();
        responseListener.current = null;
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

        // If user switched or token changed, clean up old registration first
        if (
          lastRegisteredRef.current &&
          (lastRegisteredRef.current.userId !== user.id || lastRegisteredRef.current.token !== token)
        ) {
          await unregisterDeviceToken(lastRegisteredRef.current.userId, lastRegisteredRef.current.token);
          lastRegisteredRef.current = null;
        }

        // Avoid duplicate upsert noise if already registered in this session
        if (
          lastRegisteredRef.current?.userId === user.id &&
          lastRegisteredRef.current?.token === token
        ) {
          setExpoPushToken(token);
          setIsRegistered(true);
          return;
        }

        setExpoPushToken(token);

        console.log('[Notifications] Registering token with backend...');
        const success = await registerDeviceToken(user.id, token);
        setIsRegistered(success);

        if (success) {
          lastRegisteredRef.current = { userId: user.id, token };
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

  const resolveDisplayNameFromAuthUserId = async (authUserId: string): Promise<string> => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('user_id', authUserId)
        .maybeSingle();

      if (!profile) return 'User';

      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('business_name')
        .eq('id', profile.id)
        .maybeSingle();

      return providerProfile?.business_name || profile.full_name || 'User';
    } catch (error) {
      console.error('[Notifications] Failed to resolve sender name:', error);
      return 'User';
    }
  };

  const routeToBookings = (bookingId?: string) => {
    if (!isNavigationReady()) return;

    if (userRole === 'customer') {
      navigate('CustomerMain', {
        screen: 'Bookings',
        params: bookingId ? { openBookingId: bookingId } : undefined,
      });
    } else if (userRole === 'provider') {
      navigate('ProviderMain', {
        screen: 'Appointments',
        params: bookingId ? { openBookingId: bookingId } : undefined,
      });
    }
  };

  const routeToMessage = async (data: NotificationData) => {
    if (!isNavigationReady()) return;

    const bookingId = (data.bookingId as string) || (data.conversationId as string);
    const senderId = data.senderId as string | undefined;

    if (!bookingId || !senderId) {
      if (userRole === 'customer') {
        navigate('CustomerMain', { screen: 'Messages' });
      } else if (userRole === 'provider') {
        navigate('ProviderMain', { screen: 'Messages' });
      }
      return;
    }

    const senderName = await resolveDisplayNameFromAuthUserId(senderId);

    navigate('Chat', {
      bookingId,
      otherUserId: senderId,
      otherUserName: senderName,
    });
  };

  const handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
    const notificationId = response.notification.request.identifier;
    if (handledNotificationIdsRef.current.has(notificationId)) {
      return;
    }
    handledNotificationIdsRef.current.add(notificationId);

    const data = response.notification.request.content.data as NotificationData;

    // Handle different notification types
    switch (data.type) {
      case 'booking':
      case 'reminder':
      case 'payment':
        routeToBookings(data.bookingId as string | undefined);
        break;
      case 'message':
        await routeToMessage(data);
        break;
      case 'review':
        if (userRole === 'provider') {
          navigate('Reviews');
        }
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

