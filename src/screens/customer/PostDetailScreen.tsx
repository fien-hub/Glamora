import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  FlatList,
  StatusBar,
  Image as RNImage,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
let Image: any = RNImage;
try { Image = require('expo-image').Image; } catch (e) { console.warn('[PostDetailScreen] expo-image unavailable, using RN Image:', e); }
import { Ionicons } from '../../utils/icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
let Haptics: typeof import('expo-haptics') = {} as any;
try { Haptics = require('expo-haptics'); } catch (e) { console.warn('[PostDetailScreen] expo-haptics unavailable:', e); }
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getProviderAvailability, AvailabilityInfo } from '../../utils/availability';
import { Alert } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RouteParams = {
  PostDetail: {
    postId: string;
    providerId: string;
    imageUrl: string;
    providerName: string;
    providerAvatar?: string;
    caption?: string;
    serviceName?: string;
    servicePrice?: number;
    serviceId?: string;
    isVerified?: boolean;
  };
};

interface RelatedPost {
  id: string;
  provider_id: string;
  image_url: string;
  provider_name: string;
  provider_avatar?: string;
  caption?: string;
  service_name?: string;
  service_price?: number;
  service_id?: string;
  is_verified: boolean;
}

interface ProviderService {
  id: string;
  service_id: string;
  service_name: string;
  base_price: number;
  final_price: number;
  duration_minutes: number;
}

