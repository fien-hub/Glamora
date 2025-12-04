import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, fontSize, fontWeight, borderRadius, lineHeight } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import { useAuth } from '../../contexts/AuthContext';
import AnimatedCard from '../../components/AnimatedCard';
import AnimatedHeart from '../../components/AnimatedHeart';
import { SkeletonProviderList } from '../../components/SkeletonCards';
import BookingModal from '../../components/BookingModal';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';
import { getProviderAvailability } from '../../utils/availability';

const RECENT_SEARCHES_KEY = 'glamora_recent_searches';
const MAX_RECENT_SEARCHES = 10;

interface ProviderService {
  id: string;
  provider_id: string;
  service_id: string;
  base_price: number;
  platform_commission_rate: number;
  duration_minutes: number;
  is_active: boolean;
  service: {
    id: string;
    name: string;
    description: string;
    base_duration_minutes: number;
    category_id: string;
  };
  provider: {
    id: string;
    business_name: string;
    avatar_url: string | null;
    rating: number;
    total_reviews: number;
    is_verified: boolean;
  };
  finalPrice: number;
  availability?: {
    displayText: string;
    urgency: string;
  };
}

interface Filters {
  priceRange: [number, number] | null;
  maxDistance: number | null;
  rating: number | null;
  availableNow: boolean;
}

