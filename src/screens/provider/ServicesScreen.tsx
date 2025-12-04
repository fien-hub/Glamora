import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
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
  service: Service;
}

const PLATFORM_COMMISSION_RATE = 0.20; // 20% commission

export default function ServicesScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [myServices, setMyServices] = useState<ProviderService[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<ProviderService | null>(null);

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
        service: {
          id: ps.services.id,
          name: ps.services.name,
          description: ps.services.description,
          base_duration_minutes: ps.services.base_duration_minutes,
          category_name: ps.services.service_categories?.name,
        }
      })) || [];

      setMyServices(formattedServices);

    } catch (error) {
      console.error('Error fetching services:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
    }
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
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => (navigation as any).navigate('ServiceSelection')}
            >
              <Ionicons name="add-circle" size={24} color={colors.primary} />
              <Text style={styles.addButtonText}>Add Service</Text>
            </TouchableOpacity>
          </View>
        </FadeInView>

        {/* My Services List */}
        {myServices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No services added yet</Text>
            <Text style={styles.emptySubtext}>Add services to start receiving bookings</Text>
          </View>
        ) : (
          <StaggeredList animationType="scale" staggerDelay={50}>
            {myServices.map((ps) => (
              <View key={ps.id} style={styles.serviceCard}>
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
                            ✓ Accepts 25+ km requests
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
          }}
          onClose={() => {
            setModalVisible(false);
            setEditingService(null);
          }}
          onSave={handleSaveService}
        />
      )}
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
});

