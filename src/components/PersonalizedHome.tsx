import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '../utils/icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius, lineHeight, shadows } from '../constants/theme';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import AnimatedCard from './AnimatedCard';
import AnimatedHeart from './AnimatedHeart';
import { SkeletonProviderList, SkeletonServiceList } from './SkeletonCards';
import BrandedRefreshControl from './BrandedRefreshControl';
import CachedImage, { CachedAvatarImage } from './CachedImage';

interface Booking {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  services: { name: string };
  provider_profiles: { business_name: string };
}

interface Provider {
  id: string;
  business_name: string;
  rating: number;
  total_reviews: number;
  is_favorite?: boolean;
  avatar_url?: string;
}

interface Category {
  id: string;
  name: string;
  icon_emoji: string;
}

const PersonalizedHome = React.memo(() => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [upcomingBooking, setUpcomingBooking] = useState<Booking | null>(null);
  const [recommendedProviders, setRecommendedProviders] = useState<Provider[]>([]);
  const [favoriteProviders, setFavoriteProviders] = useState<Provider[]>([]);
  const [preferredCategories, setPreferredCategories] = useState<Category[]>([]);
  const [hasCompletedProfile, setHasCompletedProfile] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('user_id', user?.id)
        .single();

      if (profile) {
        setUserName(profile.first_name);
      }

      // Get profile id first
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profileData) return;

      // Check if customer profile is complete
      const { data: customerProfile } = await supabase
        .from('customer_profiles')
        .select('preferred_categories, location_city, location_address, location_state, location_zip_code')
        .eq('id', profileData.id)
        .single();

      if (customerProfile) {
        setHasCompletedProfile(
          customerProfile.preferred_categories?.length > 0 && customerProfile.location_city
        );

        // Set user location
        if (customerProfile.location_address && customerProfile.location_city) {
          const locationParts = [
            customerProfile.location_address,
            customerProfile.location_city,
            customerProfile.location_state,
          ].filter(Boolean);
          setUserLocation(locationParts.join(', '));
        } else if (customerProfile.location_city) {
          setUserLocation(customerProfile.location_city);
        }

        // Fetch preferred categories
        if (customerProfile.preferred_categories?.length > 0) {
          const { data: categories } = await supabase
            .from('service_categories')
            .select('id, name, icon_emoji')
            .in('id', customerProfile.preferred_categories);

          setPreferredCategories(categories || []);
        }
      }

      // Fetch upcoming booking
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          services (name),
          provider_profiles (business_name)
        `)
        .eq('customer_id', profileData.id)
        .in('status', ['pending', 'confirmed'])
        .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true })
        .limit(1);

      if (bookings && bookings.length > 0) {
        setUpcomingBooking(bookings[0] as any);
      }

      // Fetch favorite providers
      const { data: favorites } = await supabase
        .from('favorite_providers')
        .select(`
          provider_id,
          provider_profiles (
            id,
            business_name,
            rating,
            total_reviews,
            profiles!inner (
              avatar_url
            )
          )
        `)
        .eq('customer_id', profileData.id)
        .limit(5);

      if (favorites) {
        const favProviders = favorites
          .map((f: any) => ({
            ...f.provider_profiles,
            is_favorite: true,
            avatar_url: f.provider_profiles?.profiles?.avatar_url
          }))
          .filter((p: any) => p.id);
        setFavoriteProviders(favProviders);
      }

      // Fetch recommended providers based on favorites
      let recommendedQuery = supabase
        .from('provider_profiles')
        .select(`
          id,
          business_name,
          rating,
          total_reviews,
          profiles!inner (
            avatar_url
          )
        `)
        .eq('is_verified', true);

      // If user has favorite services, recommend providers who offer those services
      if (user) {
        const favoriteServiceIds = await supabase
          .from('favorite_services')
          .select('service_id')
          .eq('customer_id', user.id);

        if (favoriteServiceIds.data && favoriteServiceIds.data.length > 0) {
          const serviceIds = favoriteServiceIds.data.map(f => f.service_id);

          // Get providers who offer these services
          const { data: providerServices } = await supabase
            .from('provider_services')
            .select('provider_id')
            .in('service_id', serviceIds);

          if (providerServices && providerServices.length > 0) {
            const providerIds = [...new Set(providerServices.map(ps => ps.provider_id))];
            recommendedQuery = recommendedQuery.in('id', providerIds);
          }
        }
      }

      const { data: providers } = await recommendedQuery
        .order('rating', { ascending: false })
        .limit(5);

      const providersWithAvatars = (providers || []).map((p: any) => ({
        ...p,
        avatar_url: p.profiles?.avatar_url
      }));

      setRecommendedProviders(providersWithAvatars);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleCategoryPress = useCallback((category: Category) => {
    (navigation as any).navigate('Search', {
      categoryId: category.id,
      categoryName: category.name,
    });
  }, [navigation]);

  const handleProviderPress = useCallback((provider: Provider) => {
    (navigation as any).navigate('Search', { providerId: provider.id });
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<BrandedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {userName ? `Welcome back, ${userName}! 👋` : 'Welcome! 👋'}
        </Text>
        <Text style={styles.subtitle}>Let's find your perfect service</Text>
      </View>

      {/* Prominent Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for services..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => {
              if (searchQuery.trim()) {
                (navigation as any).navigate('Search', { query: searchQuery });
              }
            }}
            returnKeyType="search"
          />
        </View>

        {/* Location Chip */}
        <TouchableOpacity
          style={styles.locationChip}
          onPress={() => (navigation as any).navigate('Profile')}
        >
          <Ionicons name="location" size={16} color={colors.primary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {userLocation || 'Set your location'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Profile Completion Banner */}
      {!hasCompletedProfile && (
        <TouchableOpacity
          style={styles.banner}
          onPress={() => (navigation as any).navigate('Personalization')}
        >
          <Text style={styles.bannerIcon}>✨</Text>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Complete your profile</Text>
            <Text style={styles.bannerText}>Get personalized recommendations</Text>
          </View>
          <Text style={styles.bannerArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Upcoming Booking */}
      {upcomingBooking && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Next Appointment</Text>
          <View style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <Text style={styles.bookingService}>{upcomingBooking.services?.name}</Text>
              <View style={styles.bookingBadge}>
                <Text style={styles.bookingBadgeText}>Upcoming</Text>
              </View>
            </View>
            <Text style={styles.bookingProvider}>
              {upcomingBooking.provider_profiles?.business_name}
            </Text>
            <Text style={styles.bookingDate}>
              📅 {new Date(upcomingBooking.scheduled_date).toLocaleDateString()} at{' '}
              {upcomingBooking.scheduled_time}
            </Text>
            <TouchableOpacity
              style={styles.bookingButton}
              onPress={() => (navigation as any).navigate('Bookings')}
            >
              <Text style={styles.bookingButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => (navigation as any).navigate('Bookings')}
        >
          <Text style={styles.quickActionIcon}>📅</Text>
          <Text style={styles.quickActionText}>Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => (navigation as any).navigate('Loyalty')}
        >
          <Text style={styles.quickActionIcon}>🎁</Text>
          <Text style={styles.quickActionText}>Offers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => (navigation as any).navigate('Search', { showFavorites: true })}
        >
          <Text style={styles.quickActionIcon}>⭐</Text>
          <Text style={styles.quickActionText}>Favorites</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => (navigation as any).navigate('Profile')}
        >
          <Text style={styles.quickActionIcon}>📍</Text>
          <Text style={styles.quickActionText}>Addresses</Text>
        </TouchableOpacity>
      </View>

      {/* Preferred Categories */}
      {preferredCategories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Interests</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {preferredCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryChip}
                onPress={() => handleCategoryPress(category)}
              >
                <Text style={styles.categoryChipEmoji}>{category.icon_emoji}</Text>
                <Text style={styles.categoryChipText}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Favorite Providers */}
      {favoriteProviders.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Favorites ⭐</Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('Favorites')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {favoriteProviders.map((provider) => (
              <AnimatedCard
                key={provider.id}
                onPress={() => handleProviderPress(provider)}
              >
                <View style={styles.providerCard}>
                  {provider.avatar_url ? (
                    <CachedAvatarImage
                      uri={provider.avatar_url}
                      style={styles.providerAvatarImage}
                      showLoader={false}
                    />
                  ) : (
                    <View style={styles.providerAvatar}>
                      <Text style={styles.providerAvatarText}>
                        {provider.business_name.charAt(0)}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.providerName} numberOfLines={1}>
                    {provider.business_name}
                  </Text>
                  <View style={styles.providerRating}>
                    <Text style={styles.providerRatingText}>
                      ⭐ {provider.rating?.toFixed(1) || 'New'}
                    </Text>
                  </View>
                  <AnimatedHeart
                    isFavorite={true}
                    onPress={() => {/* Handle unfavorite */}}
                    size={20}
                  />
                </View>
              </AnimatedCard>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recommended Providers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {favoriteProviders.length > 0 ? 'Recommended for You' : 'Top Rated Providers'}
        </Text>
        {favoriteProviders.length > 0 && (
          <Text style={styles.sectionSubtitle}>
            Based on your favorite services
          </Text>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {recommendedProviders.map((provider) => (
            <AnimatedCard
              key={provider.id}
              onPress={() => handleProviderPress(provider)}
            >
              <View style={styles.providerCard}>
                <View style={styles.providerAvatar}>
                  <Text style={styles.providerAvatarText}>
                    {provider.business_name.charAt(0)}
                  </Text>
                </View>
                <Text style={styles.providerName} numberOfLines={1}>
                  {provider.business_name}
                </Text>
                <View style={styles.providerRating}>
                  <Text style={styles.providerRatingText}>
                    ⭐ {provider.rating?.toFixed(1) || 'New'}
                  </Text>
                </View>
                <Text style={styles.providerReviews}>
                  {provider.total_reviews || 0} reviews
                </Text>
              </View>
            </AnimatedCard>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  scrollContent: {
    paddingBottom: 100, // Space for floating tab bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
  },
  header: {
    backgroundColor: colors.white,
    padding: spacing.screenPadding,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  greeting: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: fontSize.heading * lineHeight.tight,
  },
  subtitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
    lineHeight: fontSize.body * lineHeight.normal,
  },
  searchSection: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    marginBottom: spacing.cardMargin,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    height: 50,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular,
    color: colors.text,
    height: '100%',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  locationText: {
    fontSize: fontSize.subtitle,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
    flex: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    margin: spacing.cardMargin,
    padding: spacing.cardPadding,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primaryLighter,
  },
  bannerIcon: {
    fontSize: 30,
    marginRight: spacing.md,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: fontSize.body * lineHeight.normal,
  },
  bannerText: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
    lineHeight: fontSize.subtitle * lineHeight.normal,
  },
  bannerArrow: {
    fontSize: fontSize.xl,
    color: colors.primary,
  },
  section: {
    padding: spacing.screenPadding,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.cardMargin,
  },
  sectionTitle: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: fontSize.title * lineHeight.tight,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  viewAllText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  bookingCard: {
    backgroundColor: colors.white,
    padding: spacing.cardPadding,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bookingService: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
    lineHeight: fontSize.bodyLarge * lineHeight.normal,
  },
  bookingBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  bookingBadgeText: {
    fontSize: fontSize.caption,
    color: colors.success,
    fontWeight: fontWeight.semibold,
  },
  bookingProvider: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: fontSize.body * lineHeight.normal,
  },
  bookingDate: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.md,
    lineHeight: fontSize.subtitle * lineHeight.normal,
  },
  bookingButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  bookingButtonText: {
    color: colors.white,
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semibold,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.cardMargin,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.cardPadding,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  quickActionIcon: {
    fontSize: 30,
    marginBottom: spacing.sm,
  },
  quickActionText: {
    fontSize: fontSize.caption,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.round,
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.xs,
  },
  categoryChipEmoji: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  categoryChipText: {
    fontSize: fontSize.subtitle,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  providerCard: {
    width: 130,
    alignItems: 'center',
  },
  providerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  providerAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: spacing.md,
    backgroundColor: colors.backgroundGray,
  },
  providerAvatarText: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  providerName: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: fontSize.subtitle * lineHeight.normal,
  },
  providerRating: {
    backgroundColor: colors.secondarySubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  providerRatingText: {
    fontSize: fontSize.caption,
    color: colors.secondary,
    fontWeight: fontWeight.semibold,
  },
  providerReviews: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
  },
});

export default PersonalizedHome;
