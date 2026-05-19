import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '../utils/icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { useScreenTracking } from '../hooks/useScreenTracking';

interface Notification {
  id: string;
  type: 'booking' | 'message' | 'review' | 'payment' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, userRole } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const normalizeNotification = (row: any): Notification => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: row.is_read ?? row.isRead ?? false,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    relatedId: row.related_id ?? row.relatedId,
  });

  // Track screen view
  useScreenTracking('Notifications');

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          setNotifications((prev) => [normalizeNotification(payload.new), ...prev]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data || []).map(normalizeNotification));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const openRelatedChat = async (relatedId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      let chatMessage: { booking_id: string | null; sender_id: string; receiver_id: string } | null = null;

      const { data: messageById } = await supabase
        .from('messages')
        .select('booking_id, sender_id, receiver_id')
        .eq('id', relatedId)
        .single();

      if (messageById) {
        chatMessage = messageById;
      } else {
        const { data: messageByBooking } = await supabase
          .from('messages')
          .select('booking_id, sender_id, receiver_id, created_at')
          .eq('booking_id', relatedId)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (messageByBooking) {
          chatMessage = messageByBooking;
        }
      }

      if (!chatMessage) return false;

      const otherAuthUserId =
        chatMessage.sender_id === user.id ? chatMessage.receiver_id : chatMessage.sender_id;

      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('user_id', otherAuthUserId)
        .maybeSingle();

      const otherUserName = otherProfile
        ? `${otherProfile.first_name || ''} ${otherProfile.last_name || ''}`.trim() || 'Conversation'
        : 'Conversation';

      (navigation as any).navigate('Chat', {
        bookingId: chatMessage.booking_id,
        otherUserId: otherProfile?.id || otherAuthUserId,
        otherUserName,
      });

      return true;
    } catch (error) {
      console.error('Error opening related chat:', error);
      return false;
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'booking':
        if (notification.relatedId) {
          if (userRole === 'provider') {
            (navigation as any).navigate('ProviderMain', {
              screen: 'Appointments',
              params: { openBookingId: notification.relatedId },
            });
          } else {
            (navigation as any).navigate('CustomerMain', {
              screen: 'Bookings',
              params: { openBookingId: notification.relatedId },
            });
          }
        } else if (userRole === 'provider') {
          (navigation as any).navigate('ProviderMain', { screen: 'Appointments' });
        } else {
          (navigation as any).navigate('CustomerMain', { screen: 'Bookings' });
        }
        break;
      case 'message':
        if (notification.relatedId) {
          const opened = await openRelatedChat(notification.relatedId);
          if (opened) break;
        }
        if (userRole === 'provider') {
          (navigation as any).navigate('ProviderMain', { screen: 'Messages' });
        } else {
          (navigation as any).navigate('CustomerMain', { screen: 'Messages' });
        }
        break;
      case 'review':
        if (userRole === 'provider') {
          (navigation as any).navigate('Reviews');
        } else if (notification.relatedId) {
          (navigation as any).navigate('CustomerMain', {
            screen: 'Bookings',
            params: { openBookingId: notification.relatedId },
          });
        } else {
          (navigation as any).navigate('CustomerMain', { screen: 'Bookings' });
        }
        break;
      case 'payment':
        if (userRole === 'provider') {
          (navigation as any).navigate('Earnings');
        } else {
          (navigation as any).navigate('PaymentHistory');
        }
        break;
      default:
        break;
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase.from('notifications').delete().eq('id', notificationId);
      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return '📅';
      case 'message':
        return '💬';
      case 'review':
        return '⭐';
      case 'payment':
        return '💳';
      case 'system':
        return '🔔';
      default:
        return '•';
    }
  };

  const getNotificationDestinationHint = (notification: Notification) => {
    switch (notification.type) {
      case 'booking':
        return 'Opens booking details';
      case 'message':
        return 'Opens chat';
      case 'review':
        return userRole === 'provider' ? 'Opens reviews' : 'Opens booking details';
      case 'payment':
        return userRole === 'provider' ? 'Opens earnings' : 'Opens payment history';
      default:
        return 'Opens notifications';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
      onLongPress={() => {
        Alert.alert('Delete Notification', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteNotification(item.id),
          },
        ]);
      }}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{getNotificationIcon(item.type)}</Text>
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.title, !item.isRead && styles.unreadTitle]}>
            {item.title}
          </Text>
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.destinationHint} numberOfLines={1}>
          {getNotificationDestinationHint(item)}
        </Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={styles.container}>
      {/* Safe area spacer */}
      <View style={{ height: insets.top, backgroundColor: colors.white }} />

      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Notifications</Text>
        <View style={styles.backButton} />
      </View>

      {/* Unread Count Header */}
      {unreadCount > 0 && (
        <View style={styles.header}>
          <Text style={styles.headerText}>{unreadCount} unread notifications</Text>
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllButton}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptyDescription}>
            You're all caught up! We'll notify you when something new happens.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  markAllButton: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unreadNotification: {
    backgroundColor: colors.primarySubtle,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: fontSize.xl,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  unreadTitle: {
    fontWeight: '700',
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  destinationHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    opacity: 0.8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
    alignSelf: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
