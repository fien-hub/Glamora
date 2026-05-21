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
import { Ionicons } from '../../utils/icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { analytics } from '../../services/analytics';
import FeedPostCard from '../../components/FeedPostCard';
import BrandedRefreshControl from '../../components/BrandedRefreshControl';
import Haptics from '../../utils/haptics';

interface SavedPost {
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
  saved_at: string;
  tags?: string[];
}

export default function SavedPostsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSavedPosts();
  }, []);

  const loadSavedPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setError('Please log in to view saved posts');
        setSavedPosts([]);
        return;
      }

      // Get customer profile ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profileData) {
        setError('Profile not found');
        return;
      }

      // Get saved posts
      const { data: savesData, error: savesError } = await supabase
        .from('portfolio_saves')
        .select(`
          portfolio_item_id,
          created_at,
          portfolio_items!inner (
            id,
            image_url,
            caption,
            like_count,
            view_count,
            service_category,
            provider_profiles!inner (
              id,
              business_name,
              avatar_url,
              rating,
              total_reviews,
              is_verified
            )
          )
        `)
        .eq('profile_id', profileData.id)
        .order('created_at', { ascending: false });

      if (savesError) throw savesError;

      // Get user's likes
      const { data: likesData } = await supabase
        .from('portfolio_likes')
        .select('portfolio_item_id')
        .eq('profile_id', profileData.id);

      const userLikes = likesData?.map(l => l.portfolio_item_id) || [];

      // Map to SavedPost format
      const posts: SavedPost[] = savesData.map((save: any) => {
        const post = save.portfolio_items;
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
          is_saved: true,
          saved_at: save.created_at,
          tags: post.service_category ? [post.service_category] : [],
        };
      });

      setSavedPosts(posts);
      
      // Track analytics
      analytics.track('saved_posts_view', {
        post_count: posts.length,
      }, user?.id);
    } catch (error) {
      console.error('Error loading saved posts:', error);
      setError('Failed to load saved posts');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSavedPosts();
    setRefreshing(false);
  };

  const handlePostPress = (post: SavedPost) => {
    // Record view
    recordView(post.id, post.provider_id);
    // Navigate to provider portfolio
    (navigation as any).navigate('ProviderPortfolio', { providerId: post.provider_id });
  };

  const handleBookPress = (post: SavedPost) => {
    analytics.trackBookingStart(post.id, post.provider_id, user?.id);
    (navigation as any).navigate('Booking', {
      providerId: post.provider_id,
      portfolioItemId: post.id,
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

  const handleLikePress = async (post: SavedPost) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to like posts');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const isLiking = !post.is_liked;
    setSavedPosts(prev =>
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
        setSavedPosts(prev =>
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
      setSavedPosts(prev =>
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

  const handleSavePress = async (post: SavedPost) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to save posts');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Remove from saved posts immediately
    setSavedPosts(prev => prev.filter(p => p.id !== post.id));

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        // Re-add post if profile not found
        setSavedPosts(prev => [...prev, post]);
        return;
      }

      // Unsave
      const { error } = await supabase
        .from('portfolio_saves')
        .delete()
        .eq('portfolio_item_id', post.id)
        .eq('customer_id', profileData.id);

      if (error) throw error;
      analytics.trackUnsave(post.id, post.provider_id, user?.id);
    } catch (error) {
      console.error('Error unsaving post:', error);
      // Re-add post on error
      setSavedPosts(prev => [...prev, post]);
    }
  };

  const renderPost = ({ item }: { item: SavedPost }) => (
    <View style={styles.postWrapper}>
      <FeedPostCard
        providerName={item.provider_name}
        providerAvatar={item.provider_avatar || undefined}
        postImage={item.image_url}
        serviceName={item.caption || 'View Portfolio'}
        distance={`Saved ${new Date(item.saved_at).toLocaleDateString()}`}
        caption={item.caption}
        likeCount={item.like_count}
        viewCount={item.view_count}
        isLiked={item.is_liked}
        isSaved={item.is_saved}
        isVerified={item.is_verified}
        onPress={() => handlePostPress(item)}
        onBookPress={() => handleBookPress(item)}
        onLikePress={() => handleLikePress(item)}
        onSavePress={() => handleSavePress(item)}
      />
    </View>
  );

  const renderEmpty = () => {
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
        <Ionicons name="bookmark-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No Saved Posts Yet</Text>
        <Text style={styles.emptySubtext}>
          Tap the bookmark icon on posts you want to save for later
        </Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading saved posts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={savedPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          savedPosts.length === 0 && styles.emptyListContent,
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
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
    color: colors.black,
  },
});

