import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import FadeInView from '../../components/animations/FadeInView';
import StaggeredList from '../../components/animations/StaggeredList';

interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  rating: number;
  comment: string | null;
  provider_response: string | null;
  provider_response_date: string | null;
  created_at: string;
  customer?: {
    id: string;
    profile?: {
      first_name: string;
      last_name: string;
      avatar_url: string | null;
    };
  };
  booking?: {
    provider_service?: {
      service?: {
        name: string;
      };
    };
  };
}

type FilterType = 'all' | '5' | '4' | '3' | '2' | '1' | 'responded' | 'not_responded';
type SortType = 'newest' | 'oldest' | 'highest' | 'lowest';

export default function ReviewsScreen() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    fiveStars: 0,
    fourStars: 0,
    threeStars: 0,
    twoStars: 0,
    oneStars: 0,
    responseRate: 0,
  });

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [reviews, filter, sort]);

  const fetchReviews = async () => {
    try {
      setLoading(true);

      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Fetch reviews with customer and service details
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select(`
          *,
          customer:customer_profiles!reviews_customer_id_fkey(
            id,
            profile:profiles(first_name, last_name, avatar_url)
          ),
          booking:bookings(
            provider_service:provider_services(
              service:services(name)
            )
          )
        `)
        .eq('provider_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(reviewsData || []);
      calculateStats(reviewsData || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      Alert.alert('Error', 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReviews();
    setRefreshing(false);
  };

  const calculateStats = (reviewsList: Review[]) => {
    const total = reviewsList.length;
    if (total === 0) {
      setStats({
        totalReviews: 0,
        averageRating: 0,
        fiveStars: 0,
        fourStars: 0,
        threeStars: 0,
        twoStars: 0,
        oneStars: 0,
        responseRate: 0,
      });
      return;
    }

    const avgRating = reviewsList.reduce((sum, r) => sum + r.rating, 0) / total;
    const fiveStars = reviewsList.filter((r) => r.rating === 5).length;
    const fourStars = reviewsList.filter((r) => r.rating === 4).length;
    const threeStars = reviewsList.filter((r) => r.rating === 3).length;
    const twoStars = reviewsList.filter((r) => r.rating === 2).length;
    const oneStars = reviewsList.filter((r) => r.rating === 1).length;
    const responded = reviewsList.filter((r) => r.provider_response).length;

    setStats({
      totalReviews: total,
      averageRating: parseFloat(avgRating.toFixed(2)),
      fiveStars,
      fourStars,
      threeStars,
      twoStars,
      oneStars,
      responseRate: parseFloat(((responded / total) * 100).toFixed(1)),
    });
  };

  const applyFiltersAndSort = () => {
    let filtered = [...reviews];

    // Apply filter
    if (filter === '5') filtered = filtered.filter((r) => r.rating === 5);
    else if (filter === '4') filtered = filtered.filter((r) => r.rating === 4);
    else if (filter === '3') filtered = filtered.filter((r) => r.rating === 3);
    else if (filter === '2') filtered = filtered.filter((r) => r.rating === 2);
    else if (filter === '1') filtered = filtered.filter((r) => r.rating === 1);
    else if (filter === 'responded') filtered = filtered.filter((r) => r.provider_response);
    else if (filter === 'not_responded') filtered = filtered.filter((r) => !r.provider_response);

    // Apply sort
    if (sort === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sort === 'highest') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'lowest') {
      filtered.sort((a, b) => a.rating - b.rating);
    }

    setFilteredReviews(filtered);
  };

  const handleRespondToReview = (review: Review) => {
    setSelectedReview(review);
    setResponseText(review.provider_response || '');
    setResponseModalVisible(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedReview || !responseText.trim()) {
      Alert.alert('Error', 'Please enter a response');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('reviews')
        .update({
          provider_response: responseText.trim(),
          provider_response_date: new Date().toISOString(),
        })
        .eq('id', selectedReview.id);

      if (error) throw error;

      Alert.alert('Success', 'Response submitted successfully');
      setResponseModalVisible(false);
      setSelectedReview(null);
      setResponseText('');
      await fetchReviews();
    } catch (error) {
      console.error('Error submitting response:', error);
      Alert.alert('Error', 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Text key={star} style={styles.star}>
            {star <= rating ? '⭐' : '☆'}
          </Text>
        ))}
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Statistics Section */}
        <View style={styles.statsContainer}>
          <View style={styles.mainStatCard}>
            <Text style={styles.mainStatValue}>{stats.averageRating.toFixed(1)}</Text>
            <View style={styles.starsContainer}>
              {renderStars(Math.round(stats.averageRating))}
            </View>
            <Text style={styles.mainStatLabel}>{stats.totalReviews} Reviews</Text>
          </View>

          <View style={styles.ratingBreakdown}>
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats[`${['five', 'four', 'three', 'two', 'one'][5 - rating]}Stars` as keyof typeof stats] as number;
              const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <View key={rating} style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>{rating}⭐</Text>
                  <View style={styles.ratingBar}>
                    <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
                  </View>
                  <Text style={styles.ratingCount}>{count}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.responseRateCard}>
            <Text style={styles.responseRateLabel}>Response Rate</Text>
            <Text style={styles.responseRateValue}>{stats.responseRate}%</Text>
          </View>
        </View>

        {/* Filters and Sort */}
        <View style={styles.controlsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            {(['all', '5', '4', '3', '2', '1', 'responded', 'not_responded'] as FilterType[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterButton, filter === f && styles.filterButtonActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterButtonText, filter === f && styles.filterButtonTextActive]}>
                  {f === 'all' ? 'All' : f === 'responded' ? 'Responded' : f === 'not_responded' ? 'Not Responded' : `${f}⭐`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.sortContainer}>
            <Text style={styles.sortLabel}>Sort:</Text>
            <TouchableOpacity
              style={[styles.sortButton, sort === 'newest' && styles.sortButtonActive]}
              onPress={() => setSort('newest')}
            >
              <Text style={[styles.sortButtonText, sort === 'newest' && styles.sortButtonTextActive]}>Newest</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sort === 'oldest' && styles.sortButtonActive]}
              onPress={() => setSort('oldest')}
            >
              <Text style={[styles.sortButtonText, sort === 'oldest' && styles.sortButtonTextActive]}>Oldest</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sort === 'highest' && styles.sortButtonActive]}
              onPress={() => setSort('highest')}
            >
              <Text style={[styles.sortButtonText, sort === 'highest' && styles.sortButtonTextActive]}>Highest</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sort === 'lowest' && styles.sortButtonActive]}
              onPress={() => setSort('lowest')}
            >
              <Text style={[styles.sortButtonText, sort === 'lowest' && styles.sortButtonTextActive]}>Lowest</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reviews List */}
        <View style={styles.reviewsContainer}>
          <Text style={styles.sectionTitle}>
            {filteredReviews.length} {filteredReviews.length === 1 ? 'Review' : 'Reviews'}
          </Text>

          {filteredReviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No reviews found</Text>
              <Text style={styles.emptyStateSubtext}>
                {filter === 'all'
                  ? 'You haven\'t received any reviews yet'
                  : 'Try adjusting your filters'}
              </Text>
            </View>
          ) : (
            filteredReviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                {/* Review Header */}
                <View style={styles.reviewHeader}>
                  <View style={styles.customerInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {review.customer?.profile?.first_name?.[0] || '?'}
                      </Text>
                    </View>
                    <View style={styles.customerDetails}>
                      <Text style={styles.customerName}>
                        {review.customer?.profile?.first_name} {review.customer?.profile?.last_name}
                      </Text>
                      <Text style={styles.serviceName}>
                        {review.booking?.provider_service?.service?.name || 'Service'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reviewMeta}>
                    {renderStars(review.rating)}
                    <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                  </View>
                </View>

                {/* Review Comment */}
                {review.comment && (
                  <View style={styles.reviewCommentContainer}>
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  </View>
                )}

                {/* Provider Response */}
                {review.provider_response ? (
                  <View style={styles.responseContainer}>
                    <View style={styles.responseHeader}>
                      <Text style={styles.responseLabel}>Your Response</Text>
                      <Text style={styles.responseDate}>
                        {formatDate(review.provider_response_date || review.created_at)}
                      </Text>
                    </View>
                    <Text style={styles.responseText}>{review.provider_response}</Text>
                    <TouchableOpacity
                      style={styles.editResponseButton}
                      onPress={() => handleRespondToReview(review)}
                    >
                      <Text style={styles.editResponseButtonText}>✏️ Edit Response</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.respondButton}
                    onPress={() => handleRespondToReview(review)}
                  >
                    <Text style={styles.respondButtonText}>💬 Respond to Review</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Response Modal */}
      <Modal
        visible={responseModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setResponseModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setResponseModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedReview?.provider_response ? 'Edit Response' : 'Respond to Review'}
            </Text>
            <View style={styles.modalPlaceholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Original Review */}
            {selectedReview && (
              <View style={styles.originalReview}>
                <Text style={styles.originalReviewLabel}>Original Review</Text>
                <View style={styles.originalReviewContent}>
                  {renderStars(selectedReview.rating)}
                  <Text style={styles.originalReviewCustomer}>
                    {selectedReview.customer?.profile?.first_name} {selectedReview.customer?.profile?.last_name}
                  </Text>
                  {selectedReview.comment && (
                    <Text style={styles.originalReviewComment}>{selectedReview.comment}</Text>
                  )}
                </View>
              </View>
            )}

            {/* Response Input */}
            <View style={styles.responseInputContainer}>
              <Text style={styles.responseInputLabel}>Your Response</Text>
              <TextInput
                style={styles.responseInput}
                placeholder="Write a professional response..."
                value={responseText}
                onChangeText={setResponseText}
                multiline
                numberOfLines={6}
                maxLength={500}
              />
              <Text style={styles.charCount}>{responseText.length}/500</Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmitResponse}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Submit Response</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
    backgroundColor: colors.background,
  },
  statsContainer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  mainStatCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  mainStatValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  mainStatLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  ratingBreakdown: {
    marginBottom: spacing.md,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ratingLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    width: 40,
  },
  ratingBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: 4,
  },
  ratingCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    width: 30,
    textAlign: 'right',
  },
  responseRateCard: {
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  responseRateLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  responseRateValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  controlsContainer: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  filtersScroll: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.background,
    marginRight: spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.primaryDarker,
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: colors.black,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  sortLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  sortButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    marginRight: spacing.xs,
  },
  sortButtonActive: {
    backgroundColor: colors.secondary + '20',
  },
  sortButtonText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  sortButtonTextActive: {
    color: colors.secondary,
    fontWeight: '600',
  },
  reviewsContainer: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyState: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  reviewCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  customerInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.black,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  serviceName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  reviewMeta: {
    alignItems: 'flex-end',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  star: {
    fontSize: fontSize.md,
    marginHorizontal: 1,
  },
  reviewDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  reviewCommentContainer: {
    marginBottom: spacing.md,
  },
  reviewComment: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  responseContainer: {
    backgroundColor: colors.primary + '08',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  responseLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  responseDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  responseText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  editResponseButton: {
    alignSelf: 'flex-start',
  },
  editResponseButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  respondButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  respondButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 24,
    color: colors.text,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalPlaceholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  originalReview: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  originalReviewLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  originalReviewContent: {
    gap: spacing.sm,
  },
  originalReviewCustomer: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  originalReviewComment: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  responseInputContainer: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  responseInputLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  responseInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.white,
  },
});

