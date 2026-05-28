import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Animated,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '../../utils/icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import { TOTAL_HEADER_HEIGHT } from '../../components/CurvedHeader';
import FadeInView from '../../components/animations/FadeInView';

type FilterType = 'all' | 'unread';

interface Conversation {
  id: string;
  booking_id: string | null;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  service_name?: string;
  is_support?: boolean;
}

export default function MessagesScreen() {
  useScreenTracking('CustomerMessages');
  const { user } = useAuth();
  const navigation = useNavigation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];

  // Calculate total unread count
  const totalUnread = useMemo(() =>
    conversations.reduce((sum, conv) => sum + conv.unread_count, 0),
    [conversations]
  );

  // Filter and search conversations
  const filteredConversations = useMemo(() => {
    let result = conversations;

    // Apply filter
    if (activeFilter === 'unread') {
      result = result.filter(conv => conv.unread_count > 0);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(conv =>
        conv.other_user_name.toLowerCase().includes(query) ||
        conv.last_message.toLowerCase().includes(query) ||
        (conv.service_name && conv.service_name.toLowerCase().includes(query))
      );
    }

    return result;
  }, [conversations, activeFilter, searchQuery]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    // Animate empty state when loading completes
    if (!loading && conversations.length === 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, conversations.length]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Use auth user ID directly (messages use auth.users.id)
      const authUserId = user.id;

      // Get all messages where this user is sender or receiver
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          booking_id,
          sender_id,
          receiver_id,
          message,
          created_at,
          is_read
        `)
        .or(`sender_id.eq.${authUserId},receiver_id.eq.${authUserId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by booking_id (or support thread key for booking_id = null)
      const conversationMap = new Map<string, any>();

      for (const msg of messages || []) {
        const otherAuthUserId = msg.sender_id === authUserId ? msg.receiver_id : msg.sender_id;
        const conversationKey = msg.booking_id || `support-${otherAuthUserId}`;
        const isSupportConversation = !msg.booking_id;

        if (!conversationMap.has(conversationKey)) {

          // Get other user's profile info using their auth user_id
          const { data: otherProfile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url')
            .eq('user_id', otherAuthUserId)
            .single();

          // Get booking info for service name (for non-support chats only)
          let serviceName: string | null = null;
          if (msg.booking_id) {
            const { data: booking } = await supabase
              .from('bookings')
              .select('provider_services(services(name))')
              .eq('id', msg.booking_id)
              .single();

            serviceName = (booking?.provider_services as any)?.services?.name || null;
          }

          // Count unread messages
          const unreadCount = messages.filter(
            m =>
                 (msg.booking_id
                   ? m.booking_id === msg.booking_id
                   : !m.booking_id &&
                     ((m.sender_id === otherAuthUserId && m.receiver_id === authUserId) ||
                      (m.sender_id === authUserId && m.receiver_id === otherAuthUserId))) &&
                 m.receiver_id === authUserId &&
                 !m.is_read
          ).length;

          conversationMap.set(conversationKey, {
            id: conversationKey,
            booking_id: msg.booking_id,
            other_user_id: isSupportConversation ? otherAuthUserId : (otherProfile?.id || otherAuthUserId),
            other_user_name: isSupportConversation
              ? 'Glamora Support'
              : (otherProfile
                  ? `${otherProfile.first_name} ${otherProfile.last_name}`
                  : 'Unknown User'),
            other_user_avatar: otherProfile?.avatar_url || null,
            last_message: msg.message,
            last_message_time: msg.created_at,
            unread_count: unreadCount,
            service_name: isSupportConversation ? 'Support' : serviceName,
            is_support: isSupportConversation,
          });
        }
      }

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load messages. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  const handleConversationPress = (conversation: Conversation) => {
    (navigation as any).navigate('Chat', {
      bookingId: conversation.booking_id,
      otherUserId: conversation.other_user_id,
      otherUserName: conversation.other_user_name,
      isSupportChat: !!conversation.is_support,
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if today
    if (date.toDateString() === now.toDateString()) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
      return `${displayHours}:${displayMinutes} ${ampm}`;
    }

    // Check if yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    // Check if within this week
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }

    // Otherwise show date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  const renderEmptyState = () => (
    <Animated.View
      style={[
        styles.emptyContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.emptyIconContainer}>
        <Ionicons name="chatbubbles-outline" size={80} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Your Inbox Awaits! 💬</Text>
      <Text style={styles.emptyText}>No conversations yet</Text>
      <View style={styles.emptyInfoBox}>
        <Text style={styles.emptyInfoTitle}>💡 Start chatting when you:</Text>
        <View style={styles.emptyInfoItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.emptyInfoText}>Book a service</Text>
        </View>
        <View style={styles.emptyInfoItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.emptyInfoText}>Ask a provider a question</Text>
        </View>
        <View style={styles.emptyInfoItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.emptyInfoText}>Confirm appointment details</Text>
        </View>
      </View>
      <Text style={styles.emptySubtext}>
        Browse services and book your first appointment to get started!
      </Text>
    </Animated.View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const hasUnread = item.unread_count > 0;
    return (
      <TouchableOpacity
        style={[styles.conversationItem, hasUnread && styles.conversationItemUnread]}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={item.other_user_avatar ? { uri: item.other_user_avatar } : require('../../../assets/icon.png')}
            style={styles.avatar}
          />
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <View style={styles.userNameRow}>
              <Text style={[styles.userName, hasUnread && styles.userNameUnread]} numberOfLines={1}>
                {item.other_user_name}
              </Text>
              {item.is_support && (
                <View style={styles.supportBadge}>
                  <Ionicons name="headset-outline" size={12} color={colors.primary} />
                  <Text style={styles.supportBadgeText}>Support</Text>
                </View>
              )}
            </View>
            <Text style={[styles.time, hasUnread && styles.timeUnread]}>
              {formatTime(item.last_message_time)}
            </Text>
          </View>
          {item.service_name && (
            <Text style={styles.serviceName} numberOfLines={1}>
              {item.service_name}
            </Text>
          )}
          <Text
            style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {item.last_message}
          </Text>
        </View>

        {hasUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unread_count > 99 ? '99+' : item.unread_count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSearchEmpty = () => (
    <View style={styles.searchEmptyContainer}>
      <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
      <Text style={styles.searchEmptyTitle}>No results found</Text>
      <Text style={styles.searchEmptyText}>
        Try a different search term or filter
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Search and Filter Section */}
        {conversations.length > 0 && (
          <View style={styles.searchFilterContainer}>
            {/* Search Bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search conversations..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
                onPress={() => setActiveFilter('all')}
              >
                <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, activeFilter === 'unread' && styles.filterTabActive]}
                onPress={() => setActiveFilter('unread')}
              >
                <Text style={[styles.filterTabText, activeFilter === 'unread' && styles.filterTabTextActive]}>
                  Unread
                </Text>
                {totalUnread > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Content */}
        {error && conversations.length === 0 ? (
          renderErrorState()
        ) : conversations.length === 0 ? (
          renderEmptyState()
        ) : filteredConversations.length === 0 ? (
          renderSearchEmpty()
        ) : (
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            renderItem={renderConversationItem}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  contentWrapper: {
    flex: 1,
    paddingTop: TOTAL_HEADER_HEIGHT, // Content starts below header
  },
  searchFilterContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.sm,
    paddingVertical: 0,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundGray,
  },
  filterTabActive: {
    backgroundColor: colors.softPink, // Soft pink/salmon for tab buttons
  },
  filterTabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.black,
  },
  filterBadge: {
    backgroundColor: colors.black,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  searchEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  searchEmptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  searchEmptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 120, // Space for floating tab bar + extra padding
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  emptyInfoBox: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyInfoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emptyInfoText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  conversationItemUnread: {
    backgroundColor: `${colors.primary}08`,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  conversationContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flexShrink: 1,
  },
  supportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primarySubtle,
    marginLeft: spacing.xs,
  },
  supportBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  userNameUnread: {
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  timeUnread: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  serviceName: {
    fontSize: fontSize.xs,
    color: colors.primary,
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  lastMessageUnread: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  unreadText: {
    color: colors.black,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
});