const DEFAULT_FILTERS: Filters = {
  priceRange: null,
  maxDistance: null,
  rating: null,
  availableNow: false,
};

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<ProviderService[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [favoriteServices, setFavoriteServices] = useState<Set<string>>(new Set());
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<ProviderService | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  useScreenTracking('Search', {});

  useEffect(() => {
    loadRecentSearches();
    if (user) fetchFavorites();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const saveRecentSearch = async (query: string) => {
    try {
      const trimmed = query.trim();
      if (!trimmed) return;

      // Add to front, remove duplicates, limit to max
      const updated = [trimmed, ...recentSearches.filter(s => s.toLowerCase() !== trimmed.toLowerCase())]
        .slice(0, MAX_RECENT_SEARCHES);

      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  };

  const removeRecentSearch = async (query: string) => {
    try {
      const updated = recentSearches.filter(s => s !== query);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error removing recent search:', error);
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('favorite_providers')
        .select('provider_id')
        .eq('customer_id', user.id);
      setFavoriteServices(new Set(data?.map(f => f.provider_id) || []));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const handleSearch = async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;

    setLoading(true);
    setHasSearched(true);
    saveRecentSearch(searchTerm);

    try {
      // Search services by name or provider business name (only show verified providers)
      const { data, error } = await supabase
        .from('provider_services')
        .select(`
          id,
          provider_id,
          service_id,
          base_price,
          platform_commission_rate,
          duration_minutes,
          is_active,
          service:services!inner(id, name, description, base_duration_minutes, category_id),
          provider:provider_profiles!inner(id, business_name, avatar_url, rating, total_reviews, is_verified, identity_verification_status)
        `)
        .eq('is_active', true)
        .eq('provider.identity_verification_status', 'approved');

      if (error) throw error;

      // Filter by search term (service name or provider name)
      const filtered = (data || []).filter((ps: any) =>
        ps.service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ps.provider.business_name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Add final price and availability
      const resultsWithDetails = await Promise.all(
        filtered.map(async (ps: any) => {
          const basePrice = Number(ps.base_price);
          const commissionRate = Number(ps.platform_commission_rate) || 0.20;
          const finalPrice = Math.round(basePrice * (1 + commissionRate));

          let availability;
          try {
            availability = await getProviderAvailability(ps.provider_id);
          } catch {
            availability = { displayText: 'Check availability', urgency: 'unknown' };
          }

          return { ...ps, finalPrice, availability };
        })
      );

      setSearchResults(resultsWithDetails);
    } catch (error: any) {
      console.error('Error searching services:', error);
      Alert.alert('Error', 'Failed to search services');
    } finally {
      setLoading(false);
    }
  };

  const handleRecentSearchTap = (query: string) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  const toggleFavorite = async (providerId: string) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to save favorites');
      return;
    }
    const isFavorite = favoriteServices.has(providerId);
    try {
      if (isFavorite) {
        await supabase.from('favorite_providers').delete()
          .eq('customer_id', user.id).eq('provider_id', providerId);
        setFavoriteServices(prev => { const s = new Set(prev); s.delete(providerId); return s; });
      } else {
        await supabase.from('favorite_providers').insert({ customer_id: user.id, provider_id: providerId });
        setFavoriteServices(prev => new Set(prev).add(providerId));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorites');
    }
  };

  const handleBookNow = (ps: ProviderService) => {
    setSelectedService(ps);
    setBookingModalVisible(true);
  };

  const handleViewPortfolio = (providerId: string) => {
    navigation.navigate('ProviderPortfolio', { providerId });
  };

  const applyFilters = (newFilters: Filters) => {
    setFilters(newFilters);
    // Count active filters
    let count = 0;
    if (newFilters.priceRange) count++;
    if (newFilters.maxDistance) count++;
    if (newFilters.rating) count++;
    if (newFilters.availableNow) count++;
    setActiveFiltersCount(count);
    setShowFilterModal(false);
    // Re-run search with filters if already searched
    if (hasSearched) handleSearch();
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setActiveFiltersCount(0);
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Search Bar */}
        <FadeInView delay={0}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search services or providers..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => handleSearch()}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setHasSearched(false); setSearchResults([]); }}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
              <Ionicons name="options-outline" size={22} color={colors.text} />
              {activeFiltersCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </FadeInView>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* Loading State */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <SkeletonProviderList count={3} />
            </View>
          ) : !hasSearched ? (
            /* Recent Searches - shown when not searched yet */
            <View style={styles.section}>
              <SlideUpView delay={100}>
                {recentSearches.length > 0 ? (
                  <>
                    <View style={styles.recentHeader}>
                      <Text style={styles.sectionTitle}>Recent Searches</Text>
                      <TouchableOpacity onPress={clearRecentSearches}>
                        <Text style={styles.clearText}>Clear All</Text>
                      </TouchableOpacity>
                    </View>
                    {recentSearches.map((search, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.recentSearchItem}
                        onPress={() => handleRecentSearchTap(search)}
                      >
                        <View style={styles.recentSearchLeft}>
                          <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                          <Text style={styles.recentSearchText}>{search}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeRecentSearch(search)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name="close" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={64} color={colors.textLight} />
                    <Text style={styles.emptyText}>Search for services</Text>
                    <Text style={styles.emptySubtext}>Find beauty services and providers</Text>
                  </View>
                )}
              </SlideUpView>
            </View>
          ) : searchResults.length === 0 ? (
            /* No Results */
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No results found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          ) : (
            /* Search Results */
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {searchResults.length} Result{searchResults.length !== 1 ? 's' : ''}
              </Text>
              {searchResults.map((ps) => (
                <AnimatedCard key={ps.id}>
                  <View style={styles.serviceCard}>
                    {/* Provider Header */}
                    <TouchableOpacity style={styles.providerRow} onPress={() => handleViewPortfolio(ps.provider_id)}>
                      {ps.provider.avatar_url ? (
                        <Image source={{ uri: ps.provider.avatar_url }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarInitial}>{ps.provider.business_name.charAt(0)}</Text>
                        </View>
                      )}
                      <View style={styles.providerInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.providerName}>{ps.provider.business_name}</Text>
                          {ps.provider.is_verified && (
                            <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓</Text></View>
                          )}
                        </View>
                        <View style={styles.ratingRow}>
                          <Ionicons name="star" size={14} color={colors.warning} />
                          <Text style={styles.ratingText}>{ps.provider.rating.toFixed(1)}</Text>
                          <Text style={styles.reviewsText}>({ps.provider.total_reviews})</Text>
                        </View>
                      </View>
                      <AnimatedHeart
                        isFavorite={favoriteServices.has(ps.provider_id)}
                        onPress={() => toggleFavorite(ps.provider_id)}
                        size={24}
                      />
                    </TouchableOpacity>

                    {/* Service Info */}
                    <View style={styles.serviceInfoSection}>
                      <Text style={styles.serviceName}>{ps.service.name}</Text>
                      <Text style={styles.serviceDescription} numberOfLines={2}>{ps.service.description}</Text>
                      <View style={styles.serviceMeta}>
                        <Text style={styles.priceText}>${ps.finalPrice}</Text>
                        <View style={styles.durationContainer}>
                          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                          <Text style={styles.durationText}>{ps.duration_minutes || ps.service.base_duration_minutes} min</Text>
                        </View>
                      </View>
                      {ps.availability && (
                        <View style={[styles.availabilityBadge, ps.availability.urgency === 'immediate' && styles.availabilityImmediate]}>
                          <Ionicons
                            name={ps.availability.urgency === 'immediate' ? 'flash' : 'time'}
                            size={14}
                            color={ps.availability.urgency === 'immediate' ? colors.white : colors.success}
                          />
                          <Text style={[styles.availabilityText, ps.availability.urgency === 'immediate' && styles.availabilityTextImmediate]}>
                            {ps.availability.displayText}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Actions */}
                    <View style={styles.cardActions}>
                      <TouchableOpacity style={styles.viewProfileBtn} onPress={() => handleViewPortfolio(ps.provider_id)}>
                        <Text style={styles.viewProfileText}>View Portfolio</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.bookNowBtn} onPress={() => handleBookNow(ps)}>
                        <Text style={styles.bookNowText}>Book Now</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </AnimatedCard>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Booking Modal */}
      {selectedService && (
        <BookingModal
          visible={bookingModalVisible}
          onClose={() => setBookingModalVisible(false)}
          service={{
            id: selectedService.service_id,
            name: selectedService.service.name,
            description: selectedService.service.description,
            base_duration_minutes: selectedService.duration_minutes || selectedService.service.base_duration_minutes,
          }}
          provider={{
            id: selectedService.provider_id,
            user_id: selectedService.provider_id,
            business_name: selectedService.provider.business_name,
            price: selectedService.finalPrice,
          }}
          onSuccess={() => {
            setBookingModalVisible(false);
            Alert.alert('Success', 'Booking confirmed!');
          }}
        />
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.filterModal}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterModalContent}>
              {/* Price Range */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Price Range</Text>
                <View style={styles.filterOptions}>
                  {[
                    { label: 'Any', value: null },
                    { label: '$0-50', value: [0, 50] },
                    { label: '$50-100', value: [50, 100] },
                    { label: '$100-200', value: [100, 200] },
                    { label: '$200+', value: [200, 9999] },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.label}
                      style={[styles.filterChip,
                        JSON.stringify(filters.priceRange) === JSON.stringify(option.value) && styles.filterChipActive]}
                      onPress={() => setFilters(prev => ({ ...prev, priceRange: option.value as [number, number] | null }))}
                    >
                      <Text style={[styles.filterChipText,
                        JSON.stringify(filters.priceRange) === JSON.stringify(option.value) && styles.filterChipTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Distance */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Distance</Text>
                <View style={styles.filterOptions}>
                  {[
                    { label: 'Any', value: null },
                    { label: '5 km', value: 5 },
                    { label: '10 km', value: 10 },
                    { label: '25 km', value: 25 },
                    { label: '50 km', value: 50 },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.label}
                      style={[styles.filterChip, filters.maxDistance === option.value && styles.filterChipActive]}
                      onPress={() => setFilters(prev => ({ ...prev, maxDistance: option.value }))}
                    >
                      <Text style={[styles.filterChipText, filters.maxDistance === option.value && styles.filterChipTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Rating */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Minimum Rating</Text>
                <View style={styles.filterOptions}>
                  {[
                    { label: 'Any', value: null },
                    { label: '3+ ⭐', value: 3 },
                    { label: '4+ ⭐', value: 4 },
                    { label: '4.5+ ⭐', value: 4.5 },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.label}
                      style={[styles.filterChip, filters.rating === option.value && styles.filterChipActive]}
                      onPress={() => setFilters(prev => ({ ...prev, rating: option.value }))}
                    >
                      <Text style={[styles.filterChipText, filters.rating === option.value && styles.filterChipTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Available Now */}
              <View style={styles.filterSection}>
                <TouchableOpacity
                  style={styles.filterToggle}
                  onPress={() => setFilters(prev => ({ ...prev, availableNow: !prev.availableNow }))}
                >
                  <Text style={styles.filterLabel}>Available Now</Text>
                  <View style={[styles.toggle, filters.availableNow && styles.toggleActive]}>
                    <View style={[styles.toggleKnob, filters.availableNow && styles.toggleKnobActive]} />
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.filterModalFooter}>
              <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters}>
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyFiltersBtn} onPress={() => applyFilters(filters)}>
                <Text style={styles.applyFiltersText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
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
  },
  scrollContent: {
    paddingBottom: 100, // Space for floating tab bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  searchButtonText: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  clearText: {
    fontSize: fontSize.subtitle,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recentSearchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  recentSearchText: {
    fontSize: fontSize.body,
    color: colors.text,
  },
  filterButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundGray,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.black,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    paddingBottom: 100, // Space for floating tab bar
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterModalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  filterModalContent: {
    padding: spacing.lg,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.subtitle,
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.black,
    fontWeight: fontWeight.semibold,
  },
  filterToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  toggleKnobActive: {
    transform: [{ translateX: 22 }],
  },
  filterModalFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  clearFiltersBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  applyFiltersBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  applyFiltersText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacing.screenPadding,
  },
  pillTabsContainer: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.cardMargin,
    lineHeight: fontSize.title * lineHeight.tight,
  },
  emptyText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.sectionSpacing,
    lineHeight: fontSize.body * lineHeight.normal,
  },
  serviceCard: {
    padding: spacing.cardPadding,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.sm,
    backgroundColor: colors.backgroundGray,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarInitial: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  serviceInfoSection: {
    marginBottom: spacing.md,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  viewProfileBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  viewProfileText: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  bookNowBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  bookNowText: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  availabilityImmediate: {
    backgroundColor: colors.primaryDarker,
  },
  verifiedText: {
    fontSize: fontSize.caption,
    color: colors.primary,
  },
  serviceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  serviceInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  priceRange: {
    color: colors.textSecondary,
    fontWeight: fontWeight.regular,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  durationText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  providerCountText: {
    fontSize: fontSize.caption,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
  },
  serviceName: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: fontSize.bodyLarge * lineHeight.normal,
  },
  serviceDescription: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: fontSize.subtitle * lineHeight.normal,
  },
  serviceDuration: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
  },
  servicePriceContainer: {
    alignItems: 'flex-end',
    marginLeft: spacing.md,
  },
  servicePriceLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  servicePrice: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.primaryDarker, // High contrast pink for visibility
  },
  serviceCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  backButtonText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  providerCard: {
    overflow: 'hidden',
  },
  providerCardContent: {
    padding: spacing.cardPadding,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  providerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  providerAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: spacing.md,
    backgroundColor: colors.backgroundGray,
  },
  providerInitial: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
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
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: fontSize.body * lineHeight.normal,
  },
  verifiedBadge: {
    fontSize: fontSize.subtitle,
    color: colors.primary,
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  ratingText: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  reviewsText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
  },
  providerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  availabilityBadgeImmediate: {
    backgroundColor: colors.primaryDarker,
  },
  availabilityBadgeToday: {
    backgroundColor: colors.successLight,
  },
  availabilityText: {
    fontSize: fontSize.caption,
    color: colors.success,
    fontWeight: fontWeight.semibold,
  },
  availabilityTextImmediate: {
    color: colors.white,
  },
  availabilityTextToday: {
    color: colors.success,
  },
  distanceText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.secondary,
  },
  providerBio: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
    lineHeight: fontSize.subtitle * lineHeight.relaxed,
  },
  providerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  providerButtonGroup: {
    flexDirection: 'row',
    gap: spacing.md,
    flex: 1,
    justifyContent: 'flex-end',
  },
  viewProfileButtonText: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.medium,
  },
  bookButtonText: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semibold,
  },
  serviceFilterContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  serviceFilterScroll: {
    flexDirection: 'row',
  },
  serviceFilterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  serviceFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  serviceFilterText: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  serviceFilterTextActive: {
    color: colors.white,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptySubtext: {
    fontSize: fontSize.subtitle,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  servicesListContainer: {
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  servicesListTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  serviceItemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: spacing.md,
  },
  serviceItemName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flex: 1,
  },
  serviceItemPrice: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.secondary,
    marginRight: spacing.md,
  },
  bookServiceButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  bookServiceButtonText: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});

