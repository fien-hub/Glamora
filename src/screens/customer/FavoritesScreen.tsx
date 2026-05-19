import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '../../utils/icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, lineHeight } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import AnimatedCard from '../../components/AnimatedCard';
import AnimatedButton from '../../components/AnimatedButton';
import AnimatedHeart from '../../components/AnimatedHeart';
import BrandedRefreshControl from '../../components/BrandedRefreshControl';
import { SkeletonServiceList, SkeletonProviderList } from '../../components/SkeletonCards';
import FadeInView from '../../components/animations/FadeInView';

interface FavoriteService {
  id: string;
  service_id: string;
  services: {
    id: string;
    name: string;
    description: string;
    base_duration_minutes: number;
    min_price?: number;
  };
}

interface FavoriteProvider {
  id: string;
  provider_id: string;
  provider_profiles: {
    id: string;
    business_name: string;
    bio: string;
    avatar_url: string;
    rating: number;
    total_reviews: number;
    is_verified: boolean;
    profiles?: {
      user_id?: string;
      bio?: string;
      avatar_url?: string;
    };
  };
}

export default function FavoritesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'services' | 'providers'>('services');
  const [favoriteServices, setFavoriteServices] = useState<FavoriteService[]>([]);
  const [favoriteProviders, setFavoriteProviders] = useState<FavoriteProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfileId();
    }
  }, [user]);

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
      setLoading(true);

      // Fetch favorite services with service details
      const { data: servicesData, error: servicesError } = await supabase
        .from('favorite_services')
        .select(`
          id,
          service_id,
          services (
            id,
            name,
            description,
            base_duration_minutes
          )
        `)
        .eq('customer_id', idToUse)
        .order('created_at', { ascending: false });

      if (servicesError) throw servicesError;

      // Fetch min prices for services
      if (servicesData && servicesData.length > 0) {
        const serviceIds = servicesData.map(fs => fs.service_id);
        const { data: pricesData } = await supabase
          .from('provider_services')
          .select('service_id, price')
          .in('service_id', serviceIds);

        // Calculate min price for each service
        const minPrices: Record<string, number> = {};
        pricesData?.forEach(ps => {
          if (!minPrices[ps.service_id] || ps.price < minPrices[ps.service_id]) {
            minPrices[ps.service_id] = ps.price;
          }
        });

        // Add min prices to services
        const servicesWithPrices = servicesData.map(fs => ({
          ...fs,
          services: {
            ...fs.services,
            min_price: minPrices[fs.service_id],
          },
        }));

        setFavoriteServices(servicesWithPrices as unknown as FavoriteService[]);
      } else {
        setFavoriteServices([]);
      }

      // Fetch favorite providers with provider details
      const { data: providersData, error: providersError } = await supabase
        .from('favorite_providers')
        .select(`
          id,
          provider_id,
          provider_profiles (
            id,
            business_name,
            rating,
            total_reviews,
            is_verified,
            profiles (
              user_id,
              bio,
              avatar_url
            )
          )
        `)
        .eq('customer_id', idToUse)
        .order('created_at', { ascending: false });

      if (providersError) throw providersError;

      let activeProvidersData = providersData || [];
      const providerUserIds = Array.from(
        new Set(
          activeProvidersData
            .map((provider: any) => provider?.provider_profiles?.profiles?.user_id)
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
          activeProvidersData = activeProvidersData.filter((provider: any) => {
            const userId = provider?.provider_profiles?.profiles?.user_id;
            return !!userId && activeUserIds.has(userId);
          });
        } else {
          console.warn('Unable to filter deactivated favorite providers:', activeUsersError.message);
        }
      }

      setFavoriteProviders((activeProvidersData as unknown as FavoriteProvider[]) || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      Alert.alert('Error', 'Failed to load favorites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFavorites();
  }, []);

  const handleRemoveFavorite = async (favoriteId: string, type: 'service' | 'provider') => {
    try {
      const table = type === 'service' ? 'favorite_services' : 'favorite_providers';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      // Update local state
      if (type === 'service') {
        setFavoriteServices(prev => prev.filter(f => f.id !== favoriteId));
      } else {
        setFavoriteProviders(prev => prev.filter(f => f.id !== favoriteId));
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
      Alert.alert('Error', 'Failed to remove favorite');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleBulkRemove = async () => {
    if (selectedItems.size === 0) return;

    Alert.alert(
      'Remove Favorites',
      `Remove ${selectedItems.size} ${activeTab === 'services' ? 'service' : 'provider'}(s) from favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const table = activeTab === 'services' ? 'favorite_services' : 'favorite_providers';
              const { error } = await supabase
                .from(table)
                .delete()
                .in('id', Array.from(selectedItems));

              if (error) throw error;

              // Update local state
              if (activeTab === 'services') {
                setFavoriteServices(prev => prev.filter(f => !selectedItems.has(f.id)));
              } else {
                setFavoriteProviders(prev => prev.filter(f => !selectedItems.has(f.id)));
              }

              setSelectedItems(new Set());
              setSelectionMode(false);
            } catch (error) {
              console.error('Error removing favorites:', error);
              Alert.alert('Error', 'Failed to remove favorites');
            }
          },
        },
      ]
    );
  };

  const handleServicePress = (service: any) => {
    if (selectionMode) {
      toggleSelection(service.id);
    } else {
      // Navigate to service details or provider list
      navigation.navigate('Search', { selectedServiceId: service.service_id });
    }
  };

  const handleProviderPress = (provider: any) => {
    if (selectionMode) {
      toggleSelection(provider.id);
    } else {
      // Navigate to provider profile
      navigation.navigate('ProviderProfile', { providerId: provider.provider_id });
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={activeTab === 'services' ? 'heart-outline' : 'people-outline'}
        size={80}
        color={colors.textSecondary}
      />
      <Text style={styles.emptyTitle}>
        No Favorite {activeTab === 'services' ? 'Services' : 'Providers'} Yet
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === 'services'
          ? 'Start adding services to your favorites for quick access'
          : 'Save your favorite providers to book with them again'}
      </Text>
      <AnimatedButton
        variant="primary"
        onPress={() => navigation.navigate('Search')}
        style={styles.exploreButton}
      >
        <Text style={styles.exploreButtonText}>Explore Services</Text>
      </AnimatedButton>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Selection Mode Header */}
      {((activeTab === 'services' && favoriteServices.length > 0) ||
        (activeTab === 'providers' && favoriteProviders.length > 0)) && (
        <View style={styles.selectionHeader}>
          <TouchableOpacity
            onPress={() => {
              if (selectionMode) {
                setSelectedItems(new Set());
              }
              setSelectionMode(!selectionMode);
            }}
          >
            <Text style={styles.selectButton}>
              {selectionMode ? 'Cancel' : 'Select'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'services' && styles.activeTab]}
          onPress={() => {
            setActiveTab('services');
            setSelectionMode(false);
            setSelectedItems(new Set());
          }}
        >
          <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>
            Services ({favoriteServices.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'providers' && styles.activeTab]}
          onPress={() => {
            setActiveTab('providers');
            setSelectionMode(false);
            setSelectedItems(new Set());
          }}
        >
          <Text style={[styles.tabText, activeTab === 'providers' && styles.activeTabText]}>
            Providers ({favoriteProviders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <BrandedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          activeTab === 'services' ? (
            <SkeletonServiceList count={5} />
          ) : (
            <SkeletonProviderList count={5} />
          )
        ) : activeTab === 'services' ? (
          favoriteServices.length === 0 ? (
            renderEmptyState()
          ) : (
            favoriteServices.map((favorite) => (
              <AnimatedCard
                key={favorite.id}
                onPress={() => handleServicePress(favorite)}
              >
                <View style={styles.serviceCard}>
                  {selectionMode && (
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => toggleSelection(favorite.id)}
                    >
                      <Ionicons
                        name={selectedItems.has(favorite.id) ? 'checkbox' : 'square-outline'}
                        size={24}
                        color={selectedItems.has(favorite.id) ? colors.primary : colors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                  <View style={styles.serviceCardContent}>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{favorite.services.name}</Text>
                      <Text style={styles.serviceDescription} numberOfLines={2}>
                        {favorite.services.description}
                      </Text>
                      <Text style={styles.serviceDuration}>
                        ⏱️ {favorite.services.base_duration_minutes} minutes
                      </Text>
                    </View>
                    {favorite.services.min_price !== undefined && (
                      <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>Starts at</Text>
                        <Text style={styles.price}>${favorite.services.min_price.toFixed(0)}</Text>
                      </View>
                    )}
                  </View>
                  {!selectionMode && (
                    <AnimatedHeart
                      isFavorite={true}
                      onPress={() => handleRemoveFavorite(favorite.id, 'service')}
                      size={24}
                    />
                  )}
                </View>
              </AnimatedCard>
            ))
          )
        ) : (
          favoriteProviders.length === 0 ? (
            renderEmptyState()
          ) : (
            favoriteProviders.map((favorite) => (
              <AnimatedCard
                key={favorite.id}
                onPress={() => handleProviderPress(favorite)}
              >
                <View style={styles.providerCard}>
                  {selectionMode && (
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => toggleSelection(favorite.id)}
                    >
                      <Ionicons
                        name={selectedItems.has(favorite.id) ? 'checkbox' : 'square-outline'}
                        size={24}
                        color={selectedItems.has(favorite.id) ? colors.primary : colors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                  <View style={styles.providerCardContent}>
                    {favorite.provider_profiles.profiles?.avatar_url ? (
                      <Image
                        source={{ uri: favorite.provider_profiles.profiles.avatar_url }}
                        style={styles.providerAvatar}
                      />
                    ) : (
                      <View style={[styles.providerAvatar, styles.providerAvatarPlaceholder]}>
                        <Text style={styles.providerInitial}>
                          {favorite.provider_profiles.business_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.providerInfo}>
                      <View style={styles.providerNameRow}>
                        <Text style={styles.providerName}>
                          {favorite.provider_profiles.business_name}
                        </Text>
                        {favorite.provider_profiles.is_verified && (
                          <Text style={styles.verifiedBadge}>✓</Text>
                        )}
                      </View>
                      <View style={styles.ratingContainer}>
                        <Text style={styles.ratingText}>
                          ⭐ {favorite.provider_profiles.rating.toFixed(1)}
                        </Text>
                        <Text style={styles.reviewsText}>
                          ({favorite.provider_profiles.total_reviews} reviews)
                        </Text>
                      </View>
                      {favorite.provider_profiles.profiles?.bio && (
                        <Text style={styles.providerBio} numberOfLines={2}>
                          {favorite.provider_profiles.profiles.bio}
                        </Text>
                      )}
                    </View>
                  </View>
                  {!selectionMode && (
                    <AnimatedHeart
                      isFavorite={true}
                      onPress={() => handleRemoveFavorite(favorite.id, 'provider')}
                      size={24}
                    />
                  )}
                </View>
              </AnimatedCard>
            ))
          )
        )}
      </ScrollView>

      {/* Bulk Remove Button */}
      {selectionMode && selectedItems.size > 0 && (
        <View style={styles.bulkActionBar}>
          <Text style={styles.selectedCount}>
            {selectedItems.size} selected
          </Text>
          <AnimatedButton
            variant="primary"
            onPress={handleBulkRemove}
            style={styles.bulkRemoveButton}
          >
            <Text style={styles.bulkRemoveText}>Remove Selected</Text>
          </AnimatedButton>
        </View>
      )}
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectButton: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.surface,
  },
  content: {
    flex: 1,
    padding: spacing.screenPadding,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkbox: {
    padding: spacing.xs,
  },
  serviceCardContent: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  serviceDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * lineHeight.relaxed,
    marginBottom: spacing.xs,
  },
  serviceDuration: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  price: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.secondary,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  providerCardContent: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  providerAvatar: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.round,
  },
  providerAvatarPlaceholder: {
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerInitial: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  providerInfo: {
    flex: 1,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  providerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  verifiedBadge: {
    fontSize: fontSize.sm,
    color: colors.success,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  ratingText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.secondary,
  },
  reviewsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  providerBio: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * lineHeight.relaxed,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.screenPadding,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.md * lineHeight.relaxed,
    marginBottom: spacing.xl,
  },
  exploreButton: {
    paddingHorizontal: spacing.xl,
  },
  exploreButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.surface,
  },
  bulkActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  selectedCount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  bulkRemoveButton: {
    paddingHorizontal: spacing.xl,
  },
  bulkRemoveText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.surface,
  },
});