export default function PostDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'PostDetail'>>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    postId,
    providerId,
    imageUrl,
    providerName,
    providerAvatar,
    caption,
    serviceName,
    servicePrice,
    serviceId,
    isVerified,
  } = route.params;

  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityInfo | null>(null);
  const [providerService, setProviderService] = useState<ProviderService | null>(null);

  useEffect(() => {
    loadData();
    recordView();
  }, [postId]);

  const recordView = async () => {
    try {
      await supabase.rpc('record_portfolio_view', {
        portfolio_id: postId,
        viewer_id: user?.id || null,
      });
    } catch (error) {
      // Silently fail
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const isActive = await isProviderActive(providerId);
      if (!isActive) {
        Alert.alert('Provider Unavailable', 'This provider account is currently unavailable.');
        navigation.goBack();
        return;
      }

      await Promise.all([
        loadRelatedPosts(),
        loadLikeSaveStatus(),
        loadAvailability(),
        loadServiceDetails(),
      ]);
    } catch (error) {
      console.error('Error loading post data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isProviderActive = async (targetProviderId: string): Promise<boolean> => {
    try {
      const { data: providerData, error: providerError } = await supabase
        .from('provider_profiles')
        .select('profiles!inner(user_id)')
        .eq('id', targetProviderId)
        .single();

      if (providerError || !providerData) return false;

      const profileJoin: any = (providerData as any).profiles;
      const userId = Array.isArray(profileJoin) ? profileJoin?.[0]?.user_id : profileJoin?.user_id;
      if (!userId) return false;

      const { data: activeUser, error: activeUserError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      return !activeUserError && !!activeUser;
    } catch {
      return false;
    }
  };

  const loadRelatedPosts = async () => {
    // Fetch related posts from same provider + similar category posts
    const { data, error } = await supabase
      .from('portfolio_posts')
      .select(`
        id,
        image_url,
        caption,
        provider_id,
        provider_service_id,
        provider_profiles!inner (
          id,
          business_name,
          avatar_url,
          is_verified,
          profiles!inner (
            user_id
          )
        ),
        provider_services (
          id,
          services (
            name
          ),
          base_price,
          platform_commission_rate
        )
      `)
      .neq('id', postId)
      .eq('provider_profiles.is_verified', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      let activeData = data;
      const providerUserIds = Array.from(
        new Set(
          activeData
            .map((item: any) => item?.provider_profiles?.profiles?.user_id)
            .filter((id: any) => typeof id === 'string' && id.length > 0)
        )
      );

      if (providerUserIds.length > 0) {
        const { data: activeUsers, error: activeUsersError } = await supabase
          .from('users')
          .select('id')
          .in('id', providerUserIds)
          .eq('is_active', true);

        if (!activeUsersError) {
          const activeUserIds = new Set((activeUsers || []).map((row: any) => row.id));
          activeData = activeData.filter((item: any) => {
            const userId = item?.provider_profiles?.profiles?.user_id;
            return !!userId && activeUserIds.has(userId);
          });
        } else {
          console.warn('Unable to filter deactivated post providers:', activeUsersError.message);
        }
      }

      const posts: RelatedPost[] = activeData.map((item: any) => ({
        id: item.id,
        provider_id: item.provider_id,
        image_url: item.image_url,
        provider_name: item.provider_profiles?.business_name || 'Provider',
        provider_avatar: item.provider_profiles?.avatar_url,
        caption: item.caption,
        service_name: item.provider_services?.services?.name,
        service_price: item.provider_services?.base_price
          ? Math.round(item.provider_services.base_price * (1 + (item.provider_services.platform_commission_rate || 0)))
          : undefined,
        service_id: item.provider_service_id,
        is_verified: item.provider_profiles?.is_verified || false,
      }));
      setRelatedPosts(posts);
    }
  };

  const loadLikeSaveStatus = async () => {
    if (!user) return;
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) return;

      const [likeRes, saveRes] = await Promise.all([
        supabase
          .from('portfolio_likes')
          .select('id')
          .eq('portfolio_id', postId)
          .eq('profile_id', profileData.id)
          .single(),
        supabase
          .from('saved_posts')
          .select('id')
          .eq('portfolio_id', postId)
          .eq('profile_id', profileData.id)
          .single(),
      ]);

      setIsLiked(!!likeRes.data);
      setIsSaved(!!saveRes.data);
    } catch (error) {
      // Silently fail
    }
  };

  const loadAvailability = async () => {
    try {
      const avail = await getProviderAvailability(providerId);
      setAvailability(avail);
    } catch (error) {
      console.error('Error loading availability:', error);
    }
  };

  const loadServiceDetails = async () => {
    if (!serviceId) return;
    try {
      const { data } = await supabase
        .from('provider_services')
        .select(`
          id,
          service_id,
          base_price,
          platform_commission_rate,
          duration_minutes,
          services (name)
        `)
        .eq('id', serviceId)
        .single();

      if (data) {
        setProviderService({
          id: data.id,
          service_id: data.service_id,
          service_name: (data.services as any)?.name || serviceName || 'Service',
          base_price: data.base_price,
          final_price: Math.round(data.base_price * (1 + (data.platform_commission_rate || 0))),
          duration_minutes: data.duration_minutes || 60,
        });
      }
    } catch (error) {
      console.error('Error loading service details:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to like posts');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLiked(!isLiked);

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) return;

      if (isLiked) {
        await supabase
          .from('portfolio_likes')
          .delete()
          .eq('portfolio_id', postId)
          .eq('profile_id', profileData.id);
      } else {
        await supabase
          .from('portfolio_likes')
          .insert({ portfolio_id: postId, profile_id: profileData.id });
      }
    } catch (error) {
      setIsLiked(!isLiked); // Revert on error
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to save posts');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSaved(!isSaved);

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) return;

      if (isSaved) {
        await supabase
          .from('saved_posts')
          .delete()
          .eq('portfolio_id', postId)
          .eq('profile_id', profileData.id);
      } else {
        await supabase
          .from('saved_posts')
          .insert({ portfolio_id: postId, profile_id: profileData.id });
      }
    } catch (error) {
      setIsSaved(!isSaved); // Revert on error
    }
  };

  const handleBookPress = () => {
    if (!providerService) {
      Alert.alert('Service Unavailable', 'This service is not available for booking');
      return;
    }
    // Navigate to unified booking flow (same as feed posts)
    (navigation as any).navigate('Booking', {
      providerId: providerId,
      portfolioItemId: postId,
      serviceId: providerService.service_id,
    });
  };

  const handleViewProvider = () => {
    (navigation as any).navigate('ProviderPortfolio', { providerId });
  };

  const handleRelatedPostPress = (post: RelatedPost) => {
    (navigation as any).push('PostDetail', {
      postId: post.id,
      providerId: post.provider_id,
      imageUrl: post.image_url,
      providerName: post.provider_name,
      providerAvatar: post.provider_avatar,
      caption: post.caption,
      serviceName: post.service_name,
      servicePrice: post.service_price,
      serviceId: post.service_id,
      isVerified: post.is_verified,
    });
  };

  const renderRelatedPost = ({ item }: { item: RelatedPost }) => (
    <TouchableOpacity
      style={styles.relatedPostCard}
      onPress={() => handleRelatedPostPress(item)}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.image_url }}
        style={styles.relatedPostImage}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.relatedPostOverlay}>
        <Text style={styles.relatedPostProvider} numberOfLines={1}>
          {item.provider_name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      {/* Main Image */}
      {/* Status bar spacer */}
      <View style={{ height: insets.top, backgroundColor: colors.white }} />

      <View style={styles.mainImageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.mainImage}
          contentFit="cover"
          transition={300}
        />
        {/* Back Button */}
        <TouchableOpacity
          style={[styles.backButton, { top: spacing.sm }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Provider Info & Actions */}
      <View style={styles.contentContainer}>
        {/* Provider Row */}
        <TouchableOpacity style={styles.providerRow} onPress={handleViewProvider}>
          {providerAvatar ? (
            <Image source={{ uri: providerAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{providerName.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.providerInfo}>
            <View style={styles.providerNameRow}>
              <Text style={styles.providerName}>{providerName}</Text>
              {isVerified && (
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              )}
            </View>
            {availability?.displayText && (
              <Text style={styles.availabilityText}>{availability.displayText}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Caption */}
        {caption && <Text style={styles.caption}>{caption}</Text>}

        {/* Service Info */}
        {serviceName && (
          <View style={styles.serviceInfo}>
            <View style={styles.serviceNameRow}>
              <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
              <Text style={styles.serviceName}>{serviceName}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, isLiked && styles.actionButtonActive]}
            onPress={handleLike}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={isLiked ? colors.error : colors.text}
            />
            <Text style={styles.actionButtonText}>Like</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, isSaved && styles.actionButtonActive]}
            onPress={handleSave}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isSaved ? colors.primary : colors.text}
            />
            <Text style={styles.actionButtonText}>Save</Text>
          </TouchableOpacity>

          {providerService && (
            <TouchableOpacity
              style={[styles.actionButton, styles.bookButton]}
              onPress={handleBookPress}
            >
              <Ionicons name="calendar-outline" size={22} color={colors.white} />
              <Text style={[styles.actionButtonText, styles.bookButtonText]}>Book</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={relatedPosts}
        renderItem={renderRelatedPost}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.relatedRow}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
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
  listContent: {
    paddingBottom: spacing.xxl,
  },
  headerContainer: {
    backgroundColor: colors.white,
  },
  mainImageContainer: {
    width: SCREEN_WIDTH,
    aspectRatio: 1,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: spacing.md,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  providerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  providerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  availabilityText: {
    fontSize: fontSize.sm,
    color: colors.success,
    marginTop: 2,
  },
  caption: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  serviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  serviceName: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  servicePrice: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  actionButtonActive: {
    backgroundColor: colors.primaryLight,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  bookButton: {
    backgroundColor: colors.primary,
  },
  bookButtonText: {
    color: colors.white,
  },
  relatedRow: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  relatedPostCard: {
    width: (SCREEN_WIDTH - spacing.md * 3) / 2,
    aspectRatio: 0.75,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  relatedPostImage: {
    width: '100%',
    height: '100%',
  },
  relatedPostOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  relatedPostProvider: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  relatedPostPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginTop: 2,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
});

