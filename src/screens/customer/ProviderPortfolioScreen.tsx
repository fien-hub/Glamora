import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { analytics } from '../../services/analytics';
import * as Haptics from 'expo-haptics';
import BookingModal from '../../components/BookingModal';
import { getProviderAvailability } from '../../utils/availability';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PortfolioItem {
  id: string;
  image_url: string;
  video_url?: string;
  thumbnail_url?: string;
  media_type: 'image' | 'video';
  video_duration_seconds?: number;
  caption?: string;
  like_count: number;
  view_count: number;
  is_liked: boolean;
  is_saved: boolean;
  created_at: string;
  tags?: string[];
  provider_service_id?: string;
  service_name?: string;
  service_price?: number;
}

interface ProviderService {
  id: string;
  service_id: string;
  service_name: string;
  description?: string;
  base_price: number;
  final_price: number;
  duration_minutes: number;
  category_name?: string;
}

interface ProviderInfo {
  id: string;
  business_name: string;
  avatar_url?: string;
  bio?: string;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  location_city?: string;
  location_state?: string;
  years_experience?: number;
  certifications?: string[];
}

export default function ProviderPortfolioScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const providerId = route.params?.providerId;

  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [providerServices, setProviderServices] = useState<ProviderService[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState<'services' | 'portfolio'>('services');
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<ProviderService | null>(null);
  const [availability, setAvailability] = useState<string>('Check availability');
  const videoRef = useRef<Video>(null);

  // Format video duration as MM:SS
  const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (providerId) {
      loadProviderData();
      checkIfFavorite();
    }
  }, [providerId]);

  const checkIfFavorite = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('favorite_providers')
        .select('id')
        .eq('customer_id', user.id)
        .eq('provider_id', providerId)
        .single();
      setIsFavorite(!!data);
    } catch {
      setIsFavorite(false);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to save favorites');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (isFavorite) {
        await supabase.from('favorite_providers').delete()
          .eq('customer_id', user.id).eq('provider_id', providerId);
        setIsFavorite(false);
      } else {
        await supabase.from('favorite_providers').insert({ customer_id: user.id, provider_id: providerId });
        setIsFavorite(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorites');
    }
  };

  const loadProviderData = async () => {
    try {
      if (!refreshing) setLoading(true);

      // Get provider info with profile data
      const { data: providerData, error: providerError } = await supabase
        .from('provider_profiles')
        .select(`
          id,
          business_name,
          rating,
          total_reviews,
          is_verified,
          years_experience,
          certifications,
          city,
          state,
          profiles!inner (
            bio,
            avatar_url
          )
        `)
        .eq('id', providerId)
        .single();

      if (providerError) throw providerError;

      // Get the profiles data (it's an object, not array, due to !inner)
      const profilesData = providerData.profiles as any;

      const flatProvider = {
        id: providerData.id,
        business_name: providerData.business_name,
        avatar_url: profilesData?.avatar_url,
        bio: profilesData?.bio,
        rating: Number(providerData.rating) || 0,
        total_reviews: providerData.total_reviews || 0,
        is_verified: providerData.is_verified,
        location_city: providerData.city,
        location_state: providerData.state,
        years_experience: providerData.years_experience,
        certifications: providerData.certifications,
      };

      setProvider(flatProvider);

      // Fetch provider's services
      const { data: servicesData, error: servicesError } = await supabase
        .from('provider_services')
        .select(`
          id,
          service_id,
          base_price,
          platform_commission_rate,
          duration_minutes,
          custom_service_name,
          services!inner (
            name,
            description,
            service_categories (name)
          )
        `)
        .eq('provider_id', providerId)
        .eq('is_active', true);

      if (servicesError) throw servicesError;

      const formattedServices: ProviderService[] = (servicesData || []).map((s: any) => {
        const basePrice = Number(s.base_price);
        const commissionRate = Number(s.platform_commission_rate) || 0.20;
        const finalPrice = Math.round(basePrice * (1 + commissionRate));
        return {
          id: s.id,
          service_id: s.service_id,
          service_name: s.custom_service_name || s.services.name,
          description: s.services.description,
          base_price: basePrice,
          final_price: finalPrice,
          duration_minutes: s.duration_minutes || 60,
          category_name: s.services.service_categories?.name,
        };
      });

      setProviderServices(formattedServices);

      // Get availability
      try {
        const avail = await getProviderAvailability(providerId);
        setAvailability(avail.displayText);
      } catch {
        setAvailability('Check availability');
      }

      // Get portfolio items with service information
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolio_items')
        .select(`
          *,
          provider_services (
            id,
            base_price,
            custom_service_name,
            services (
              name
            )
          )
        `)
        .eq('provider_id', providerId)
        .eq('is_visible', true)
        .order('created_at', { ascending: false });

      if (portfolioError) throw portfolioError;

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

      const items: PortfolioItem[] = portfolioData.map((item: any) => ({
        id: item.id,
        image_url: item.image_url,
        video_url: item.video_url,
        thumbnail_url: item.thumbnail_url,
        media_type: item.media_type || 'image',
        video_duration_seconds: item.video_duration_seconds,
        caption: item.caption,
        like_count: item.like_count || 0,
        view_count: item.view_count || 0,
        is_liked: userLikes.includes(item.id),
        is_saved: userSaves.includes(item.id),
        created_at: item.created_at,
        tags: item.tags,
        provider_service_id: item.provider_service_id,
        service_name: item.provider_services?.custom_service_name || item.provider_services?.services?.name,
        service_price: item.provider_services?.base_price,
      }));

      setPortfolioItems(items);

      // Track analytics
      analytics.track('provider_portfolio_view', {
        provider_id: providerId,
        portfolio_count: items.length,
      }, user?.id);
    } catch (error) {
      console.error('Error loading provider data:', error);
      Alert.alert('Error', 'Failed to load provider portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: PortfolioItem) => {
    setSelectedItem(item);
    recordView(item.id);
  };

  const recordView = async (portfolioItemId: string) => {
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

  const handleLikePress = async (item: PortfolioItem) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to like posts');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const isLiking = !item.is_liked;
    setPortfolioItems(prev =>
      prev.map(p =>
        p.id === item.id
          ? {
              ...p,
              is_liked: isLiking,
              like_count: isLiking ? p.like_count + 1 : Math.max(0, p.like_count - 1),
            }
          : p
      )
    );

    if (selectedItem?.id === item.id) {
      setSelectedItem(prev => prev ? {
        ...prev,
        is_liked: isLiking,
        like_count: isLiking ? prev.like_count + 1 : Math.max(0, prev.like_count - 1),
      } : null);
    }

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) return;

      if (item.is_liked) {
        const { error } = await supabase
          .from('portfolio_likes')
          .delete()
          .eq('portfolio_item_id', item.id)
          .eq('profile_id', profileData.id);

        if (error) throw error;
        analytics.trackUnlike(item.id, providerId, user?.id);
      } else {
        const { error } = await supabase.from('portfolio_likes').insert({
          portfolio_item_id: item.id,
          profile_id: profileData.id,
        });

        if (error) throw error;
        analytics.trackLike(item.id, providerId, user?.id);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSavePress = async (item: PortfolioItem) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to save posts');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const isSaving = !item.is_saved;
    setPortfolioItems(prev =>
      prev.map(p => (p.id === item.id ? { ...p, is_saved: isSaving } : p))
    );

    if (selectedItem?.id === item.id) {
      setSelectedItem(prev => prev ? { ...prev, is_saved: isSaving } : null);
    }

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) return;

      if (item.is_saved) {
        const { error } = await supabase
          .from('portfolio_saves')
          .delete()
          .eq('portfolio_item_id', item.id)
          .eq('customer_id', profileData.id);

        if (error) throw error;
        analytics.trackUnsave(item.id, providerId, user?.id);
      } else {
        const { error } = await supabase.from('portfolio_saves').insert({
          portfolio_item_id: item.id,
          customer_id: profileData.id,
        });

        if (error) throw error;
        analytics.trackSave(item.id, providerId, user?.id);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  const handleBookPress = () => {
    analytics.trackBookingStart(selectedItem?.id || '', providerId, user?.id);
    navigation.navigate('Booking', {
      providerId: providerId,
      portfolioItemId: selectedItem?.id,
      serviceId: selectedItem?.provider_service_id,
    });
  };

  const handleServiceBook = (service: ProviderService) => {
    setSelectedService(service);
    setBookingModalVisible(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProviderData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading portfolio...</Text>
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={styles.errorText}>Provider not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Provider Header */}
        <View style={styles.header}>
          <Image
            source={{ uri: provider.avatar_url || 'https://via.placeholder.com/100' }}
            style={styles.avatar}
          />
          <View style={styles.headerInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.businessName}>{provider.business_name}</Text>
              {provider.is_verified && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </View>
            {provider.location_city && (
              <Text style={styles.location}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                {' '}{provider.location_city}, {provider.location_state}
              </Text>
            )}
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color={colors.warning} />
              <Text style={styles.rating}>
                {provider.rating.toFixed(1)} ({provider.total_reviews} reviews)
              </Text>
            </View>
          </View>
          {/* Favorite Button */}
          <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? colors.error : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{providerServices.length}</Text>
            <Text style={styles.statLabel}>Services</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{portfolioItems.length}</Text>
            <Text style={styles.statLabel}>Portfolio</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{provider.years_experience || 0}+</Text>
            <Text style={styles.statLabel}>Years</Text>
          </View>
        </View>

        {/* Availability Badge */}
        {availability ? (
          <View style={styles.availabilityContainer}>
            <Ionicons name="time-outline" size={18} color={colors.success} />
            <Text style={styles.availabilityText}>{availability}</Text>
          </View>
        ) : null}

        {/* Bio */}
        {provider.bio && (
          <View style={styles.bioContainer}>
            <Text style={styles.bioLabel}>About</Text>
            <Text style={styles.bio}>{provider.bio}</Text>
          </View>
        )}

        {/* Certifications */}
        {provider.certifications && provider.certifications.length > 0 && (
          <View style={styles.certificationsContainer}>
            <Text style={styles.certificationsLabel}>Certifications</Text>
            <View style={styles.certificationsList}>
              {provider.certifications.map((cert, index) => (
                <View key={index} style={styles.certificationChip}>
                  <Ionicons name="ribbon-outline" size={14} color={colors.primary} />
                  <Text style={styles.certificationText}>{cert}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'services' && styles.activeTab]}
            onPress={() => setActiveTab('services')}
          >
            <Ionicons name="cut-outline" size={20} color={activeTab === 'services' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>Services</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'portfolio' && styles.activeTab]}
            onPress={() => setActiveTab('portfolio')}
          >
            <Ionicons name="images-outline" size={20} color={activeTab === 'portfolio' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'portfolio' && styles.activeTabText]}>Portfolio</Text>
          </TouchableOpacity>
        </View>

        {/* Services Tab */}
        {activeTab === 'services' && (
          <View style={styles.servicesSection}>
            {providerServices.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cut-outline" size={48} color={colors.textLight} />
                <Text style={styles.emptyText}>No services listed yet</Text>
              </View>
            ) : (
              providerServices.map((service) => (
                <View key={service.id} style={styles.serviceCard}>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.service_name}</Text>
                    {service.category_name && (
                      <Text style={styles.serviceCategory}>{service.category_name}</Text>
                    )}
                    {service.description && (
                      <Text style={styles.serviceDescription} numberOfLines={2}>
                        {service.description}
                      </Text>
                    )}
                    <View style={styles.serviceDetails}>
                      <View style={styles.serviceDuration}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.serviceDurationText}>{service.duration_minutes} min</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.servicePriceSection}>
                    <Text style={styles.servicePrice}>${(service.final_price / 100).toFixed(0)}</Text>
                    <TouchableOpacity
                      style={styles.bookServiceButton}
                      onPress={() => handleServiceBook(service)}
                    >
                      <Text style={styles.bookServiceButtonText}>Book</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <View style={styles.portfolioSection}>
            {portfolioItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={48} color={colors.textLight} />
                <Text style={styles.emptyText}>No portfolio posts yet</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {portfolioItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.gridItem}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: item.media_type === 'video' ? (item.thumbnail_url || item.image_url) : item.image_url }}
                      style={styles.gridImage}
                    />
                    <View style={styles.gridOverlay}>
                      <View style={styles.gridStats}>
                        <Ionicons name="heart" size={16} color={colors.white} />
                        <Text style={styles.gridStatText}>{item.like_count}</Text>
                      </View>
                    </View>
                    {/* Video indicator */}
                    {item.media_type === 'video' && (
                      <>
                        <View style={styles.videoPlayIcon}>
                          <Ionicons name="play-circle" size={32} color={colors.white} />
                        </View>
                        {item.video_duration_seconds && (
                          <View style={styles.videoDurationBadge}>
                            <Text style={styles.videoDurationText}>
                              {formatDuration(item.video_duration_seconds)}
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Booking Modal */}
      {selectedService && (
        <BookingModal
          visible={bookingModalVisible}
          onClose={() => {
            setBookingModalVisible(false);
            setSelectedService(null);
          }}
          provider={{
            id: provider.id,
            user_id: provider.id, // provider_profiles.id is used as user reference
            business_name: provider.business_name,
            price: selectedService.final_price,
          }}
          service={{
            id: selectedService.service_id,
            name: selectedService.service_name,
            description: selectedService.description || '',
            base_duration_minutes: selectedService.duration_minutes,
          }}
          onSuccess={(_bookingId, _providerId, providerName) => {
            setBookingModalVisible(false);
            setSelectedService(null);
            Alert.alert('Success', `Booking confirmed with ${providerName || provider.business_name}!`);
          }}
        />
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <View style={styles.modal}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setSelectedItem(null)}
            activeOpacity={1}
          />
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedItem(null)}
            >
              <Ionicons name="close" size={28} color={colors.white} />
            </TouchableOpacity>

            {/* Video or Image Display */}
            {selectedItem.media_type === 'video' && selectedItem.video_url ? (
              <View style={styles.modalVideoContainer}>
                <Video
                  ref={videoRef}
                  source={{ uri: selectedItem.video_url }}
                  style={styles.modalVideo}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  isLooping
                  useNativeControls
                />
              </View>
            ) : (
              <Image
                source={{ uri: selectedItem.image_url }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}

            <View style={styles.modalInfo}>
              {selectedItem.caption && (
                <Text style={styles.modalCaption}>{selectedItem.caption}</Text>
              )}

              {/* Service Tag */}
              {selectedItem.provider_service_id && selectedItem.service_name && (
                <View style={styles.serviceTagContainer}>
                  <View style={styles.serviceTagBadge}>
                    <Ionicons name="pricetag" size={16} color={colors.primary} />
                    <Text style={styles.serviceTagLabel}>Service:</Text>
                    <Text style={styles.serviceTagName}>{selectedItem.service_name}</Text>
                  </View>
                  {selectedItem.service_price && (
                    <Text style={styles.serviceTagPrice}>
                      ${(selectedItem.service_price / 100).toFixed(2)}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalActionButton}
                  onPress={() => handleLikePress(selectedItem)}
                >
                  <Ionicons
                    name={selectedItem.is_liked ? 'heart' : 'heart-outline'}
                    size={28}
                    color={selectedItem.is_liked ? colors.error : colors.white}
                  />
                  <Text style={styles.modalActionText}>{selectedItem.like_count}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalActionButton}
                  onPress={() => handleSavePress(selectedItem)}
                >
                  <Ionicons
                    name={selectedItem.is_saved ? 'bookmark' : 'bookmark-outline'}
                    size={28}
                    color={colors.white}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalActionButton, styles.bookButton]}
                  onPress={handleBookPress}
                >
                  <Text style={styles.bookButtonText}>
                    {selectedItem.provider_service_id ? 'Book This Service' : 'Book Now'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  backButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
  },
  backButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  header: {
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.round,
    backgroundColor: colors.border,
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  businessName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginRight: spacing.xs,
  },
  location: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginLeft: spacing.xs,
  },
  bioContainer: {
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  bio: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  portfolioSection: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  gridItem: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 4) / 3,
    height: (SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 4) / 3,
    margin: spacing.xs,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  videoPlayIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
  },
  videoDurationBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  videoDurationText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    padding: spacing.sm,
  },
  gridStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridStatText: {
    fontSize: fontSize.sm,
    color: colors.white,
    marginLeft: spacing.xs,
    fontWeight: fontWeight.semibold,
  },
  modal: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalContent: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  modalVideoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  modalInfo: {
    padding: spacing.lg,
  },
  modalCaption: {
    fontSize: fontSize.md,
    color: colors.white,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  serviceTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  serviceTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  serviceTagLabel: {
    fontSize: fontSize.sm,
    color: colors.white,
    opacity: 0.8,
  },
  serviceTagName: {
    fontSize: fontSize.sm,
    color: colors.white,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  serviceTagPrice: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modalActionText: {
    fontSize: fontSize.md,
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  bookButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.black,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.successLight || '#E8F5E9',
    gap: spacing.xs,
  },
  availabilityText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  bioLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  certificationsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  certificationsLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  certificationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  certificationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight || '#FFF0F5',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    gap: spacing.xs,
  },
  certificationText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  servicesSection: {
    padding: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    marginTop: spacing.md,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  serviceCategory: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  serviceDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  serviceDurationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  servicePriceSection: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: spacing.md,
  },
  servicePrice: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  bookServiceButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    marginTop: spacing.sm,
  },
  bookServiceButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.black,
  },
});

