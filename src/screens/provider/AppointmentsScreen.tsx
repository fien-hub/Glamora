import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '../../utils/icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, dbService } from '../../services/supabase';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import { trackBookingCompleted, trackBookingCancelled } from '../../utils/analytics';
import { sendRemotePushToProfile } from '../../utils/notifications';
import AnimatedCard from '../../components/AnimatedCard';
import AnimatedButton from '../../components/AnimatedButton';
import { SkeletonBookingList } from '../../components/SkeletonCards';
import BrandedRefreshControl from '../../components/BrandedRefreshControl';
import { TOTAL_HEADER_HEIGHT } from '../../components/CurvedHeader';
import FadeInView from '../../components/animations/FadeInView';

interface Booking {
  id: string;
  customer_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  total_price: number;
  location_address: string;
  customer_profiles: {
    first_name: string;
    last_name: string;
  };
  services: {
    name: string;
  };
}

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [highlightedBookingId, setHighlightedBookingId] = useState<string | null>(null);

  // Track screen view
  useScreenTracking('Provider Appointments');

  useEffect(() => {
    fetchBookings();
  }, [user]);

  useEffect(() => {
    const openBookingId = route.params?.openBookingId as string | undefined;
    if (!openBookingId || bookings.length === 0) return;

    const matchedBooking = bookings.find((booking) => booking.id === openBookingId);
    if (!matchedBooking) return;

    setFilter('all');
    setHighlightedBookingId(openBookingId);

    Alert.alert(
      'Booking Opened',
      `${matchedBooking.customer_profiles?.first_name || 'Customer'} • ${matchedBooking.services?.name || 'Service'}`
    );

    setTimeout(() => setHighlightedBookingId(null), 6000);
    navigation.setParams?.({ openBookingId: undefined });
  }, [route.params?.openBookingId, bookings]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      const { data, error } = await dbService.getBookings(user.id, 'provider');

      if (error) throw error;

      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  // Filter bookings based on selected filter
  const filteredBookings = useMemo(() => {
    const now = new Date();

    switch (filter) {
      case 'upcoming':
        return bookings.filter(b =>
          (b.status === 'pending' || b.status === 'confirmed') &&
          new Date(b.scheduled_date) >= now
        );
      case 'past':
        return bookings.filter(b =>
          b.status === 'completed' || b.status === 'cancelled' ||
          (new Date(b.scheduled_date) < now && b.status !== 'pending' && b.status !== 'confirmed')
        );
      default:
        return bookings;
    }
  }, [bookings, filter]);

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      // Get booking data for analytics
      const booking = bookings.find(b => b.id === bookingId);

      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      // Track booking status changes
      if (newStatus === 'completed' && booking) {
        trackBookingCompleted(bookingId, booking.total_price);
      } else if (newStatus === 'cancelled') {
        trackBookingCancelled(bookingId, 'provider_cancelled');
      }

      if (booking?.customer_id) {
        const serviceName = booking.services?.name || 'your service';
        const statusLabel = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);

        sendRemotePushToProfile(
          booking.customer_id,
          `Booking ${statusLabel}`,
          `Your booking for ${serviceName} is now ${newStatus}.`,
          {
            type: 'booking',
            bookingId,
            status: newStatus,
          },
          'booking'
        ).catch((pushError) => {
          console.error('[Appointments] Failed to send customer push:', pushError);
        });
      }

      Alert.alert('Success', `Booking ${newStatus}`);
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
      Alert.alert('Error', 'Failed to update booking');
    }
  };

  const confirmBooking = (bookingId: string) => {
    Alert.alert(
      'Confirm Booking',
      'Are you sure you want to confirm this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => handleUpdateStatus(bookingId, 'confirmed') },
      ]
    );
  };

  const completeBooking = (bookingId: string) => {
    Alert.alert(
      'Complete Booking',
      'Mark this booking as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: () => handleUpdateStatus(bookingId, 'completed') },
      ]
    );
  };

  const cancelBooking = (bookingId: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => handleUpdateStatus(bookingId, 'cancelled')
        },
      ]
    );
  };

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <SkeletonBookingList count={5} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Content Wrapper with Header Padding */}
      <View style={styles.contentWrapper}>
        {/* Filter Tabs - Segmented Control Style with fade-in animation */}
        <FadeInView delay={0}>
          <View style={styles.filterContainer}>
            <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All ({bookings.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'upcoming' && styles.filterTabActive]}
            onPress={() => setFilter('upcoming')}
          >
            <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>
              Upcoming
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'past' && styles.filterTabActive]}
            onPress={() => setFilter('past')}
          >
            <Text style={[styles.filterText, filter === 'past' && styles.filterTextActive]}>
              Past
            </Text>
          </TouchableOpacity>
        </View>
      </View>
        </FadeInView>

      {/* Appointments List */}
      <ScrollView
        style={styles.bookingsList}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <BrandedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No appointments found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all'
                ? 'You have no appointments yet'
                : `No ${filter} appointments`}
            </Text>
          </View>
        ) : (
          filteredBookings.map((booking) => (
            <AnimatedCard key={booking.id}>
              <View style={[styles.bookingCard, highlightedBookingId === booking.id && styles.bookingCardHighlighted]}>
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingHeaderLeft}>
                    <Text style={styles.customerName}>
                      {booking.customer_profiles?.first_name} {booking.customer_profiles?.last_name}
                    </Text>
                    <Text style={styles.serviceName}>{booking.services?.name}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                      {getStatusLabel(booking.status)}
                    </Text>
                  </View>
                </View>

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

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                  {booking.status === 'pending' && (
                    <>
                      <AnimatedButton
                        variant="primary"
                        onPress={() => confirmBooking(booking.id)}
                      >
                        <Text style={styles.confirmButtonText}>✓ Confirm</Text>
                      </AnimatedButton>
                      <AnimatedButton
                        variant="outline"
                        onPress={() => cancelBooking(booking.id)}
                      >
                        <Text style={styles.cancelButtonText}>Decline</Text>
                      </AnimatedButton>
                    </>
                  )}

                  {booking.status === 'confirmed' && (
                    <>
                      <AnimatedButton
                        variant="secondary"
                        onPress={() => completeBooking(booking.id)}
                      >
                        <Text style={styles.completeButtonText}>✓ Complete</Text>
                      </AnimatedButton>
                      <AnimatedButton
                        variant="outline"
                        onPress={() => cancelBooking(booking.id)}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </AnimatedButton>
                    </>
                  )}
                </View>
              </View>
            </AnimatedCard>
          ))
        )}
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  filterContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.round,
    padding: spacing.xs,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.softPink, // Soft pink/salmon for tab buttons
    ...shadows.sm,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.black,
    fontWeight: fontWeight.bold,
  },
  bookingsList: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.cardPadding,
    paddingBottom: 120, // Space for floating tab bar + extra padding
  },
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bookingCard: {
    padding: spacing.cardPadding,
  },
  bookingCardHighlighted: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bookingHeaderLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  customerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  serviceName: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
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
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  priceText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  completeButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});

