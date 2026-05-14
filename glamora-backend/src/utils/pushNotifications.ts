import { createClient } from '@supabase/supabase-js';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

const expo = new Expo();

interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: any;
}

/**
 * Get all device tokens for a user
 */
const getUserDeviceTokens = async (userId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching device tokens:', error);
      return [];
    }

    return data?.map((d) => d.token) || [];
  } catch (error) {
    console.error('Error getting user device tokens:', error);
    return [];
  }
};

/**
 * Send push notification to a user
 */
export const sendPushNotification = async (
  payload: NotificationPayload
): Promise<boolean> => {
  try {
    const tokens = await getUserDeviceTokens(payload.userId);

    if (tokens.length === 0) {
      console.log(`No device tokens found for user ${payload.userId}`);
      return false;
    }

    // Filter valid Expo push tokens
    const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));

    if (validTokens.length === 0) {
      console.log('No valid Expo push tokens found');
      return false;
    }

    // Create messages
    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    }));

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    // Check for errors in tickets
    for (const ticket of tickets) {
      if (ticket.status === 'error') {
        console.error(`Error sending notification: ${ticket.message}`);
      }
    }

    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};

/**
 * Send notification for new booking
 */
export const notifyNewBooking = async (
  providerId: string,
  customerName: string,
  serviceName: string,
  bookingId: string
): Promise<void> => {
  try {
    // Get provider's user_id
    const { data: providerProfile } = await supabase
      .from('provider_profiles')
      .select('profiles!inner(user_id)')
      .eq('id', providerId)
      .single();

    if (!providerProfile) return;

    const userId = (providerProfile as any).profiles.user_id;

    await sendPushNotification({
      userId,
      title: 'New Booking Request',
      body: `${customerName} has requested ${serviceName}`,
      data: {
        type: 'booking',
        bookingId,
      },
    });
  } catch (error) {
    console.error('Error sending new booking notification:', error);
  }
};

/**
 * Send notification for booking status change
 */
export const notifyBookingStatusChange = async (
  customerId: string,
  status: string,
  serviceName: string,
  bookingId: string
): Promise<void> => {
  try {
    // Get customer's user_id
    const { data: customerProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', customerId)
      .single();

    if (!customerProfile) return;

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

    await sendPushNotification({
      userId: customerProfile.user_id,
      title,
      body,
      data: {
        type: 'booking',
        bookingId,
      },
    });
  } catch (error) {
    console.error('Error sending booking status notification:', error);
  }
};

/**
 * Send notification for new message
 */
export const notifyNewMessage = async (
  recipientId: string,
  senderName: string,
  messagePreview: string,
  conversationId: string
): Promise<void> => {
  try {
    await sendPushNotification({
      userId: recipientId,
      title: `New message from ${senderName}`,
      body: messagePreview,
      data: {
        type: 'message',
        conversationId,
      },
    });
  } catch (error) {
    console.error('Error sending new message notification:', error);
  }
};

/**
 * Send notification for new review
 */
export const notifyNewReview = async (
  providerId: string,
  customerName: string,
  rating: number,
  reviewId: string
): Promise<void> => {
  try {
    // Get provider's user_id
    const { data: providerProfile } = await supabase
      .from('provider_profiles')
      .select('profiles!inner(user_id)')
      .eq('id', providerId)
      .single();

    if (!providerProfile) return;

    const userId = (providerProfile as any).profiles.user_id;

    await sendPushNotification({
      userId,
      title: 'New Review',
      body: `${customerName} left you a ${rating}-star review`,
      data: {
        type: 'review',
        reviewId,
      },
    });
  } catch (error) {
    console.error('Error sending new review notification:', error);
  }
};

/**
 * Send push notification to all admin users when a provider submits a custom service
 */
export const notifyAdminsNewCustomService = async (
  serviceName: string,
  providerName: string,
  serviceId: string
): Promise<void> => {
  try {
    // Fetch all admin user IDs
    const { data: admins, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (error || !admins || admins.length === 0) {
      console.log('[Admin Push] No admin users found or error:', error?.message);
      return;
    }

    const title = '🆕 New Custom Service Submitted';
    const body = `${providerName} submitted "${serviceName}" — tap to review.`;

    await Promise.all(
      admins.map((admin) =>
        sendPushNotification({
          userId: admin.id,
          title,
          body,
          data: {
            type: 'admin_custom_service_pending',
            serviceId,
            screen: 'PendingServices',
          },
        })
      )
    );

    console.log(`[Admin Push] Notified ${admins.length} admin(s) about new custom service: ${serviceName}`);
  } catch (error) {
    console.error('[Admin Push] Error notifying admins of new custom service:', error);
  }
};

/**
 * Send push notification to all admin users when any provider adds a new service (needs approval)
 */
export const notifyAdminsNewService = async (
  serviceName: string,
  providerName: string,
  serviceId: string
): Promise<void> => {
  try {
    const { data: admins, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (error || !admins || admins.length === 0) {
      console.log('[Admin Push] No admin users found:', error?.message);
      return;
    }

    const title = '🔔 New Service Pending Approval';
    const body = `${providerName} added "${serviceName}" — review it in the admin dashboard.`;

    await Promise.all(
      admins.map((admin) =>
        sendPushNotification({
          userId: admin.id,
          title,
          body,
          data: {
            type: 'admin_service_pending',
            serviceId,
            screen: 'PendingServices',
          },
        })
      )
    );

    console.log(`[Admin Push] Notified ${admins.length} admin(s) about new service: ${serviceName}`);
  } catch (error) {
    console.error('[Admin Push] Error notifying admins of new service:', error);
  }
};

/**
 * Send notification for payment received
 */
export const notifyPaymentReceived = async (
  providerId: string,
  amount: number,
  serviceName: string
): Promise<void> => {
  try {
    console.log('[Push Notification] Attempting to send payment notification to provider:', providerId);

    // Get provider's user_id
    const { data: providerProfile, error: profileError } = await supabase
      .from('provider_profiles')
      .select('profiles!inner(user_id)')
      .eq('id', providerId)
      .single();

    if (profileError) {
      console.error('[Push Notification] Error fetching provider profile:', profileError);
      return;
    }

    if (!providerProfile) {
      console.log('[Push Notification] Provider profile not found');
      return;
    }

    const userId = (providerProfile as any).profiles.user_id;
    console.log('[Push Notification] Provider user_id:', userId);

    const success = await sendPushNotification({
      userId,
      title: 'Payment Received',
      body: `You received $${amount.toFixed(2)} for ${serviceName}`,
      data: {
        type: 'payment',
        amount,
        serviceName,
      },
    });

    if (success) {
      console.log('[Push Notification] ✅ Payment notification sent successfully');
    } else {
      console.log('[Push Notification] ⚠️ Payment notification not sent - no device tokens registered');
      console.log('[Push Notification] Provider needs to:');
      console.log('  1. Open the Glamora app on their phone');
      console.log('  2. Grant notification permissions when prompted');
      console.log('  3. Stay logged in to receive notifications');
    }
  } catch (error) {
    console.error('[Push Notification] Error sending payment notification:', error);
  }
};

