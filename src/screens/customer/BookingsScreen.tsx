import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius, lineHeight, shadows } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, dbService } from '../../services/supabase';
import ReviewModal from '../../components/ReviewModal';
import BookingDetailsModal from '../../components/BookingDetailsModal';
import ReportIssueModal from '../../components/ReportIssueModal';
import RescheduleModal from '../../components/RescheduleModal';
import { deleteCalendarEvent } from '../../utils/calendar';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import { trackBookingCancelled, trackBookingShared } from '../../utils/analytics';
import { shareContent, shareToWhatsApp, shareViaSMS } from '../../utils/socialSharing';
import AnimatedCard from '../../components/AnimatedCard';
import AnimatedButton from '../../components/AnimatedButton';
import { SkeletonBookingList } from '../../components/SkeletonCards';
import BrandedRefreshControl from '../../components/BrandedRefreshControl';
import BookingConfirmationAnimation from '../../components/BookingConfirmationAnimation';
import PillTabs from '../../components/PillTabs';
import { TOTAL_HEADER_HEIGHT } from '../../components/CurvedHeader';
import { Ionicons } from '@expo/vector-icons';
import FadeInView from '../../components/animations/FadeInView';

interface Booking {
  id: string;
  provider_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  total_price: number;
  location_address: string;
  is_recurring_instance: boolean;
  recurring_booking_id: string | null;
  instance_number: number | null;
  provider_profiles: {
    business_name: string;
  };
  services: {
    name: string;
  };
}

