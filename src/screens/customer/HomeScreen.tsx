import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from '../../utils/linearGradient';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { Ionicons } from '../../utils/icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { HOME_HEADER_HEIGHT } from '../../components/HomeHeader';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import SocialDiscoveryFeed from '../../components/SocialDiscoveryFeed';
import TrendingFeed from '../../components/TrendingFeed';
import PillTabs from '../../components/PillTabs';
import CachedImage, { CachedAvatarImage, CachedHeroImage } from '../../components/CachedImage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = 130;
const HERO_BANNER_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const getWelcomeMessageKey = (userId: string) => `glamora_show_welcome_${userId}`;
const getTourCompletedKey = (userId: string) => `glamora_home_tour_completed_${userId}`;

// ─── Static data ─────────────────────────────────────────────────────────────

const HERO_BANNERS = [
  {
    id: '1',
    tag: 'New Arrivals',
    title: 'Book Your\nPerfect Look',
    subtitle: 'Top-rated stylists\nin your area',
    cta: 'Book Now',
    bg: '#8B6A53',
    image: require('../../../assets/home-hero-3310.jpg'),
  },
  {
    id: '2',
    tag: 'Limited Offer',
    title: 'First Session\n50% Off',
    subtitle: 'New to Glamora?\nGet your first booking half price',
    cta: 'Claim Now',
    bg: '#8B6A53',
    image: require('../../../assets/home-hero-3303.jpg'),
  },
  {
    id: '3',
    tag: 'Trending',
    title: 'Nail Art &\nSkin Glow',
    subtitle: 'Explore the latest beauty\ntrends near you',
    cta: 'Explore',
    bg: '#8B6A53',
    image: require('../../../assets/home-hero-3317.jpg'),
  },
];

const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace('#', '');
  const normalized = sanitized.length === 3
    ? sanitized.split('').map((char) => char + char).join('')
    : sanitized;

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const FILTER_TABS = ['All', 'Top Rated', 'New', 'Budget'];

