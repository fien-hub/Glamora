import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '../../utils/icons';
import { colors, spacing, fontSize } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import { trackServiceDeleted } from '../../utils/analytics';
import { TOTAL_HEADER_HEIGHT } from '../../components/CurvedHeader';
import AddServiceModal from '../../components/AddServiceModal';
import FadeInView from '../../components/animations/FadeInView';
import StaggeredList from '../../components/animations/StaggeredList';

interface Service {
  id: string;
  name: string;
  description: string;
  base_duration_minutes: number;
  category_name?: string;
}

interface ProviderService {
  id: string;
  service_id: string;
  duration_minutes: number;
  description: string | null;
  is_active: boolean;
  platform_commission_rate: number;
  custom_service_name?: string | null;
  base_price: number;  // Provider's base price in cents
  accepts_over_25km: boolean;
  travel_fee_over_25km?: number;
  service: Service;
}

interface ServiceMediaItem {
  id: string;
  provider_service_id: string | null;
  image_url: string;
  thumbnail_url: string | null;
  media_type: 'image' | 'video';
  created_at: string;
}

const PLATFORM_COMMISSION_RATE = 0.20; // 20% commission
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const getServicesTourCompletedKey = (userId: string) => `glamora_provider_services_tour_completed_${userId}`;

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