export default function BookingsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [reportIssueModalVisible, setReportIssueModalVisible] = useState(false);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);

  // Track screen view
  useScreenTracking('Customer Bookings');

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      const { data, error } = await dbService.getBookings(user.id, 'customer');

      if (error) throw error;

      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  // Get relative time for countdown timer
  const getRelativeTime = (scheduledDate: string, scheduledTime: string) => {
    const bookingDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const now = new Date();
    const diffMs = bookingDateTime.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) return null; // Past booking
    if (diffHours < 1) return 'Starting soon!';
    if (diffHours < 24) return `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    if (diffDays === 1) return `Tomorrow at ${scheduledTime}`;
    if (diffDays < 7) return `In ${diffDays} days`;
    return null;
  };

  // Handle message provider
  const handleMessageProvider = async (booking: any) => {
    try {
      console.log('[Message Provider] Getting provider user_id for provider_id:', booking.provider_id);

      // Get provider's auth user_id from provider_profiles
      const { data: providerProfile, error: providerError } = await supabase
        .from('provider_profiles')
        .select('profiles!provider_profiles_id_fkey(user_id)')
        .eq('id', booking.provider_id)
        .single();

      if (providerError || !providerProfile) {
        console.error('[Message Provider] Error fetching provider profile:', providerError);
        Alert.alert('Error', 'Could not open chat. Please try again.');
        return;
      }

      const providerUserId = (providerProfile as any).profiles.user_id;
      console.log('[Message Provider] Provider user_id:', providerUserId);

      // Navigate to chat screen with auth user ID
      (navigation as any).navigate('Chat', {
        bookingId: booking.id,
        otherUserId: providerUserId,
        otherUserName: booking.provider_profiles?.business_name || 'Provider',
      });
    } catch (error) {
      console.error('[Message Provider] Error:', error);
      Alert.alert('Error', 'Could not open chat. Please try again.');
    }
  };

  // Handle get directions
  const handleGetDirections = (booking: any) => {
    const address = booking.address || booking.location_address;
    if (!address) {
      Alert.alert('No Address', 'No address available for this booking.');
      return;
    }

    const encodedAddress = encodeURIComponent(address);
    const url = Platform.OS === 'ios'
      ? `maps://app?daddr=${encodedAddress}`
      : `geo:0,0?q=${encodedAddress}`;

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to Google Maps web
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
      }
    });
  };

  // Handle view provider profile
  const handleViewProvider = (providerId: string) => {
    (navigation as any).navigate('ProviderPortfolio', { providerId });
  };

  // Handle delete booking
  const handleDeleteBooking = async (bookingId: string) => {
    Alert.alert(
      'Delete Booking',
      'Are you sure you want to permanently delete this booking? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('bookings')
                .delete()
                .eq('id', bookingId);

              if (error) throw error;

              Alert.alert('Success', 'Booking deleted successfully');
              fetchBookings();
            } catch (error) {
              console.error('Error deleting booking:', error);
              Alert.alert('Error', 'Failed to delete booking');
            }
          },
        },
      ]
    );
  };

  const handleCancelBooking = useCallback(async (bookingId: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get booking to check for calendar event ID
              const { data: bookingData, error: fetchError } = await supabase
                .from('bookings')
                .select('customer_calendar_event_id')
                .eq('id', bookingId)
                .single();

              if (fetchError) throw fetchError;

              // Update booking status
              const { error } = await supabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', bookingId);

              if (error) throw error;

              // Delete calendar event if it exists
              if (bookingData?.customer_calendar_event_id) {
                await deleteCalendarEvent(bookingData.customer_calendar_event_id);
              }

              // Track booking cancellation
              trackBookingCancelled(bookingId, 'user_cancelled');

              Alert.alert('Success', 'Booking cancelled');
              fetchBookings();
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking');
            }
          },
        },
      ]
    );
  }, [fetchBookings]);

  const filteredBookings = useMemo(() => {
    const now = new Date();

    if (filter === 'upcoming') {
      return bookings.filter(b =>
        (b.status === 'pending' || b.status === 'confirmed') &&
        new Date(b.scheduled_date) >= now
      );
    } else if (filter === 'past') {
      return bookings.filter(b =>
        b.status === 'completed' || b.status === 'cancelled' ||
        new Date(b.scheduled_date) < now
      );
    }
    return bookings;
  }, [bookings, filter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'confirmed': return colors.success;
      case 'completed': return colors.secondary;
      case 'cancelled': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const handleShareBooking = async (booking: Booking) => {
    const date = new Date(booking.scheduled_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const time = booking.scheduled_time;
    const providerName = (booking as any).provider_profiles?.business_name || 'Provider';
    const serviceName = (booking as any).provider_services?.services?.name || 'Service';
    const price = booking.total_price ? (booking.total_price / 100).toFixed(2) : '0.00';

    const message = `My Glamora Booking\n\nService: ${serviceName}\nProvider: ${providerName}\nDate: ${date}\nTime: ${time}\nPrice: $${price}\nLocation: ${booking.location_address}\n\nBooked via Glamora - Beauty services at home!\nhttps://glamora.app`;

    Alert.alert(
      'Share Booking',
      'How would you like to share your booking?',
      [
        {
          text: 'WhatsApp',
          onPress: async () => {
            const success = await shareToWhatsApp(message);
            if (success) {
              trackBookingShared(booking.id, 'whatsapp', booking.status);
            }
          },
        },
        {
          text: 'Message',
          onPress: async () => {
            const success = await shareViaSMS(message);
            if (success) {
              trackBookingShared(booking.id, 'sms', booking.status);
            }
          },
        },
        {
          text: 'More Options',
          onPress: async () => {
            const success = await shareContent({
              title: 'My Glamora Booking',
              message,
            });
            if (success) {
              trackBookingShared(booking.id, 'general', booking.status);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <SkeletonBookingList count={5} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Filter Tabs - Pill Tabs with fade-in animation */}
        <FadeInView delay={0}>
          <View style={styles.filterContainer}>
            <PillTabs
              tabs={[`All (${bookings.length})`, 'Upcoming', 'Past']}
              activeTab={filter === 'all' ? `All (${bookings.length})` : filter === 'upcoming' ? 'Upcoming' : 'Past'}
              onTabChange={(tab) => {
                if (tab.startsWith('All')) setFilter('all');
                else if (tab === 'Upcoming') setFilter('upcoming');
                else if (tab === 'Past') setFilter('past');
              }}
            />
          </View>
        </FadeInView>

        {/* Bookings List */}
        <ScrollView
          style={styles.bookingsList}
          contentContainerStyle={styles.scrollContent}
        refreshControl={
          <BrandedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'No Bookings Yet' : `No ${filter.charAt(0).toUpperCase() + filter.slice(1)} Bookings`}
            </Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all'
                ? 'Discover amazing beauty services and book your first appointment!'
                : `You don't have any ${filter} bookings at the moment.`}
            </Text>
            {filter === 'all' && (
              <AnimatedButton
                variant="primary"
                onPress={() => (navigation as any).navigate('Search')}
              >
                <Text style={styles.emptyStateButtonText}>Find Your First Service</Text>
              </AnimatedButton>
            )}
          </View>
        ) : (
          filteredBookings.map((booking) => (
            <AnimatedCard key={booking.id}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedBooking(booking);
                  setDetailsModalVisible(true);
                }}
              >
                <View style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <View style={styles.bookingHeaderLeft}>
                      <TouchableOpacity onPress={() => handleViewProvider(booking.provider_id)}>
                        <Text style={[styles.providerName, styles.providerNameLink]}>
                          {(booking as any).provider_profiles?.business_name || 'Provider'} →
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.serviceName}>
                        {(booking as any).provider_services?.services?.name || 'Service'}
                      </Text>
                      {booking.is_recurring_instance && (
                        <View style={styles.recurringBadge}>
                          <Text style={styles.recurringBadgeText}>
                            🔄 Recurring {booking.instance_number ? `#${booking.instance_number}` : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                        {getStatusLabel(booking.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Countdown Timer for upcoming bookings */}
                  {(booking.status === 'pending' || booking.status === 'confirmed') &&
                   getRelativeTime(booking.scheduled_date, booking.scheduled_time) && (
                    <View style={styles.countdownContainer}>
                      <Text style={styles.countdownText}>
                        {getRelativeTime(booking.scheduled_date, booking.scheduled_time)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.bookingDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{new Date(booking.scheduled_date).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{booking.scheduled_time}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{booking.location_address}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="cash-outline" size={16} color={colors.success} />
                      <Text style={styles.priceText}>${(booking.total_price / 100).toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.actionButtonsContainer}>
                {/* Message Provider - Available for all statuses */}
                <AnimatedButton
                  variant="secondary"
                  onPress={() => handleMessageProvider(booking)}
                  style={styles.actionButton}
                >
                  <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                  <Text style={styles.actionButtonText}>Message</Text>
                </AnimatedButton>

                {/* Get Directions - Available for pending/confirmed */}
                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                  <AnimatedButton
                    variant="secondary"
                    onPress={() => handleGetDirections(booking)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                    <Text style={styles.actionButtonText}>Directions</Text>
                  </AnimatedButton>
                )}

                {/* Reschedule - Available for pending/confirmed */}
                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                  <AnimatedButton
                    variant="secondary"
                    onPress={() => {
                      setSelectedBooking(booking);
                      setRescheduleModalVisible(true);
                    }}
                    style={styles.actionButton}
                  >
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <Text style={styles.actionButtonText}>Reschedule</Text>
                  </AnimatedButton>
                )}

                {/* Cancel - Available for pending/confirmed */}
                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                  <AnimatedButton
                    variant="outline"
                    onPress={() => handleCancelBooking(booking.id)}
                    style={styles.actionButton}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </AnimatedButton>
                )}

                {/* Review - Available for completed */}
                {booking.status === 'completed' && (
                  <AnimatedButton
                    variant="primary"
                    onPress={() => {
                      setSelectedBooking(booking);
                      setReviewModalVisible(true);
                    }}
                    style={styles.actionButton}
                  >
                    <Ionicons name="star-outline" size={16} color={colors.white} />
                    <Text style={styles.reviewButtonText}>Review</Text>
                  </AnimatedButton>
                )}

                {/* Report Issue - Available for completed */}
                {booking.status === 'completed' && (
                  <AnimatedButton
                    variant="outline"
                    onPress={() => {
                      setSelectedBooking(booking);
                      setReportIssueModalVisible(true);
                    }}
                    style={styles.actionButton}
                  >
                    <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                    <Text style={styles.reportButtonText}>Report</Text>
                  </AnimatedButton>
                )}

                {/* Delete - Available for cancelled bookings */}
                {booking.status === 'cancelled' && (
                  <AnimatedButton
                    variant="outline"
                    onPress={() => handleDeleteBooking(booking.id)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </AnimatedButton>
                )}
              </View>
            </AnimatedCard>
          ))
        )}
      </ScrollView>

      {/* Review Modal */}
      {selectedBooking && (
        <ReviewModal
          visible={reviewModalVisible}
          onClose={() => setReviewModalVisible(false)}
          booking={selectedBooking}
          onSuccess={() => {
            fetchBookings();
            setShowConfirmation(true);
          }}
        />
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <BookingDetailsModal
          visible={detailsModalVisible}
          onClose={() => setDetailsModalVisible(false)}
          booking={selectedBooking}
        />
      )}

      {/* Report Issue Modal */}
      {selectedBooking && (
        <ReportIssueModal
          visible={reportIssueModalVisible}
          onClose={() => setReportIssueModalVisible(false)}
          booking={selectedBooking}
        />
      )}

      {/* Reschedule Modal */}
      {selectedBooking && (
        <RescheduleModal
          visible={rescheduleModalVisible}
          onClose={() => setRescheduleModalVisible(false)}
          bookingId={selectedBooking.id}
          providerId={selectedBooking.provider_id}
          serviceDuration={(selectedBooking as any).provider_services?.duration_minutes || 60}
          currentDate={selectedBooking.scheduled_date}
          currentTime={selectedBooking.scheduled_time}
          onSuccess={() => {
            fetchBookings();
            setShowConfirmation(true);
          }}
        />
      )}

      {/* Booking Confirmation Animation */}
      <BookingConfirmationAnimation
        visible={showConfirmation}
        onComplete={() => setShowConfirmation(false)}
      />
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
  scrollContent: {
    paddingBottom: 100, // Space for floating tab bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  filterContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    fontWeight: fontWeight.semibold,
  },
  bookingsList: {
    flex: 1,
    padding: spacing.screenPadding,
  },
  emptyState: {
    padding: spacing.sectionSpacing,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
    lineHeight: fontSize.title * lineHeight.tight,
  },
  emptySubtext: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.body * lineHeight.normal,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    maxWidth: 300,
  },
  emptyStateButtonText: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  bookingCard: {
    // AnimatedCard handles background, border radius, padding, and shadows
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bookingHeaderLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  providerName: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: fontSize.bodyLarge * lineHeight.normal,
  },
  serviceName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: fontSize.body * lineHeight.normal,
  },
  recurringBadge: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  recurringBadgeText: {
    fontSize: fontSize.caption,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  statusBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  statusText: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.medium,
  },
  bookingDetails: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  detailText: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
    lineHeight: fontSize.subtitle * lineHeight.normal,
  },
  priceText: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.secondary,
    marginTop: spacing.sm,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: colors.tertiarySubtle,
    borderWidth: 1,
    borderColor: colors.tertiaryLight,
  },
  shareButtonText: {
    color: colors.tertiary,
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.medium,
  },
  cancelButton: {
    backgroundColor: colors.errorLight,
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.medium,
  },
  reviewButton: {
    backgroundColor: colors.primary,
  },
  reviewButtonText: {
    color: colors.black,
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semibold,
  },
  providerNameLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  countdownContainer: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  countdownText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  reportButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.error,
    marginLeft: spacing.xs,
  },
  deleteButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.error,
    marginLeft: spacing.xs,
  },
});

