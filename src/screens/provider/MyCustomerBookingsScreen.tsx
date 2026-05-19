import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import PillTabs from '../../components/PillTabs';
import ReviewModal from '../../components/ReviewModal';
import BookingDetailsModal from '../../components/BookingDetailsModal';
import ReportIssueModal from '../../components/ReportIssueModal';
import RescheduleModal from '../../components/RescheduleModal';
import AnimatedCard from '../../components/AnimatedCard';
import { SkeletonBookingList } from '../../components/SkeletonCards';
import BrandedRefreshControl from '../../components/BrandedRefreshControl';
import { sendRemotePushToProfile } from '../../utils/notifications';

interface Booking {
  id: string;
  provider_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  total_price: number;
  address: string;
  city: string;
  state: string;
  location_address?: string;
  provider_profiles: {
    business_name: string;
  };
  provider_services: {
    services: {
      name: string;
    };
  };
  services?: {
    name: string;
  };
}

export default function MyCustomerBookingsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [reportIssueModalVisible, setReportIssueModalVisible] = useState(false);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      // Get the profile ID for this user
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Get customer_profiles ID (same as profile ID)
      const { data: customerProfile } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('id', profile.id)
        .single();

      if (!customerProfile) {
        setLoading(false);
        return;
      }

      // Fetch bookings where this user is the customer
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          provider_id,
          scheduled_date,
          scheduled_time,
          status,
          total_price,
          address,
          city,
          state,
          provider_profiles (
            business_name
          ),
          provider_services (
            services (
              name
            )
          )
        `)
        .eq('customer_id', customerProfile.id)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      setBookings((data || []).map((b: any) => ({
        ...b,
        provider_profiles: Array.isArray(b.provider_profiles) ? b.provider_profiles[0] : b.provider_profiles,
        provider_services: Array.isArray(b.provider_services) ? b.provider_services[0] : b.provider_services,
      })));
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  }, []);

  const filteredBookings = bookings.filter((booking) => {
    const bookingDate = new Date(booking.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filter === 'upcoming') {
      return bookingDate >= today && booking.status !== 'cancelled';
    } else if (filter === 'past') {
      return bookingDate < today || booking.status === 'completed';
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return colors.success;
      case 'pending': return colors.warning;
      case 'completed': return colors.primary;
      case 'cancelled': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleCancelBooking = (booking: Booking) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? This action cannot be undone.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', booking.id);

              if (error) throw error;

              sendRemotePushToProfile(
                booking.provider_id,
                'Booking Cancelled',
                `A customer cancelled their ${booking.provider_services?.services?.name || 'service'} booking.`,
                {
                  type: 'booking',
                  bookingId: booking.id,
                  status: 'cancelled',
                },
                'booking'
              ).catch((pushError) => {
                console.error('[MyBookings] Failed to send provider push:', pushError);
              });

              Alert.alert('Success', 'Booking has been cancelled.');
              fetchBookings();
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleReschedule = (booking: Booking) => {
    setSelectedBooking(booking);
    setRescheduleModalVisible(true);
  };

  const handleLeaveReview = (booking: Booking) => {
    setSelectedBooking(booking);
    setReviewModalVisible(true);
  };

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setDetailsModalVisible(true);
  };

  const handleReportIssue = (booking: Booking) => {
    setSelectedBooking(booking);
    setReportIssueModalVisible(true);
  };

  const handleChat = (booking: Booking) => {
    navigation.navigate('Chat', {
      bookingId: booking.id,
      otherUserId: booking.provider_id,
      otherUserName: booking.provider_profiles?.business_name || 'Provider',
    });
  };

  const isUpcoming = (booking: Booking) => {
    const bookingDate = new Date(booking.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookingDate >= today && booking.status !== 'cancelled' && booking.status !== 'completed';
  };

  const canCancel = (booking: Booking) => {
    return isUpcoming(booking) && booking.status !== 'cancelled';
  };

  const canReschedule = (booking: Booking) => {
    return isUpcoming(booking) && booking.status !== 'cancelled';
  };

  const canReview = (booking: Booking) => {
    return booking.status === 'completed';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <SkeletonBookingList count={3} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>Services you've booked from other providers</Text>

      <View style={styles.tabsContainer}>
        <PillTabs
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'past', label: 'Past' },
          ]}
          activeTab={filter}
          onTabChange={(tab) => setFilter(tab as 'all' | 'upcoming' | 'past')}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <BrandedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyText}>
              When you book services from other providers, they'll appear here
            </Text>
          </View>
        ) : (
          filteredBookings.map((booking, index) => (
            <AnimatedCard key={booking.id} entranceDelay={index * 100}>
              <View style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <Text style={styles.serviceName}>
                    {booking.provider_services?.services?.name || booking.services?.name || 'Service'}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.providerName}>
                  {booking.provider_profiles?.business_name || 'Provider'}
                </Text>

                <View style={styles.bookingDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>{formatDate(booking.scheduled_date)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>{formatTime(booking.scheduled_time)}</Text>
                  </View>
                </View>

                <View style={styles.bookingFooter}>
                  <Text style={styles.address}>
                    📍 {booking.address || booking.location_address || ''}{booking.city ? `, ${booking.city}` : ''}
                  </Text>
                  <Text style={styles.price}>${(booking.total_price / 100).toFixed(2)}</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                  {/* Primary action row */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleViewDetails(booking)}
                    >
                      <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                      <Text style={styles.actionButtonText}>Details</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleChat(booking)}
                    >
                      <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                      <Text style={styles.actionButtonText}>Chat</Text>
                    </TouchableOpacity>

                    {canReview(booking) && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.reviewButton]}
                        onPress={() => handleLeaveReview(booking)}
                      >
                        <Ionicons name="star-outline" size={18} color={colors.white} />
                        <Text style={[styles.actionButtonText, styles.reviewButtonText]}>Review</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Secondary action row for upcoming bookings */}
                  {isUpcoming(booking) && (
                    <View style={styles.actionRow}>
                      {canReschedule(booking) && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.secondaryButton]}
                          onPress={() => handleReschedule(booking)}
                        >
                          <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Reschedule</Text>
                        </TouchableOpacity>
                      )}

                      {canCancel(booking) && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.cancelButton]}
                          onPress={() => handleCancelBooking(booking)}
                        >
                          <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                          <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Report issue for completed/past bookings */}
                  {booking.status === 'completed' && (
                    <TouchableOpacity
                      style={styles.reportButton}
                      onPress={() => handleReportIssue(booking)}
                    >
                      <Ionicons name="flag-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.reportButtonText}>Report an issue</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </AnimatedCard>
          ))
        )}
      </ScrollView>

      {/* Modals */}
      {selectedBooking && (
        <>
          <ReviewModal
            visible={reviewModalVisible}
            onClose={() => {
              setReviewModalVisible(false);
              setSelectedBooking(null);
            }}
            booking={{
              id: selectedBooking.id,
              provider_id: selectedBooking.provider_id,
              provider_profiles: { business_name: selectedBooking.provider_profiles?.business_name || 'Provider' },
              services: { name: selectedBooking.provider_services?.services?.name || selectedBooking.services?.name || 'Service' },
            }}
            onSuccess={() => {
              setReviewModalVisible(false);
              setSelectedBooking(null);
              fetchBookings();
            }}
          />

          <BookingDetailsModal
            visible={detailsModalVisible}
            onClose={() => {
              setDetailsModalVisible(false);
              setSelectedBooking(null);
            }}
            booking={{
              ...selectedBooking,
              provider_profiles: selectedBooking.provider_profiles,
              services: selectedBooking.provider_services?.services || selectedBooking.services,
              location_address: selectedBooking.address || selectedBooking.location_address,
            }}
          />

          <ReportIssueModal
            visible={reportIssueModalVisible}
            onClose={() => {
              setReportIssueModalVisible(false);
              setSelectedBooking(null);
            }}
            booking={selectedBooking}
          />

          <RescheduleModal
            visible={rescheduleModalVisible}
            onClose={() => {
              setRescheduleModalVisible(false);
              setSelectedBooking(null);
            }}
            bookingId={selectedBooking.id}
            providerId={selectedBooking.provider_id}
            serviceDuration={(selectedBooking.provider_services as any)?.duration_minutes || 60}
            currentDate={selectedBooking.scheduled_date}
            currentTime={selectedBooking.scheduled_time}
            onSuccess={() => {
              setRescheduleModalVisible(false);
              setSelectedBooking(null);
              fetchBookings();
              Alert.alert('Success', 'Your booking has been rescheduled.');
            }}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  tabsContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  bookingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  serviceName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  providerName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  bookingDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  address: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    flex: 1,
  },
  price: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  actionsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  reviewButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reviewButtonText: {
    color: colors.black,
  },
  secondaryButton: {
    borderColor: colors.border,
    backgroundColor: colors.backgroundGray,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
  },
  cancelButton: {
    borderColor: colors.error,
    backgroundColor: colors.white,
  },
  cancelButtonText: {
    color: colors.error,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  reportButtonText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