interface Provider {
  id: string;
  business_name: string;
  bio: string;
  avatar_url?: string;
  rating: number;
  total_reviews: number;
  price?: number;
  is_verified: boolean;
  created_at?: string;
}

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TourStep {
  key: string;
  title: string;
  description: string;
  targetRef?: React.RefObject<View | null>;
  staticRect?: SpotlightRect;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  useScreenTracking('Home');
  const navigation = useNavigation<any>();
  const isScreenFocused = useIsFocused();
  const { user } = useAuth();

  const [heroBannerIndex, setHeroBannerIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedFeedTab, setSelectedFeedTab] = useState('For You');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [shouldAutoStartTour, setShouldAutoStartTour] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [tourSpotlightRect, setTourSpotlightRect] = useState<SpotlightRect | null>(null);
  const bannerRef = useRef<ScrollView>(null);
  const heroCtaRef = useRef<View>(null);
  const featuredSectionRef = useRef<View>(null);
  const firstProviderCardRef = useRef<View>(null);
  const feedTabsRef = useRef<View>(null);

  const welcomeDisplayName =
    user?.user_metadata?.first_name
    || user?.user_metadata?.given_name
    || user?.user_metadata?.full_name?.split(' ')?.[0]
    || 'Beautiful';
  const sparkleScale = useRef(new Animated.Value(1)).current;
  const sparkleOpacity = useRef(new Animated.Value(0.9)).current;
  const heroShimmerTranslate = useRef(new Animated.Value(-HERO_BANNER_WIDTH)).current;

  // Auto-scroll hero banner
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroBannerIndex((prev) => {
        const next = (prev + 1) % HERO_BANNERS.length;
        bannerRef.current?.scrollTo({ x: next * HERO_BANNER_WIDTH, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Fetch featured providers
  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    const loadWelcomeMessage = async () => {
      if (!user?.id) return;

      try {
        const storageKey = getWelcomeMessageKey(user.id);
        const shouldShowWelcome = await AsyncStorage.getItem(storageKey);

        if (shouldShowWelcome !== 'true') {
          return;
        }

        await AsyncStorage.removeItem(storageKey);

        // Welcome modal removed — go straight to the tour guide.
        startTourIfNeeded();
      } catch (error) {
        console.warn('[HomeScreen] Failed to load welcome message:', error);
      }
    };

    loadWelcomeMessage();
  }, [user?.id, user?.user_metadata]);

  useEffect(() => {
    if (!welcomeMessage) {
      sparkleScale.setValue(1);
      sparkleOpacity.setValue(0.9);
      return;
    }

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.parallel([
          Animated.timing(sparkleScale, {
            toValue: 1.08,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(sparkleOpacity, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(sparkleScale, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(sparkleOpacity, {
            toValue: 0.9,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(2200),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
      sparkleScale.setValue(1);
      sparkleOpacity.setValue(0.9);
    };
  }, [welcomeMessage, sparkleOpacity, sparkleScale]);

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(heroShimmerTranslate, {
          toValue: HERO_BANNER_WIDTH,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(heroShimmerTranslate, {
          toValue: -HERO_BANNER_WIDTH,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(1700),
      ])
    );

    shimmerAnimation.start();

    return () => {
      shimmerAnimation.stop();
      heroShimmerTranslate.setValue(-HERO_BANNER_WIDTH);
    };
  }, [heroShimmerTranslate]);

  const fetchProviders = async () => {
    const providerMap = new Map<string, Provider>();

    const mergeProviderRow = (providerProfile: any, servicePrice?: number, profileRow?: any) => {
      if (!providerProfile?.id) return;

      const existing = providerMap.get(providerProfile.id);
      const avatarFromJoin = providerProfile.profiles?.avatar_url;
      const bioFromJoin = providerProfile.profiles?.bio;
      const createdAtFromJoin = providerProfile.profiles?.created_at;

      const mergedAvatar = existing?.avatar_url || avatarFromJoin || profileRow?.avatar_url;
      const mergedBio = existing?.bio || bioFromJoin || providerProfile.bio || profileRow?.bio || '';
      const mergedCreatedAt = existing?.created_at || createdAtFromJoin || profileRow?.created_at;

      if (!existing) {
        providerMap.set(providerProfile.id, {
          id: providerProfile.id,
          business_name: providerProfile.business_name || 'Beauty Provider',
          bio: mergedBio,
          avatar_url: mergedAvatar,
          rating: Number(providerProfile.rating) || 0,
          total_reviews: Number(providerProfile.total_reviews) || 0,
          price: Number.isFinite(servicePrice as number) ? servicePrice : undefined,
          is_verified: !!providerProfile.is_verified,
          created_at: mergedCreatedAt,
        });
        return;
      }

      if (existing.price === undefined && Number.isFinite(servicePrice as number)) {
        existing.price = servicePrice;
      } else if (Number.isFinite(servicePrice as number) && (servicePrice as number) < (existing.price as number)) {
        existing.price = servicePrice;
      }

      existing.avatar_url = existing.avatar_url || mergedAvatar;
      existing.bio = existing.bio || mergedBio;
      existing.rating = existing.rating || Number(providerProfile.rating) || 0;
      existing.total_reviews = existing.total_reviews || Number(providerProfile.total_reviews) || 0;
      existing.created_at = existing.created_at || mergedCreatedAt;
    };

    try {
      // 1) Preferred: active services + approved providers (same source as booking flows)
      if (__DEV__) console.log('[HomeScreen.fetchProviders] Starting Layer 1: approved providers with active services...');
      let query = supabase
        .from('provider_services')
        .select(`
          provider_id,
          base_price,
          custom_service_name,
          custom_service_status,
          provider_profiles!inner (
            id,
            business_name,
            rating,
            total_reviews,
            is_verified,
            identity_verification_status,
            profiles!inner (
              user_id,
              avatar_url,
              bio,
              created_at
            )
          )
        `)
        .eq('is_active', true)
        .eq('provider_profiles.identity_verification_status', 'approved')
        .or('custom_service_name.is.null,custom_service_status.eq.approved')
        .limit(200);

      let { data: servicesData, error: servicesError } = await query;
      let normalizedServicesData: any[] = servicesData || [];
      if (__DEV__) console.log('[HomeScreen.fetchProviders] Layer 1 result:', { count: normalizedServicesData.length, error: servicesError?.message });
      
      if (servicesError) {
        console.warn('[HomeScreen] Approved provider query failed, falling back:', servicesError.message);
        normalizedServicesData = [];
      }

      // 2) Fallback: active services with approved identity and approved custom services
      if (normalizedServicesData.length === 0) {
        if (__DEV__) console.log('[HomeScreen.fetchProviders] Layer 1 empty, trying Layer 2: approved identity with active services...');
        const fallbackQuery = await supabase
          .from('provider_services')
          .select(`
            provider_id,
            base_price,
            custom_service_name,
            custom_service_status,
            provider_profiles!inner (
              id,
              business_name,
              rating,
              total_reviews,
              is_verified,
              identity_verification_status,
              profiles!inner (
                user_id,
                avatar_url,
                bio,
                created_at
              )
            )
          `)
          .eq('is_active', true)
          .eq('provider_profiles.identity_verification_status', 'approved')
          .or('custom_service_name.is.null,custom_service_status.eq.approved')
          .limit(200);

        if (__DEV__) console.log('[HomeScreen.fetchProviders] Layer 2 result:', { count: fallbackQuery.data?.length || 0, error: fallbackQuery.error?.message });
        
        if (!fallbackQuery.error) {
          normalizedServicesData = (fallbackQuery.data || []) as any[];
        } else {
          console.warn('[HomeScreen] Active services fallback failed:', fallbackQuery.error.message);
          normalizedServicesData = [];
        }
      }

      const providerUserIds = Array.from(
        new Set(
          normalizedServicesData
            .map((row: any) => row?.provider_profiles?.profiles?.user_id)
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
          normalizedServicesData = normalizedServicesData.filter((row: any) => {
            const userId = row?.provider_profiles?.profiles?.user_id;
            return !!userId && activeUserIds.has(userId);
          });
        } else {
          console.warn('[HomeScreen.fetchProviders] Could not filter by users.is_active:', activeUsersError.message);
        }
      }

      if (__DEV__) console.log('[HomeScreen.fetchProviders] Processing', normalizedServicesData.length, 'service records...');
      normalizedServicesData.forEach((providerService: any) => {
        const providerProfile = providerService.provider_profiles;
        const servicePrice = Number(providerService.base_price);
        mergeProviderRow(providerProfile, Number.isFinite(servicePrice) ? servicePrice : undefined);
      });
      if (__DEV__) console.log('[HomeScreen.fetchProviders] After Layer 1&2 processing, map has', providerMap.size, 'providers');

      // 3) No direct provider fallback: only providers with active service rows are discoverable.

      const mappedProviders = Array.from(providerMap.values())
        .sort((first, second) => (second.rating || 0) - (first.rating || 0))
        .slice(0, 20);

      if (__DEV__) console.log('[HomeScreen.fetchProviders] Final mapped providers count:', mappedProviders.length);
      if (mappedProviders.length > 0) {
        if (__DEV__) console.log('[HomeScreen.fetchProviders] First provider:', mappedProviders[0]);
      }

      setProviders(mappedProviders);
    } catch (error) {
      console.error('[HomeScreen] Error fetching featured providers:', error);
      setProviders([]);
    } finally {
      setLoadingProviders(false);
    }
  };

  const filteredProviders = useMemo(() => {
    const list = [...providers];

    if (activeFilter === 'Top Rated') {
      return list.sort((first, second) => (second.rating || 0) - (first.rating || 0));
    }

    if (activeFilter === 'New') {
      return list.sort((first, second) => {
        const firstTime = first.created_at ? new Date(first.created_at).getTime() : 0;
        const secondTime = second.created_at ? new Date(second.created_at).getTime() : 0;
        return secondTime - firstTime;
      });
    }

    if (activeFilter === 'Budget') {
      return list.sort((first, second) => {
        const firstPrice = first.price ?? Number.POSITIVE_INFINITY;
        const secondPrice = second.price ?? Number.POSITIVE_INFINITY;
        return firstPrice - secondPrice;
      });
    }

    return list;
  }, [providers, activeFilter]);

  const tourSteps = useMemo<TourStep[]>(() => {
    const providerTargetRef = filteredProviders.length > 0 ? firstProviderCardRef : featuredSectionRef;

    return [
      {
        key: 'hero-cta',
        title: 'Book in one tap 😊',
        description: 'Use this button to jump straight into finding and booking a service 😍',
        targetRef: heroCtaRef,
      },
      {
        key: 'featured-providers',
        title: 'Top providers 🤩',
        description: 'These are highlighted pros with strong ratings and recent activity 👀',
        targetRef: providerTargetRef,
      },
      {
        key: 'explore-tabs',
        title: 'Explore your feed 😄',
        description: 'Switch between For You and Trending to discover new looks nearby ✨',
        targetRef: feedTabsRef,
      },
    ];
  }, [filteredProviders.length]);

  const measureSpotlightTarget = (targetRef: React.RefObject<View | null>) => new Promise<SpotlightRect | null>((resolve) => {
    const node = targetRef.current as any;
    if (!node || typeof node.measureInWindow !== 'function') {
      resolve(null);
      return;
    }

    node.measureInWindow((x: number, y: number, width: number, height: number) => {
      if (!Number.isFinite(x) || !Number.isFinite(y) || width <= 0 || height <= 0) {
        resolve(null);
        return;
      }

      resolve({ x, y, width, height });
    });
  });

  const completeTour = async () => {
    setShowTour(false);
    setTourStepIndex(0);
    setTourSpotlightRect(null);

    if (!user?.id) {
      return;
    }

    try {
      await AsyncStorage.setItem(getTourCompletedKey(user.id), 'true');
    } catch (error) {
      console.warn('[HomeScreen] Failed to persist tour completion:', error);
    }
  };

  const startTourIfNeeded = async () => {
    if (!user?.id) {
      return;
    }

    try {
      const tourCompleted = await AsyncStorage.getItem(getTourCompletedKey(user.id));
      if (tourCompleted === 'true') {
        return;
      }

      setTourStepIndex(0);
      setShowTour(true);
    } catch (error) {
      console.warn('[HomeScreen] Failed to start home tour:', error);
    }
  };

  const dismissWelcomeModal = () => {
    setWelcomeMessage(null);

    if (!shouldAutoStartTour) {
      return;
    }

    setShouldAutoStartTour(false);
    setTimeout(() => {
      startTourIfNeeded();
    }, 260);
  };

  useEffect(() => {
    if (!showTour) {
      setTourSpotlightRect(null);
      return;
    }

    let cancelled = false;

    const updateSpotlight = async () => {
      const step = tourSteps[tourStepIndex];

      if (!step) {
        await completeTour();
        return;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 120);
      });

      const measured = step.targetRef ? await measureSpotlightTarget(step.targetRef) : null;
      if (cancelled) {
        return;
      }

      if (measured) {
        setTourSpotlightRect(measured);
        return;
      }

      if (step.staticRect) {
        setTourSpotlightRect(step.staticRect);
        return;
      }

      setTourSpotlightRect({
        x: SCREEN_WIDTH / 2 - 52,
        y: SCREEN_HEIGHT / 2 - 52,
        width: 104,
        height: 104,
      });
    };

    updateSpotlight();

    return () => {
      cancelled = true;
    };
  }, [showTour, tourStepIndex, tourSteps]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleProviderPress = (provider: Provider) => {
    navigation.navigate('ProviderPortfolio', { providerId: provider.id });
  };

  const handleDevResetPreview = async () => {
    if (user?.id) {
      try {
        await AsyncStorage.removeItem(getTourCompletedKey(user.id));
      } catch (error) {
        console.warn('[HomeScreen] Failed to reset tour preview state:', error);
      }
    }

    setShowTour(false);
    setTourStepIndex(0);
    setTourSpotlightRect(null);
    setShouldAutoStartTour(true);
    setWelcomeMessage('Your account is ready — let’s find your next beauty experience.');
  };

  const handleTourNext = () => {
    if (tourStepIndex >= tourSteps.length - 1) {
      completeTour();
      return;
    }

    setTourStepIndex((prev) => prev + 1);
  };

  const renderHomeTourModal = () => {
    if (!isScreenFocused) {
      return null;
    }

    if (!showTour) {
      return null;
    }

    const step = tourSteps[tourStepIndex];
    if (!step) {
      return null;
    }

    const spotlight = tourSpotlightRect ?? {
      x: SCREEN_WIDTH / 2 - 52,
      y: SCREEN_HEIGHT / 2 - 52,
      width: 104,
      height: 104,
    };

    const spotlightInset = 12;
    const holeLeft = Math.max(0, spotlight.x - spotlightInset);
    const holeTop = Math.max(0, spotlight.y - spotlightInset);
    const holeRight = Math.min(SCREEN_WIDTH, spotlight.x + spotlight.width + spotlightInset);
    const holeBottom = Math.min(SCREEN_HEIGHT, spotlight.y + spotlight.height + spotlightInset);
    const holeWidth = Math.max(0, holeRight - holeLeft);
    const holeHeight = Math.max(0, holeBottom - holeTop);

    const topBlockHeight = holeTop;
    const leftBlockWidth = holeLeft;
    const rightBlockStart = holeRight;
    const bottomBlockStart = holeBottom;

    const tooltipHeight = 172;
    const hasRoomBelow = SCREEN_HEIGHT - bottomBlockStart > tooltipHeight + spacing.lg;
    const tooltipTop = hasRoomBelow
      ? Math.min(SCREEN_HEIGHT - tooltipHeight - spacing.lg, bottomBlockStart + spacing.md)
      : Math.max(spacing.xl, topBlockHeight - tooltipHeight - spacing.md);

    return (
      <Modal visible transparent animationType="fade" onRequestClose={completeTour}>
        <View style={styles.tourBackdrop}>
          <View style={[styles.tourOverlayBlock, { top: 0, left: 0, right: 0, height: topBlockHeight }]} />
          <View
            style={[
              styles.tourOverlayBlock,
              {
                top: topBlockHeight,
                left: 0,
                width: leftBlockWidth,
                height: holeHeight,
              },
            ]}
          />
          <View
            style={[
              styles.tourOverlayBlock,
              {
                top: topBlockHeight,
                left: rightBlockStart,
                right: 0,
                height: holeHeight,
              },
            ]}
          />
          <View
            style={[
              styles.tourOverlayBlock,
              {
                top: bottomBlockStart,
                left: 0,
                right: 0,
                bottom: 0,
              },
            ]}
          />

          <View
            pointerEvents="none"
            style={[
              styles.tourSpotlight,
              {
                width: holeWidth,
                height: holeHeight,
                left: holeLeft,
                top: holeTop,
              },
            ]}
          >
            <View style={[styles.tourSpotlightCorner, styles.tourSpotlightCornerTopLeft]} />
            <View style={[styles.tourSpotlightCorner, styles.tourSpotlightCornerTopRight]} />
            <View style={[styles.tourSpotlightCorner, styles.tourSpotlightCornerBottomLeft]} />
            <View style={[styles.tourSpotlightCorner, styles.tourSpotlightCornerBottomRight]} />
          </View>

          <View style={[styles.tourTooltipCard, { top: tooltipTop }]}>
            <Text style={styles.tourProgressLabel}>Step {tourStepIndex + 1} of {tourSteps.length}</Text>
            <Text style={styles.tourTitle}>{step.title}</Text>
            <Text style={styles.tourDescription}>{step.description}</Text>

            <View style={styles.tourActionsRow}>
              <TouchableOpacity style={styles.tourSecondaryButton} onPress={completeTour} activeOpacity={0.85}>
                <Text style={styles.tourSecondaryButtonText}>Skip 🙂</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tourPrimaryButton} onPress={handleTourNext} activeOpacity={0.9}>
                <Text style={styles.tourPrimaryButtonText}>
                  {tourStepIndex >= tourSteps.length - 1 ? 'Done 😎' : 'Next 😊'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderWelcomeModal = () => {
    if (!isScreenFocused) {
      return null;
    }

    if (!welcomeMessage) {
      return null;
    }

    const resolvedWelcomeBody = welcomeMessage.trim().length > 0
      ? welcomeMessage
      : 'Your account is ready — let’s find your next beauty experience.';

    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={dismissWelcomeModal}
      >
        <View style={styles.welcomeModalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={dismissWelcomeModal}
          />

          <SlideUpView delay={0}>
            <View style={styles.welcomeModalCard}>
              <LinearGradient
                colors={[colors.primaryLighter, colors.white]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.welcomeGradient}
              >
                <View style={styles.welcomeTopRow}>
                  <View style={styles.welcomeBadge}>
                    <Animated.View
                      style={[
                        styles.welcomeSparklePulse,
                        {
                          opacity: sparkleOpacity,
                          transform: [{ scale: sparkleScale }],
                        },
                      ]}
                    >
                      <Ionicons name="sparkles" size={14} color={colors.primaryDarker} />
                    </Animated.View>
                    <Text style={styles.welcomeBadgeText}>New Account</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.welcomeCloseButton}
                    onPress={dismissWelcomeModal}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.welcomeTextWrap}>
                  <Text style={styles.welcomeTitle}>Welcome, {welcomeDisplayName} 👋</Text>
                  <Text style={styles.welcomeText}>{resolvedWelcomeBody}</Text>
                </View>

                <TouchableOpacity
                  style={styles.welcomePrimaryAction}
                  onPress={dismissWelcomeModal}
                  activeOpacity={0.85}
                >
                  <Text style={styles.welcomePrimaryActionText}>Start Exploring</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.white} />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </SlideUpView>
        </View>
      </Modal>
    );
  };

  // ─── Render helpers ────────────────────────────────────────────────────────

  const renderHeroBanner = () => (
    <View style={styles.heroBannerWrapper}>
      <ScrollView
        ref={bannerRef}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / HERO_BANNER_WIDTH);
          setHeroBannerIndex(index);
        }}
      >
        {HERO_BANNERS.map((banner) => (
          <View key={banner.id} style={[styles.heroBanner, { backgroundColor: banner.bg }]}>
            {/* Text side */}
            <View style={styles.heroBannerTextSide}>
              <View style={styles.heroBannerTag}>
                <Text style={styles.heroBannerTagText}>{banner.tag}</Text>
              </View>
              <Text style={styles.heroBannerTitle}>{banner.title}</Text>
              <Text style={styles.heroBannerSubtitle}>{banner.subtitle}</Text>
              <TouchableOpacity
                ref={heroCtaRef}
                style={styles.heroCta}
                onPress={() => navigation.navigate('Search')}
                activeOpacity={0.85}
              >
                <Text style={styles.heroCtaText}>{banner.cta}</Text>
              </TouchableOpacity>
            </View>
            <LinearGradient
              pointerEvents="none"
              colors={[
                hexToRgba(banner.bg, 0.62),
                hexToRgba(banner.bg, 0.34),
                hexToRgba(banner.bg, 0),
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.heroBannerSeamBlur}
            />
            {/* Image side */}
            <View style={styles.heroBannerImageWrap}>
              <Image source={banner.image} style={styles.heroBannerImage} resizeMode="cover" />
              <LinearGradient
                colors={[hexToRgba(banner.bg, 0.92), hexToRgba(banner.bg, 0.45), hexToRgba(banner.bg, 0)]}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.heroBannerImageFade}
              />
            </View>

            <Animated.View
              pointerEvents="none"
              style={[
                styles.heroShimmerOverlay,
                {
                  transform: [{ translateX: heroShimmerTranslate }, { rotate: '-10deg' }],
                },
              ]}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0.1 }}
                end={{ x: 1, y: 0.9 }}
                style={styles.heroShimmerGradient}
              />
            </Animated.View>
          </View>
        ))}
      </ScrollView>
      {/* Dots */}
      <View pointerEvents="none" style={styles.heroDots}>
        {HERO_BANNERS.map((_, i) => (
          <View key={i} style={[styles.heroDot, i === heroBannerIndex && styles.heroDotActive]} />
        ))}
      </View>
    </View>
  );

  const renderProviderCard = (provider: Provider) => {
    const isFav = favorites.has(provider.id);
    return (
      <TouchableOpacity
        style={styles.providerCard}
        onPress={() => handleProviderPress(provider)}
        activeOpacity={0.92}
      >
        <View style={styles.providerImageWrapper}>
          {provider.avatar_url ? (
            <CachedAvatarImage uri={provider.avatar_url} style={styles.providerImage} resizeMode="cover" />
          ) : (
            <View style={[styles.providerImage, styles.providerImagePlaceholder]}>
              <Ionicons name="person" size={32} color={colors.textLight} />
            </View>
          )}
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => toggleFavorite(provider.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={18}
              color={isFav ? colors.error : colors.white}
            />
          </TouchableOpacity>
          {provider.is_verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.white} />
            </View>
          )}
        </View>
        <View style={styles.providerCardBody}>
          <Text style={styles.providerName} numberOfLines={1}>{provider.business_name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color={colors.gold} />
            <Text style={styles.ratingText}>
              {provider.rating ? provider.rating.toFixed(1) : 'New'}
            </Text>
            {!!provider.total_reviews && (
              <Text style={styles.reviewCount}>({provider.total_reviews})</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeaturedSection = () => (
    <SlideUpView delay={100}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Providers</Text>
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterPillsRow}
      >
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterPill, activeFilter === tab && styles.filterPillActive]}
            onPress={() => setActiveFilter(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, activeFilter === tab && styles.filterPillTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Provider grid */}
      {loadingProviders ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : filteredProviders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No providers yet. Check back soon!</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.providerGrid}
        >
          {filteredProviders.map((provider, index) => (
            <View
              key={provider.id}
              ref={index === 0 ? firstProviderCardRef : undefined}
              collapsable={false}
            >
              {renderProviderCard(provider)}
            </View>
          ))}
        </ScrollView>
      )}
    </SlideUpView>
  );

  // ─── Main render ───────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {__DEV__ && !welcomeMessage && (
          <TouchableOpacity
            style={styles.devWelcomeButton}
            onPress={handleDevResetPreview}
            activeOpacity={0.85}
          >
            <Ionicons name="flask-outline" size={14} color={colors.white} />
            <Text style={styles.devWelcomeButtonText}>Dev Reset Preview</Text>
          </TouchableOpacity>
        )}

        <FadeInView delay={0}>
          {renderHeroBanner()}
        </FadeInView>

        <View style={styles.sectionsContainer} ref={featuredSectionRef} collapsable={false}>
          {renderFeaturedSection()}
        </View>

        {/* Explore / Browse section */}
        <SlideUpView delay={150}>
          <View style={styles.exploreSectionHeader}>
            <Text style={styles.sectionTitle}>Explore</Text>
          </View>
          <View style={styles.feedTabsContainer} ref={feedTabsRef} collapsable={false}>
            <PillTabs
              tabs={['For You', 'Trending']}
              activeTab={selectedFeedTab}
              onTabChange={setSelectedFeedTab}
            />
          </View>
        </SlideUpView>
        {selectedFeedTab === 'For You'
          ? (
            <SocialDiscoveryFeed
              showInternalHeader
              showHeaderSearchBar={false}
              showHeaderCategoryPills
            />
          )
          : <TrendingFeed />}
      </ScrollView>

      {renderWelcomeModal()}
      {renderHomeTourModal()}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  scroll: {
    flex: 1,
    marginTop: HOME_HEADER_HEIGHT,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  devWelcomeButton: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    ...shadows.xs,
  },
  devWelcomeButtonText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  tourBackdrop: {
    flex: 1,
    position: 'relative',
  },
  tourOverlayBlock: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  tourSpotlight: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: colors.black,
    borderRadius: borderRadius.lg,
    backgroundColor: 'transparent',
  },
  tourSpotlightCorner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: colors.black,
  },
  tourSpotlightCornerTopLeft: {
    top: -3,
    left: -3,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  tourSpotlightCornerTopRight: {
    top: -3,
    right: -3,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  tourSpotlightCornerBottomLeft: {
    bottom: -3,
    left: -3,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  tourSpotlightCornerBottomRight: {
    bottom: -3,
    right: -3,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  tourTooltipCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.md,
  },
  tourProgressLabel: {
    fontSize: fontSize.xs,
    color: colors.primaryDarker,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  tourTitle: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  tourDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  tourActionsRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  tourSecondaryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  tourSecondaryButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  tourPrimaryButton: {
    minWidth: 122,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primaryDark,
  },
  tourPrimaryButtonText: {
    fontSize: fontSize.md,
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  welcomeModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 12, 10, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  welcomeModalCard: {
    width: Math.min(SCREEN_WIDTH - spacing.md * 2, 430),
    aspectRatio: 1,
    alignSelf: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    overflow: 'hidden',
    ...shadows.lg,
  },
  welcomeGradient: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  welcomeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  welcomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  welcomeBadgeText: {
    color: colors.primaryDarker,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  welcomeSparklePulse: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeCloseButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.round,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  welcomeTextWrap: {
    marginBottom: spacing.md,
    paddingRight: spacing.xs,
  },
  welcomeTitle: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  welcomeText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  welcomePrimaryAction: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryDarker,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...shadows.xs,
  },
  welcomePrimaryActionText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },

  // ── Hero Banner ──────────────────────────────────────────────────────────
  heroBannerWrapper: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  heroBanner: {
    width: HERO_BANNER_WIDTH,
    height: 200,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroBannerTextSide: {
    width: '42%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
    zIndex: 2,
  },
  heroBannerTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  heroBannerTagText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  heroBannerTitle: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  heroBannerSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: fontSize.xs,
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  heroCta: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.round,
    paddingVertical: 7,
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
  },
  heroCtaText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  heroBannerImage: {
    width: '100%',
    height: '100%',
  },
  heroBannerImageWrap: {
    width: '58%',
    height: '100%',
    position: 'relative',
    zIndex: 1,
  },
  heroBannerSeamBlur: {
    position: 'absolute',
    left: '40%',
    top: 0,
    bottom: 0,
    width: 56,
    zIndex: 3,
  },
  heroBannerImageFade: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 96,
    zIndex: 1,
  },
  heroShimmerOverlay: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 120,
    zIndex: 4,
    opacity: 0.5,
  },
  heroShimmerGradient: {
    flex: 1,
    borderRadius: borderRadius.round,
  },
  heroDots: {
    position: 'absolute',
    bottom: spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  heroDotActive: {
    width: 18,
    backgroundColor: colors.white,
  },

  // ── Sections wrapper ─────────────────────────────────────────────────────
  sectionsContainer: {
    backgroundColor: colors.white,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    ...shadows.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },

  // ── Section headers ──────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  seeAll: {
    fontSize: fontSize.sm,
    color: colors.primaryDarker,
    fontWeight: fontWeight.semibold,
  },

  // ── Categories ───────────────────────────────────────────────────────────
  categoriesRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.lg,
  },
  categoryItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  categoryCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },

  // ── Filter pills ─────────────────────────────────────────────────────────
  filterPillsRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterPillActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  filterPillText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  filterPillTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },

  // ── Provider grid ────────────────────────────────────────────────────────
  providerGrid: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  providerCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  providerImageWrapper: {
    position: 'relative',
  },
  providerImage: {
    width: '100%',
    height: 85,
    backgroundColor: colors.backgroundDark,
  },
  providerImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: colors.success,
    borderRadius: borderRadius.round,
    padding: 2,
  },
  providerCardBody: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    gap: 1,
  },
  providerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  reviewCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  // ── Empty state ──────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // ── Explore / feed section ───────────────────────────────────────────────
  exploreSectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  feedTabsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
});

