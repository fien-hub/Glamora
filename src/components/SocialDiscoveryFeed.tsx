import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Haptics from '../utils/haptics';
import { Ionicons } from '../utils/icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../constants/theme';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { analytics } from '../services/analytics';
import FeedPostCard from './FeedPostCard';
import PillTabs from './PillTabs';
import BrandedRefreshControl from './BrandedRefreshControl';
import { SkeletonFeedCard } from './SkeletonLoader';
import { getCurrentLocation } from '../utils/location';
import { getProviderAvailability, AvailabilityInfo } from '../utils/availability';
import { useVerificationGuard } from '../hooks/useVerificationGuard';

import { formatTravelTimeDistance, geocodeAddress } from '../services/location';
import * as RootNavigation from '../navigation/RootNavigation';


interface FeedPost {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_avatar?: string;
  provider_rating: number;
  provider_reviews: number;
  image_url: string;
  caption?: string;
  distance?: number;
  is_verified: boolean;
  like_count: number;
  view_count: number;
  is_liked: boolean;
  is_saved: boolean;
  tags?: string[];
  availability?: AvailabilityInfo;
  provider_service_id?: string;
  service_name?: string;
  service_price?: number;
}

interface Category {
  id: string;
  name: string;
}

interface SocialDiscoveryFeedProps {
  showInternalHeader?: boolean;
  showHeaderSearchBar?: boolean;
  showHeaderCategoryPills?: boolean;
}

