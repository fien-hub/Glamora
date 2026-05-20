import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '../utils/icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { analytics } from '../services/analytics';
import FeedPostCard from './FeedPostCard';
import BrandedRefreshControl from './BrandedRefreshControl';
import { SkeletonFeedCard } from './SkeletonLoader';
let Haptics: typeof import('expo-haptics') = {} as any;
try { Haptics = require('expo-haptics'); } catch (e) { console.warn('[TrendingFeed] expo-haptics unavailable:', e); }

interface TrendingPost {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_avatar?: string;
  provider_rating: number;
  provider_reviews: number;
  image_url: string;
  caption?: string;
  is_verified: boolean;
  like_count: number;
  view_count: number;
  is_liked: boolean;
  is_saved: boolean;
  engagement_score: number;
  tags?: string[];
  provider_service_id?: string;
  service_name?: string;
  service_price?: number;
}

interface TimeRangeOption {
  label: string;
  hours: number;
}

const TIME_RANGES: TimeRangeOption[] = [
  { label: '24h', hours: 24 },
  { label: '7d', hours: 168 },
  { label: '30d', hours: 720 },
];

export default function TrendingFeed() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState(TIME_RANGES[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrendingPosts();
  }, [selectedTimeRange]);

  const loadTrendingPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get trending post IDs from analytics
      const { data: trendingData, error: trendingError } = await supabase
        .rpc('get_trending_posts', {
          hours_back: selectedTimeRange.hours,
          limit_count: 20,
        });

      if (trendingError) throw trendingError;

      if (!trendingData || trendingData.length === 0) {
        setTrendingPosts([]);
        return;
      }

      // Get full post details
      const postIds = trendingData.map((item: any) => item.post_id);
      
      const { data: postsData, error: postsError } = await supabase
        .from('portfolio_items')
        .select(`
          id,
          image_url,
          caption,
          like_count,
          view_count,
          provider_profiles!inner (
            id,
            business_name,
            avatar_url,
            rating,
            total_reviews,
            is_verified
          )
        `)
        .in('id', postIds)
        .eq('is_visible', true);

      if (postsError) throw postsError;

      // Get user's likes and saves
      let userLikes: string[] = [];
      let userSaves: string[] = [];

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          const [likesResult, savesResult] = await Promise.all([
            supabase
              .from('portfolio_likes')
              .select('portfolio_item_id')
              .eq('profile_id', profileData.id),
            supabase
              .from('portfolio_saves')
              .select('portfolio_item_id')
              .eq('profile_id', profileData.id),
          ]);

          userLikes = likesResult.data?.map(l => l.portfolio_item_id) || [];
          userSaves = savesResult.data?.map(s => s.portfolio_item_id) || [];
        }
      }

      // Map to TrendingPost format with engagement scores
      const posts: TrendingPost[] = postsData.map((post: any) => {
        const trendingInfo = trendingData.find((t: any) => t.post_id === post.id);
        return {
          id: post.id,
          provider_id: post.provider_profiles.id,
          provider_name: post.provider_profiles.business_name,
          provider_avatar: post.provider_profiles.avatar_url,
          provider_rating: post.provider_profiles.rating || 0,
          provider_reviews: post.provider_profiles.total_reviews || 0,
          image_url: post.image_url,
          caption: post.caption,
          is_verified: post.provider_profiles.is_verified || false,
          like_count: post.like_count || 0,
          view_count: post.view_count || 0,
          is_liked: userLikes.includes(post.id),
          is_saved: userSaves.includes(post.id),
          engagement_score: trendingInfo?.engagement_score || 0,
          tags: [], // Tags column not yet in database
        };
      });

      // Sort by engagement score
      posts.sort((a, b) => b.engagement_score - a.engagement_score);

      setTrendingPosts(posts);
      
      // Track analytics
      analytics.track('trending_view', {
        time_range: selectedTimeRange.label,
        post_count: posts.length,
      }, user?.id);
    } catch (error) {
      console.error('Error loading trending posts:', error);
      setError('Failed to load trending posts');
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTrendingPosts();
    setRefreshing(false);
  };

  const handlePostPress = (post: TrendingPost) => {
    // Record view
    recordView(post.id, post.provider_id);
    // Navigate to provider portfolio
    (navigation as any).navigate('ProviderPortfolio', { providerId: post.provider_id });
  };

  const handleBookPress = (post: TrendingPost) => {
    analytics.trackBookingStart(post.id, post.provider_id, user?.id);
    (navigation as any).navigate('Booking', {
      providerId: post.provider_id,
      portfolioItemId: post.id,
      serviceId: post.provider_service_id, // Pre-select service if tagged
    });
  };

  const recordView = async (portfolioItemId: string, providerId: string) => {
    try {
      analytics.trackPostView(portfolioItemId, providerId, user?.id);

      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) return;

      await supabase.from('portfolio_views').insert({
        portfolio_item_id: portfolioItemId,
        customer_id: profileData.id,
      });
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const handleLikePress = async (post: TrendingPost) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to like posts');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const isLiking = !post.is_liked;
    setTrendingPosts(prev =>
      prev.map(p =>
        p.id === post.id
          ? {
              ...p,
              is_liked: isLiking,
              like_count: isLiking ? p.like_count + 1 : Math.max(0, p.like_count - 1),
            }
          : p
      )
    );

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        setTrendingPosts(prev =>
          prev.map(p =>
            p.id === post.id
              ? {
                  ...p,
                  is_liked: post.is_liked,
                  like_count: post.like_count,
                }
              : p
          )
        );
        return;
      }

      if (post.is_liked) {
        const { error } = await supabase
          .from('portfolio_likes')
          .delete()
          .eq('portfolio_item_id', post.id)
          .eq('profile_id', profileData.id);

        if (error) throw error;
        analytics.trackUnlike(post.id, post.provider_id, user?.id);
      } else {
        const { error } = await supabase.from('portfolio_likes').insert({
          portfolio_item_id: post.id,
          profile_id: profileData.id,
        });

        if (error) throw error;
        analytics.trackLike(post.id, post.provider_id, user?.id);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setTrendingPosts(prev =>
        prev.map(p =>
          p.id === post.id
            ? {
                ...p,
                is_liked: post.is_liked,
                like_count: post.like_count,
              }
            : p
        )
      );
    }
  };

  const handleSavePress = async (post: TrendingPost) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to save posts');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const isSaving = !post.is_saved;
    setTrendingPosts(prev =>
      prev.map(p => (p.id === post.id ? { ...p, is_saved: isSaving } : p))
    );

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        setTrendingPosts(prev =>
          prev.map(p => (p.id === post.id ? { ...p, is_saved: post.is_saved } : p))
        );
        return;
      }

      if (post.is_saved) {
        const { error } = await supabase
          .from('portfolio_saves')
          .delete()
          .eq('portfolio_item_id', post.id)
          .eq('profile_id', profileData.id);

        if (error) throw error;
        analytics.trackUnsave(post.id, post.provider_id, user?.id);
      } else {
        const { error } = await supabase.from('portfolio_saves').insert({
          portfolio_item_id: post.id,
          profile_id: profileData.id,
        });

        if (error) throw error;
        analytics.trackSave(post.id, post.provider_id, user?.id);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      setTrendingPosts(prev =>
        prev.map(p => (p.id === post.id ? { ...p, is_saved: post.is_saved } : p))
      );
    }
  };

  const renderPost = ({ item }: { item: TrendingPost }) => (
    <View style={styles.gridItem}>
      <FeedPostCard
        providerName={item.provider_name}
        providerAvatar={item.provider_avatar || undefined}
        postImage={item.image_url}
        serviceName={item.service_name || item.caption || 'View Portfolio'}
        servicePrice={item.service_price ? item.service_price / 100 : undefined}
        distance={`🔥 ${item.engagement_score.toFixed(1)} score`}
        caption={item.caption}
        likeCount={item.like_count}
        viewCount={item.view_count}
        isLiked={item.is_liked}
        isSaved={item.is_saved}
        isVerified={item.is_verified}
        hasServiceTag={!!item.provider_service_id}
        onPress={() => handlePostPress(item)}
        onBookPress={() => handleBookPress(item)}
        onLikePress={() => handleLikePress(item)}
        onSavePress={() => handleSavePress(item)}
      />
    </View>
  );

  const renderEmpty = () => {
    if (!initialLoadComplete) {
      return null;
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.emptyText}>Oops! Something went wrong</Text>
          <Text style={styles.emptySubtext}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => handleRefresh()}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trending-up-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No Trending Posts Yet</Text>
        <Text style={styles.emptySubtext}>
          Check back later to see what's hot!
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Ionicons name="flame" size={24} color={colors.error} />
        <Text style={styles.title}>Trending Now</Text>
      </View>
      <View style={styles.timeRangeContainer}>
        {TIME_RANGES.map((range) => (
          <TouchableOpacity
            key={range.label}
            style={[
              styles.timeRangeButton,
              selectedTimeRange.hours === range.hours && styles.timeRangeButtonActive,
            ]}
            onPress={() => setSelectedTimeRange(range)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.timeRangeText,
                selectedTimeRange.hours === range.hours && styles.timeRangeTextActive,
              ]}
            >
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.gridRow}>
          <View style={styles.gridItem}>
            <SkeletonFeedCard />
          </View>
          <View style={styles.gridItem}>
            <SkeletonFeedCard />
          </View>
        </View>
        <View style={styles.gridRow}>
          <View style={styles.gridItem}>
            <SkeletonFeedCard />
          </View>
          <View style={styles.gridItem}>
            <SkeletonFeedCard />
          </View>
        </View>
        <View style={styles.gridRow}>
          <View style={styles.gridItem}>
            <SkeletonFeedCard />
          </View>
          <View style={styles.gridItem}>
            <SkeletonFeedCard />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={trendingPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          trendingPosts.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <BrandedRefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
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
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
  },
  listContent: {
    paddingBottom: 120, // Space for floating tab bar + extra padding
    paddingHorizontal: spacing.sm,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  gridItem: {
    flex: 1,
    maxWidth: '48%',
    marginBottom: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    marginHorizontal: -spacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timeRangeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeRangeButtonActive: {
    backgroundColor: colors.primaryDarker,
    borderColor: colors.primaryDarker,
  },
  timeRangeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  timeRangeTextActive: {
    color: colors.white,
  },
  postWrapper: {
    marginBottom: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
  },
  retryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});

