import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '../../utils/icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, lineHeight } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { getCurrentLocation, calculateDistance, Coordinates } from '../../utils/location';
import { formatTravelTimeDistance } from '../../services/location';
import { getProviderAvailability, AvailabilityInfo } from '../../utils/availability';
import BookingModal from '../../components/BookingModal';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import AnimatedCard from '../../components/AnimatedCard';
import AnimatedHeart from '../../components/AnimatedHeart';
import { SkeletonProviderList } from '../../components/SkeletonCards';
import BrandedRefreshControl from '../../components/BrandedRefreshControl';
import { useAuth } from '../../contexts/AuthContext';
import FadeInView from '../../components/animations/FadeInView';

interface Provider {
  id: string;
  user_id: string;
  business_name: string;
  bio: string;
  rating: number;
  total_reviews: number;
  price: number;
  is_verified: boolean;
  latitude?: number;
  longitude?: number;
  distance?: number;
  avatar_url?: string;
  availability?: AvailabilityInfo;
  provider_service_id: string;
}

export default function ServiceProvidersScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const params = route.params as { serviceId: string; serviceName: string };
  const { user } = useAuth();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [favoriteProviders, setFavoriteProviders] = useState<Set<string>>(new Set());
  const [profileId, setProfileId] = useState<string | null>(null);

  useScreenTracking('ServiceProviders', { serviceId: params?.serviceId });

  useEffect(() => {
    getUserLocation();
    fetchProviders();
    if (user) fetchProfileId();
  }, [params?.serviceId, user]);

  const getUserLocation = async () => {
    try {
      const location = await getCurrentLocation();
      if (location) setUserLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Fetch profile ID from profiles table (needed for favorite_providers)
  const fetchProfileId = async () => {
    if (!user) return;
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile ID:', error);
        return;
      }

      if (profileData) {
        setProfileId(profileData.id);
        fetchFavorites(profileData.id);
      }
    } catch (error) {
      console.error('Error fetching profile ID:', error);
    }
  };

  const fetchFavorites = async (customerProfileId?: string) => {
    const idToUse = customerProfileId || profileId;
    if (!idToUse) return;
    try {
      const { data } = await supabase
        .from('favorite_providers')
        .select('provider_id')
        .eq('customer_id', idToUse);
      if (data) setFavoriteProviders(new Set(data.map(f => f.provider_id)));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('provider_services')
        .select(`
          id,
          base_price,
          platform_commission_rate,
          provider_profiles!inner (
            id,
            business_name,
            rating,
            total_reviews,
            is_verified,
            identity_verification_status,
            profiles!inner (
              user_id,
              bio,
              latitude,
              longitude,
              avatar_url
            )
          )
        `)
        .eq('service_id', params.serviceId)
        .eq('is_active', true)
        .eq('provider_profiles.identity_verification_status', 'approved');

      if (error) throw error;

      const rawProviders = (data || []).map((ps: any) => {
        const basePrice = Number(ps.base_price);
        const commissionRate = Number(ps.platform_commission_rate) || 0.20;
        const finalPrice = Math.round(basePrice * (1 + commissionRate));

        return {
          id: ps.provider_profiles.id,
          user_id: ps.provider_profiles.profiles.user_id,
          business_name: ps.provider_profiles.business_name,
          bio: ps.provider_profiles.profiles.bio || '',
          rating: ps.provider_profiles.rating,
          total_reviews: ps.provider_profiles.total_reviews,
          price: finalPrice,
          is_verified: ps.provider_profiles.is_verified,
          latitude: ps.provider_profiles.profiles.latitude,
          longitude: ps.provider_profiles.profiles.longitude,
          avatar_url: ps.provider_profiles.profiles.avatar_url,
          provider_service_id: ps.id,
        };
      }) as Provider[];

      const providerUserIds = Array.from(
        new Set(rawProviders.map((provider) => provider.user_id).filter(Boolean))
      );

      let formattedProviders = rawProviders;
      if (providerUserIds.length > 0) {
        const { data: activeUsers, error: activeUsersError } = await supabase
          .from('users')
          .select('id')
          .in('id', providerUserIds)
          .eq('is_active', true);

        if (!activeUsersError) {
          const activeUserIds = new Set((activeUsers || []).map((row: any) => row.id));
          formattedProviders = rawProviders.filter((provider) => activeUserIds.has(provider.user_id));
        } else {
          console.warn('Unable to filter deactivated providers:', activeUsersError.message);
        }
      }

      // Calculate distances
      if (userLocation) {
        formattedProviders = formattedProviders.map(provider => {
          if (provider.latitude && provider.longitude) {
            provider.distance = calculateDistance(userLocation, {
              latitude: provider.latitude,
              longitude: provider.longitude,
            });
          }
          return provider;
        });
      }

      // Sort by rating
      formattedProviders.sort((a, b) => b.rating - a.rating);

      // Fetch availability
      const providersWithAvailability = await Promise.all(
        formattedProviders.map(async (provider) => {
          try {
            provider.availability = await getProviderAvailability(provider.id);
          } catch (error) {
            console.error('Error fetching availability:', error);
          }
          return provider;
        })
      );

      setProviders(providersWithAvailability);
    } catch (error) {
      console.error('Error fetching providers:', error);
      Alert.alert('Error', 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (providerId: string) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to save favorites');
      return;
    }
    if (!profileId) {
      Alert.alert('Error', 'Profile not loaded. Please try again.');
      return;
    }
    const isFavorite = favoriteProviders.has(providerId);
    try {
      if (isFavorite) {
        await supabase.from('favorite_providers').delete()
          .eq('customer_id', profileId).eq('provider_id', providerId);
        setFavoriteProviders(prev => { const s = new Set(prev); s.delete(providerId); return s; });
      } else {
        await supabase.from('favorite_providers').insert({ customer_id: profileId, provider_id: providerId });
        setFavoriteProviders(prev => new Set(prev).add(providerId));
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
      Alert.alert('Error', 'Failed to update favorites');
    }
  };

  const handleProviderPress = (provider: Provider) => {
    setSelectedProvider(provider);
    setBookingModalVisible(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProviders();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <SkeletonProviderList count={5} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<BrandedRefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <FadeInView delay={0}>
          <Text style={styles.title}>{params.serviceName}</Text>
          <Text style={styles.subtitle}>
            {providers.length} provider{providers.length !== 1 ? 's' : ''} available
          </Text>
        </FadeInView>

        {providers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No providers found</Text>
            <Text style={styles.emptySubtext}>Check back later for availability</Text>
          </View>
        ) : (
          providers.map((provider) => (
            <AnimatedCard key={provider.id}>
              <TouchableOpacity style={styles.providerCard} onPress={() => handleProviderPress(provider)}>
                <View style={styles.providerHeader}>
                  {provider.avatar_url ? (
                    <Image source={{ uri: provider.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitial}>{provider.business_name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.providerInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.providerName}>{provider.business_name}</Text>
                      {provider.is_verified && <Text style={styles.verifiedBadge}>✓</Text>}
                    </View>
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingText}>⭐ {provider.rating.toFixed(1)}</Text>
                      <Text style={styles.reviewsText}>({provider.total_reviews} reviews)</Text>
                    </View>
                    {provider.distance && (
                      <View style={styles.metaRow}>
                        <Ionicons name="location" size={14} color={colors.textSecondary} />
                        <Text style={styles.metaText}>{formatTravelTimeDistance(provider.distance)}</Text>
                      </View>
                    )}
                    {provider.availability && (
                      <View style={[styles.availabilityBadge,
                        provider.availability.urgency === 'immediate' && styles.availabilityImmediate]}>
                        <Ionicons name={provider.availability.urgency === 'immediate' ? 'flash' : 'time'}
                          size={14} color={provider.availability.urgency === 'immediate' ? colors.white : colors.success} />
                        <Text style={[styles.availabilityText,
                          provider.availability.urgency === 'immediate' && styles.availabilityTextImmediate]}>
                          {provider.availability.displayText}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceText}>${provider.price}</Text>
                  </View>
                </View>
                {provider.bio && <Text style={styles.bio} numberOfLines={2}>{provider.bio}</Text>}
                <View style={styles.actions}>
                  <AnimatedHeart isFavorite={favoriteProviders.has(provider.id)}
                    onPress={() => toggleFavorite(provider.id)} size={28} />
                  <TouchableOpacity style={styles.bookButton} onPress={() => handleProviderPress(provider)}>
                    <Text style={styles.bookButtonText}>Book Now</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </AnimatedCard>
          ))
        )}
      </ScrollView>

      {selectedProvider && (
        <BookingModal
          visible={bookingModalVisible}
          onClose={() => setBookingModalVisible(false)}
          service={{ id: params.serviceId, name: params.serviceName, price: selectedProvider.price } as any}
          provider={selectedProvider as any}
          onSuccess={() => { setBookingModalVisible(false); Alert.alert('Success', 'Booking confirmed!'); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundGray },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
  scrollContent: { padding: spacing.screenPadding, paddingBottom: 100 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.body, color: colors.textSecondary, marginBottom: spacing.lg },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl * 2 },
  emptyText: { fontSize: fontSize.body, color: colors.textSecondary, marginTop: spacing.md },
  emptySubtext: { fontSize: fontSize.subtitle, color: colors.textSecondary, marginTop: spacing.xs },
  providerCard: { padding: spacing.cardPadding },
  providerHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: spacing.md, backgroundColor: colors.backgroundGray },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  avatarInitial: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.white },
  providerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  providerName: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.text },
  verifiedBadge: { fontSize: fontSize.subtitle, color: colors.primary, backgroundColor: colors.primarySubtle, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: borderRadius.sm },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  ratingText: { fontSize: fontSize.subtitle, fontWeight: fontWeight.medium, color: colors.text },
  reviewsText: { fontSize: fontSize.caption, color: colors.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { fontSize: fontSize.caption, color: colors.textSecondary },
  availabilityBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.successLight, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: borderRadius.sm, marginTop: spacing.xs, alignSelf: 'flex-start' },
  availabilityImmediate: { backgroundColor: colors.primaryDarker },
  availabilityText: { fontSize: fontSize.caption, color: colors.success, fontWeight: fontWeight.semibold },
  availabilityTextImmediate: { color: colors.white },
  priceContainer: { alignItems: 'flex-end' },
  priceText: { fontSize: fontSize.title, fontWeight: fontWeight.bold, color: colors.secondary },
  bio: { fontSize: fontSize.subtitle, color: colors.textSecondary, lineHeight: fontSize.subtitle * lineHeight.relaxed, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  bookButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  bookButtonText: { fontSize: fontSize.subtitle, fontWeight: fontWeight.semibold, color: colors.black },
});