export default function SocialDiscoveryFeed({
  showInternalHeader = true,
  showHeaderSearchBar = true,
  showHeaderCategoryPills = true,
}: SocialDiscoveryFeedProps) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { requireVerification } = useVerificationGuard();

  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationFetchComplete, setLocationFetchComplete] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 10;

  const navigateTo = (routeName: string, params?: Record<string, any>) => {
    // PostDetail/Booking live on the root stack navigator, two levels above
    // this component's tab context. The global navigationRef is the only
    // reliable path to them in release builds.
    RootNavigation.navigate(routeName, params);
  };


  // Fetch categories and user location in parallel on mount
  useEffect(() => {
    setLoading(true);
    fetchCategories();
    fetchUserLocation();
  }, []);

  // Load feed once categories are ready and location fetch has completed
  // (location may be null if permission was denied — that's fine, load without distance)
  useEffect(() => {
    if (categories.length > 0 && locationFetchComplete) {
      const initializeFeed = async () => {
        await loadFeedPosts(true);
        setLoading(false);
        setInitialLoadComplete(true);
      };

      initializeFeed();
    }
  }, [categories, locationFetchComplete]);

  // Reload feed when category changes (after initial load)
  useEffect(() => {
    if (!initialLoadComplete) return;

    if (selectedCategory) {
      loadFeedPosts(true);
      analytics.trackCategoryFilter(selectedCategory, user?.id);
    }
  }, [selectedCategory, initialLoadComplete]);


  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      
      const allCategories = [{ id: 'all', name: 'All' }, ...(data || [])];
      setCategories(allCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchUserLocation = async () => {
    try {
      const liveLocation = await getCurrentLocation();

      if (liveLocation) {
        setUserLocation(liveLocation);
        return;
      }

      // Fallback to stored customer profile coordinates when live permission
      // is denied/unavailable, so distance-based UI still renders.
      if (!user?.id) {
        setUserLocation(null);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profileData?.id) {
        setUserLocation(null);
        return;
      }

      // Only query the base columns that are guaranteed to exist in the schema.
      const { data: customerProfile } = await supabase
        .from('customer_profiles')
        .select('latitude, longitude, location_address, location_city, location_state, location_zip_code')
        .eq('id', profileData.id)
        .single();

      if (customerProfile?.latitude != null && customerProfile?.longitude != null) {
        setUserLocation({
          latitude: Number(customerProfile.latitude),
          longitude: Number(customerProfile.longitude),
        });
        return;
      }

      // Last resort: geocode the stored text address to get coordinates.
      const textParts = [
        customerProfile?.location_address,
        customerProfile?.location_city,
        customerProfile?.location_state,
      ].filter(Boolean);

      if (textParts.length > 0) {
        try {
          const geocoded = await geocodeAddress(textParts.join(', '));
          if (geocoded) {
            setUserLocation({ latitude: geocoded.latitude, longitude: geocoded.longitude });
            return;
          }
        } catch {
          // Geocoding failed; distance will be unavailable.
        }
      }

      setUserLocation(null);
    } catch (error) {
      console.error('Error getting location:', error);
      setUserLocation(null);
    } finally {
      setLocationFetchComplete(true);
    }
  };

  const loadFeedPosts = async (reset: boolean = false) => {
    if (!reset && !hasMore) return;

    const currentPage = reset ? 0 : page;
    if (!reset) setLoadingMore(true);

    try {
      // Get customer profile ID for likes/saves
      let customerId = null;
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        customerId = profileData?.id;
      }

      // Use the new get_personalized_feed function
      const { data, error } = await supabase.rpc('get_personalized_feed', {
        customer_lat: userLocation?.latitude ?? null,
        customer_lon: userLocation?.longitude ?? null,
        profile_id_param: customerId,
        category_filter: selectedCategory === 'All' ? null : selectedCategory,
        page_num: currentPage,
        page_size: PAGE_SIZE,
      });

      if (error) throw error;

      // Transform data to FeedPost format and fetch availability
      const posts: FeedPost[] = await Promise.all(
        (data || []).map(async (item: any) => {
          const post: FeedPost = {
            id: item.portfolio_id,
            provider_id: item.provider_id,
            provider_name: item.provider_name,
            provider_avatar: item.provider_avatar,
            provider_rating: item.provider_rating || 0,
            provider_reviews: item.provider_reviews || 0,
            image_url: item.image_url,
            caption: item.caption,
            distance: item.distance_km,
            is_verified: item.provider_verified,
            like_count: item.like_count || 0,
            view_count: item.view_count || 0,
            is_liked: item.is_liked || false,
            is_saved: item.is_saved || false,
            tags: item.tags || [],
            provider_service_id: item.service_id,
            service_name: item.service_name,
            service_price: item.service_price,
          };

          // Fetch availability for each provider
          try {
            post.availability = await getProviderAvailability(item.provider_id);
          } catch (error) {
            console.error('Error fetching availability for provider:', item.provider_id, error);
          }

          return post;
        })
      );

      // Database function handles sorting, no need to sort here

      if (reset) {
        setFeedPosts(posts);
        setPage(1);
      } else {
        setFeedPosts(prev => [...prev, ...posts]);
        setPage(currentPage + 1);
      }

      setHasMore(posts.length === PAGE_SIZE);
      setError(null); // Clear any previous errors

      // Track feed view
      if (reset) {
        analytics.trackFeedView(
          user?.id,
          selectedCategory === 'All' ? undefined : selectedCategory,
          userLocation ? { lat: userLocation.latitude, lon: userLocation.longitude } : undefined
        );
      }
    } catch (error) {
      console.error('Error loading feed posts:', error);
      setError('Failed to load feed. Pull to refresh to try again.');
      if (reset) {
        setFeedPosts([]);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    await loadFeedPosts(true);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadFeedPosts(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const handlePostPress = (post: FeedPost) => {
    // Record view
    recordView(post.id, post.provider_id);
    // Navigate to post detail (Pinterest-style)
    navigateTo('PostDetail', {
      postId: post.id,
      providerId: post.provider_id,
      imageUrl: post.image_url,
      providerName: post.provider_name,
      providerAvatar: post.provider_avatar,
      caption: post.caption,
      serviceName: post.service_name,
      servicePrice: post.service_price,
      serviceId: post.provider_service_id,
      isVerified: post.is_verified,
    });
  };

  const handleBookPress = (post: FeedPost) => {
    console.log('[Feed] Book button pressed for post:', post.id);
    console.log('[Feed] Provider ID:', post.provider_id);
    console.log('[Feed] Service ID:', post.provider_service_id);
    console.log('[Feed] Navigation object:', navigation);

    try {
      analytics.trackBookingStart(post.id, post.provider_id, user?.id);

      console.log('[Feed] Attempting to navigate to Booking screen');
      navigateTo('Booking', {
        providerId: post.provider_id,
        portfolioItemId: post.id,
        serviceId: post.provider_service_id, // Pre-select service if tagged
      });
      console.log('[Feed] Navigation called successfully');
    } catch (error) {
      console.error('[Feed] Error navigating to booking:', error);
      Alert.alert('Error', 'Failed to open booking screen. Please try again.');
    }
  };

  const recordView = async (portfolioItemId: string, providerId: string) => {
    try {
      // Track analytics
      analytics.trackPostView(portfolioItemId, providerId, user?.id);

      // Get customer profile ID
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) return;

      // Record view in database
      await supabase.from('portfolio_views').insert({
        portfolio_item_id: portfolioItemId,
        customer_id: profileData.id,
      });
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const handleLikePress = async (post: FeedPost) => {
    try {
      console.log('[Feed] Like button pressed for post:', post.id);

      // Check verification before allowing likes
      if (!requireVerification('like')) {
        return;
      }

      if (!user) {
        console.log('[Feed] No user, showing login alert');
        Alert.alert('Login Required', 'Please log in to like posts');
        return;
      }

      console.log('[Feed] User ID:', user.id);

      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Optimistic update
      const isLiking = !post.is_liked;
      console.log('[Feed] Toggling like:', isLiking ? 'liking' : 'unliking');

      setFeedPosts(prev =>
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

      // Get customer profile ID
      console.log('[Feed] Fetching profile for user:', user.id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('[Feed] Profile fetch error:', profileError);
        throw profileError;
      }

      if (!profileData) {
        console.error('[Feed] No profile found for user');
        // Revert optimistic update
        setFeedPosts(prev =>
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
        Alert.alert('Error', 'Profile not found. Please complete your profile setup.');
        return;
      }

      console.log('[Feed] Profile ID:', profileData.id);

      if (post.is_liked) {
        // Unlike
        console.log('[Feed] Deleting like from portfolio_likes');
        const { error } = await supabase
          .from('portfolio_likes')
          .delete()
          .eq('portfolio_item_id', post.id)
          .eq('profile_id', profileData.id);

        if (error) {
          console.error('[Feed] Unlike error:', error);
          throw error;
        }

        console.log('[Feed] Unlike successful');
        // Track analytics
        analytics.trackUnlike(post.id, post.provider_id, user?.id);
      } else {
        // Like
        console.log('[Feed] Inserting like into portfolio_likes');
        const { error } = await supabase.from('portfolio_likes').insert({
          portfolio_item_id: post.id,
          profile_id: profileData.id,
        });

        if (error) {
          console.error('[Feed] Like error:', error);
          throw error;
        }

        console.log('[Feed] Like successful');
        // Track analytics
        analytics.trackLike(post.id, post.provider_id, user?.id);
      }
    } catch (error: any) {
      console.error('[Feed] Error toggling like:', error);
      console.error('[Feed] Error details:', JSON.stringify(error, null, 2));

      // Revert optimistic update on error
      setFeedPosts(prev =>
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

      Alert.alert('Error', error.message || 'Failed to like post. Please try again.');
    }
  };

  const handleSavePress = async (post: FeedPost) => {
    try {
      console.log('[Feed] Save button pressed for post:', post.id);

      // Check verification before allowing saves (same as favorites)
      if (!requireVerification('favorite')) {
        return;
      }

      if (!user) {
        console.log('[Feed] No user, showing login alert');
        Alert.alert('Login Required', 'Please log in to save posts');
        return;
      }

      console.log('[Feed] User ID:', user.id);

      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Optimistic update
      const isSaving = !post.is_saved;
      console.log('[Feed] Toggling save:', isSaving ? 'saving' : 'unsaving');

      setFeedPosts(prev =>
        prev.map(p =>
          p.id === post.id ? { ...p, is_saved: isSaving } : p
        )
      );

      // Get customer profile ID
      console.log('[Feed] Fetching profile for user:', user.id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('[Feed] Profile fetch error:', profileError);
        throw profileError;
      }

      if (!profileData) {
        console.error('[Feed] No profile found for user');
        // Revert optimistic update
        setFeedPosts(prev =>
          prev.map(p =>
            p.id === post.id ? { ...p, is_saved: post.is_saved } : p
          )
        );
        Alert.alert('Error', 'Profile not found. Please complete your profile setup.');
        return;
      }

      console.log('[Feed] Profile ID:', profileData.id);

      if (post.is_saved) {
        // Unsave
        console.log('[Feed] Deleting save from portfolio_saves');
        const { error } = await supabase
          .from('portfolio_saves')
          .delete()
          .eq('portfolio_item_id', post.id)
          .eq('profile_id', profileData.id);

        if (error) {
          console.error('[Feed] Unsave error:', error);
          throw error;
        }

        console.log('[Feed] Unsave successful');
        // Track analytics
        analytics.trackUnsave(post.id, post.provider_id, user?.id);
      } else {
        // Save
        console.log('[Feed] Inserting save into portfolio_saves');
        const { error } = await supabase.from('portfolio_saves').insert({
          portfolio_item_id: post.id,
          profile_id: profileData.id,
        });

        if (error) {
          console.error('[Feed] Save error:', error);
          throw error;
        }

        console.log('[Feed] Save successful');
        // Track analytics
        analytics.trackSave(post.id, post.provider_id, user?.id);
      }
    } catch (error: any) {
      console.error('[Feed] Error toggling save:', error);
      console.error('[Feed] Error details:', JSON.stringify(error, null, 2));

      // Revert optimistic update on error
      setFeedPosts(prev =>
        prev.map(p =>
          p.id === post.id ? { ...p, is_saved: post.is_saved } : p
        )
      );

      Alert.alert('Error', error.message || 'Failed to save post. Please try again.');
    }
  };

  const handleSearchPress = () => {
    (navigation as any).navigate('Search');
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {showHeaderSearchBar && (
        <TouchableOpacity
          style={styles.searchBar}
          onPress={handleSearchPress}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <Text style={styles.searchPlaceholder}>Search for services...</Text>
          <Ionicons name="options-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {showHeaderCategoryPills && (
        <PillTabs
          tabs={categories.map(c => c.name)}
          activeTab={selectedCategory}
          onTabChange={handleCategoryChange}
          scrollable
        />
      )}
    </View>
  );

  const renderPost = ({ item }: { item: FeedPost }) => (
    <View style={styles.gridItem}>
      <FeedPostCard
        providerName={item.provider_name}
        providerAvatar={item.provider_avatar || undefined}
        postImage={item.image_url}
        serviceName={item.service_name || item.caption || 'View Portfolio'}
        servicePrice={item.service_price ? item.service_price / 100 : undefined}
        distance={typeof item.distance === 'number' && item.distance >= 0 && Number.isFinite(item.distance) ? formatTravelTimeDistance(item.distance) : undefined}
        caption={item.caption}
        likeCount={item.like_count}
        viewCount={item.view_count}
        isLiked={item.is_liked}
        isSaved={item.is_saved}
        isVerified={item.is_verified}
        availabilityText={item.availability?.displayText}
        availabilityUrgency={item.availability?.urgency}
        hasServiceTag={!!item.provider_service_id}
        onPress={() => handlePostPress(item)}
        onBookPress={() => handleBookPress(item)}
        onLikePress={() => handleLikePress(item)}
        onSavePress={() => handleSavePress(item)}
      />
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

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
        <Ionicons name="images-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No posts yet</Text>
        <Text style={styles.emptySubtext}>Check back soon for new content!</Text>
      </View>
    );
  };

  if (loading) {
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
    <FlatList
      data={feedPosts}
      renderItem={renderPost}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.gridRow}
      ListHeaderComponent={
        showInternalHeader && (showHeaderSearchBar || showHeaderCategoryPills)
          ? renderHeader
          : undefined
      }
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        <BrandedRefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={6}
      updateCellsBatchingPeriod={50}
      initialNumToRender={6}
      windowSize={10}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
  },
  contentContainer: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingBottom: 120, // Space for floating tab bar + extra padding
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
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    marginHorizontal: -spacing.sm,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textLight,
    fontWeight: fontWeight.medium,
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
  },
  retryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});