export default function ServicesScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [myServices, setMyServices] = useState<ProviderService[]>([]);
  const [providerProfileId, setProviderProfileId] = useState<string | null>(null);
  const [serviceMediaMap, setServiceMediaMap] = useState<Record<string, ServiceMediaItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<ProviderService | null>(null);
  const [shouldAutoStartTour, setShouldAutoStartTour] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [tourSpotlightRect, setTourSpotlightRect] = useState<SpotlightRect | null>(null);
  const addButtonRef = useRef<View>(null);
  const emptyStateRef = useRef<View>(null);
  const firstServiceCardRef = useRef<View>(null);
  const firstMediaButtonRef = useRef<View>(null);

  // Track screen view
  useScreenTracking('Provider Services');

  useEffect(() => {
    fetchServices();
  }, [user]);

  // Refresh services when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchServices();
    }, [user])
  );

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const checkTourStatus = async () => {
        if (!user?.id) return;

        try {
          const tourCompleted = await AsyncStorage.getItem(getServicesTourCompletedKey(user.id));
          if (isActive && tourCompleted !== 'true') {
            setShouldAutoStartTour(true);
          }
        } catch (error) {
          console.warn('[ServicesScreen] Failed to load services tour status:', error);
        }
      };

      checkTourStatus();

      return () => {
        isActive = false;
      };
    }, [user?.id])
  );

  const tourSteps = useMemo<TourStep[]>(() => {
    if (myServices.length === 0) {
      return [
        {
          key: 'add-service',
          title: 'Add your first service ✨',
          description: 'Tap here to create a service customers can book from your profile.',
          targetRef: addButtonRef,
        },
        {
          key: 'empty-state',
          title: 'Build your menu 💅',
          description: 'Once you add services, they will appear here for quick editing and availability control.',
          targetRef: emptyStateRef,
        },
      ];
    }

    return [
      {
        key: 'add-service',
        title: 'Add more services ✨',
        description: 'Use this button anytime you want to expand your service menu.',
        targetRef: addButtonRef,
      },
      {
        key: 'manage-service',
        title: 'Manage each service 🛠️',
        description: 'Here you can review pricing, duration, travel settings, and turn availability on or off.',
        targetRef: firstServiceCardRef,
      },
      {
        key: 'add-service-media',
        title: 'Show your work 📸',
        description: 'Add photos or videos directly under a service so clients can book from that exact work.',
        targetRef: firstMediaButtonRef,
      },
    ];
  }, [myServices.length]);

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
    setShouldAutoStartTour(false);

    if (!user?.id) {
      return;
    }

    try {
      await AsyncStorage.setItem(getServicesTourCompletedKey(user.id), 'true');
    } catch (error) {
      console.warn('[ServicesScreen] Failed to persist services tour completion:', error);
    }
  };

  const startTourIfNeeded = async () => {
    if (!user?.id || tourSteps.length === 0) {
      return;
    }

    try {
      const tourCompleted = await AsyncStorage.getItem(getServicesTourCompletedKey(user.id));
      if (tourCompleted === 'true') {
        return;
      }

      setTourStepIndex(0);
      setShowTour(true);
    } catch (error) {
      console.warn('[ServicesScreen] Failed to start services tour:', error);
    }
  };

  useEffect(() => {
    if (!shouldAutoStartTour || loading) {
      return;
    }

    const timer = setTimeout(() => {
      startTourIfNeeded();
    }, 350);

    return () => clearTimeout(timer);
  }, [shouldAutoStartTour, loading, myServices.length]);

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

  const handleTourNext = () => {
    if (tourStepIndex >= tourSteps.length - 1) {
      completeTour();
      return;
    }

    setTourStepIndex((prev) => prev + 1);
  };

  const renderServicesTourModal = () => {
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

  const fetchServices = async () => {
    if (!user) return;

    try {
      // Get profile ID first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      setProviderProfileId(profile.id);

      // Fetch provider's services
      const { data: providerServices, error: psError } = await supabase
        .from('provider_services')
        .select(`
          id,
          service_id,
          base_price,
          duration_minutes,
          description,
          is_active,
          platform_commission_rate,
          custom_service_name,
          accepts_over_25km,
          travel_fee_over_25km,
          services (
            id,
            name,
            description,
            base_duration_minutes,
            service_categories (name)
          )
        `)
        .eq('provider_id', profile.id);

      if (psError) throw psError;

      const formattedServices = providerServices?.map((ps: any) => ({
        id: ps.id,
        service_id: ps.service_id,
        duration_minutes: ps.duration_minutes,
        description: ps.description,
        is_active: ps.is_active,
        platform_commission_rate: ps.platform_commission_rate || PLATFORM_COMMISSION_RATE,
        custom_service_name: ps.custom_service_name,
        base_price: ps.base_price || 0,
        accepts_over_25km: ps.accepts_over_25km,
        travel_fee_over_25km: ps.travel_fee_over_25km ?? undefined,
        service: {
          id: ps.services.id,
          name: ps.services.name,
          description: ps.services.description,
          base_duration_minutes: ps.services.base_duration_minutes,
          category_name: ps.services.service_categories?.name,
        }
      })) || [];

      setMyServices(formattedServices);
      await fetchServiceMedia(profile.id);

    } catch (error) {
      console.error('Error fetching services:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceMedia = async (profileId: string) => {
    try {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('id, provider_service_id, image_url, thumbnail_url, media_type, created_at')
        .eq('provider_id', profileId)
        .not('provider_service_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const grouped = (data || []).reduce((acc, item: any) => {
        const key = item.provider_service_id;
        if (!key) return acc;
        if (!acc[key]) acc[key] = [];
        acc[key].push({
          id: item.id,
          provider_service_id: item.provider_service_id,
          image_url: item.image_url,
          thumbnail_url: item.thumbnail_url,
          media_type: item.media_type || 'image',
          created_at: item.created_at,
        });
        return acc;
      }, {} as Record<string, ServiceMediaItem[]>);

      setServiceMediaMap(grouped);
    } catch (error) {
      console.error('Error fetching service media:', error);
    }
  };

  const handleAddMediaToService = (providerService: ProviderService) => {
    (navigation as any).navigate('CreatePost', {
      preselectedProviderServiceId: providerService.id,
      preselectedServiceName: providerService.custom_service_name || providerService.service.name,
      sourceScreen: 'Services',
    });
  };

  const handleEditService = (providerService: ProviderService) => {
    setEditingService(providerService);
    setModalVisible(true);
  };

  const handleSaveService = async (data: {
    duration: number;
    customDescription: string;
    customServiceName: string;
    isActive: boolean;
    basePrice: number;
    acceptsOver25km: boolean;
    travelFeeOver25km?: number;
  }) => {
    if (!user || !editingService) return;

    try {
      const { error } = await supabase
        .from('provider_services')
        .update({
          duration_minutes: data.duration,
          description: data.customDescription || null,
          custom_service_name: data.customServiceName || null,
          is_active: data.isActive,
          base_price: data.basePrice,
          accepts_over_25km: data.acceptsOver25km,
          travel_fee_over_25km: data.travelFeeOver25km ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingService.id);

      if (error) throw error;

      Alert.alert('Success', 'Service updated successfully');
      setModalVisible(false);
      setEditingService(null);

      // Refresh the services list
      fetchServices();
    } catch (error) {
      console.error('Error updating service:', error);
      Alert.alert('Error', 'Failed to update service. Please try again.');
    }
  };

  const handleToggleAvailability = async (serviceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('provider_services')
        .update({
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId);

      if (error) throw error;

      fetchServices();
    } catch (error) {
      console.error('Error updating service:', error);
      Alert.alert('Error', 'Failed to update service');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    Alert.alert(
      'Delete Service',
      'Are you sure you want to remove this service?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('provider_services')
                .delete()
                .eq('id', serviceId);

              if (error) throw error;

              // Track service deleted
              trackServiceDeleted(serviceId);

              fetchServices();
            } catch (error) {
              console.error('Error deleting service:', error);
              Alert.alert('Error', 'Failed to delete service');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <FadeInView delay={0}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>My Services</Text>
              <Text style={styles.subtitle}>{myServices.length} services offered</Text>
            </View>
            <View ref={addButtonRef} collapsable={false}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => (navigation as any).navigate('ServiceSelection')}
              >
                <Ionicons name="add-circle" size={24} color={colors.primary} />
                <Text style={styles.addButtonText}>Add Service</Text>
              </TouchableOpacity>
            </View>
          </View>
        </FadeInView>

        {/* My Services List */}
        {myServices.length === 0 ? (
          <View ref={emptyStateRef} collapsable={false} style={styles.emptyState}>
            <Text style={styles.emptyText}>No services added yet</Text>
            <Text style={styles.emptySubtext}>Add services to start receiving bookings</Text>
          </View>
        ) : (
          <StaggeredList animationType="scale" staggerDelay={50}>
            {myServices.map((ps, index) => (
              <View
                key={ps.id}
                ref={index === 0 ? firstServiceCardRef : undefined}
                collapsable={false}
                style={styles.serviceCard}
              >
                <View style={styles.serviceHeader}>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>
                      {ps.custom_service_name || ps.service.name}
                    </Text>
                    {ps.custom_service_name && (
                      <Text style={styles.customServiceBadge}>Custom Service</Text>
                    )}
                    <Text style={styles.serviceDescription}>
                      {ps.description || ps.service.description}
                    </Text>
                    <View style={styles.pricingInfo}>
                      <Text style={styles.serviceDuration}>
                        ⏱️ {ps.duration_minutes} minutes
                      </Text>
                      <View style={styles.priceBreakdown}>
                        <Text style={styles.basePrice}>
                          Base Price: ${(ps.base_price / 100).toFixed(2)}
                        </Text>
                        <Text style={styles.travelNote}>
                          + Standard travel fees apply
                        </Text>
                        {ps.accepts_over_25km && (
                          <Text style={styles.finalPrice}>
                            ✓ Accepts 25+ km — {ps.travel_fee_over_25km != null
                              ? `$${(ps.travel_fee_over_25km / 100).toFixed(2)} fee`
                              : 'platform default fee'}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={styles.serviceActions}>
                    <Switch
                      value={ps.is_active}
                      onValueChange={() => handleToggleAvailability(ps.id, ps.is_active)}
                      trackColor={{ false: colors.border, true: colors.success }}
                      thumbColor={colors.white}
                    />
                  </View>
                </View>
                <View style={styles.serviceButtons}>
                  <View ref={index === 0 ? firstMediaButtonRef : undefined} collapsable={false} style={styles.tourMeasureWrap}>
                    <TouchableOpacity
                      style={styles.mediaButton}
                      onPress={() => handleAddMediaToService(ps)}
                    >
                      <Text style={styles.mediaButtonText}>📸 Add Media</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditService(ps)}
                  >
                    <Text style={styles.editButtonText}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteService(ps.id)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️ Remove</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.serviceMediaSection}>
                  <Text style={styles.serviceMediaTitle}>Service Photos</Text>
                  {(serviceMediaMap[ps.id] || []).length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.serviceMediaList}
                    >
                      {(serviceMediaMap[ps.id] || []).map((item) => (
                        <View key={item.id} style={styles.serviceMediaItemWrap}>
                          <Image
                            source={{ uri: item.thumbnail_url || item.image_url }}
                            style={styles.serviceMediaItem}
                          />
                          {item.media_type === 'video' && (
                            <View style={styles.videoBadge}>
                              <Ionicons name="play" size={12} color={colors.white} />
                            </View>
                          )}
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={styles.noServiceMediaText}>No media added for this service yet.</Text>
                  )}
                </View>
              </View>
            ))}
          </StaggeredList>
        )}
      </ScrollView>

      {/* Edit Service Modal */}
      {editingService && (
        <AddServiceModal
          visible={modalVisible}
          service={editingService.service}
          editMode={true}
          initialData={{
            duration: editingService.duration_minutes.toString(),
            customDescription: editingService.description || '',
            customServiceName: editingService.custom_service_name || '',
            isActive: editingService.is_active,
            basePrice: ((editingService.base_price || 0) / 100).toFixed(2),
            acceptsOver25km: editingService.accepts_over_25km || false,
            travelFeeOver25km: editingService.travel_fee_over_25km != null
              ? (editingService.travel_fee_over_25km / 100).toFixed(2)
              : undefined,
          }}
          onClose={() => {
            setModalVisible(false);
            setEditingService(null);
          }}
          onSave={handleSaveService}
        />
      )}

      {renderServicesTourModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  scrollContent: {
    paddingTop: TOTAL_HEADER_HEIGHT, // Content starts below header
    paddingBottom: 120, // Space for floating tab bar + extra padding
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  header: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  servicesList: {
    padding: spacing.md,
  },
  serviceCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  serviceInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  serviceName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  customServiceBadge: {
    fontSize: fontSize.xs,
    color: colors.primary,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  serviceDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  serviceDuration: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  serviceActions: {
    alignItems: 'flex-end',
  },
  servicePrice: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  serviceButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tourMeasureWrap: {
    flex: 1,
  },
  mediaButton: {
    backgroundColor: colors.backgroundGray,
    padding: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mediaButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  editButton: {
    flex: 1,
    backgroundColor: colors.primary + '15',
    padding: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: colors.error + '15',
    padding: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  pricingInfo: {
    marginTop: spacing.xs,
  },
  priceBreakdown: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  basePrice: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  travelNote: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.xs / 2,
  },
  finalPrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  pricingBreakdownBox: {
    backgroundColor: colors.backgroundGray,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  pricingTotal: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pricingLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  pricingValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  pricingLabelBold: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  pricingValueBold: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '700',
  },
  serviceMediaSection: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  serviceMediaTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  serviceMediaList: {
    paddingRight: spacing.sm,
  },
  serviceMediaItemWrap: {
    marginRight: spacing.sm,
    position: 'relative',
  },
  serviceMediaItem: {
    width: 84,
    height: 84,
    borderRadius: 10,
    backgroundColor: colors.backgroundGray,
  },
  noServiceMediaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tourBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
  },
  tourOverlayBlock: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  tourSpotlight: {
    position: 'absolute',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'transparent',
  },
  tourSpotlightCorner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: colors.white,
  },
  tourSpotlightCornerTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 14,
  },
  tourSpotlightCornerTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 14,
  },
  tourSpotlightCornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 14,
  },
  tourSpotlightCornerBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 14,
  },
  tourTooltipCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  tourProgressLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  tourTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tourDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  tourActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tourSecondaryButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tourSecondaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  tourPrimaryButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tourPrimaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.black,
  },
});

