import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AddServiceModal from '../../components/AddServiceModal';

interface Service {
  id: string;
  name: string;
  description: string;
  base_duration_minutes: number;
  category_name?: string;
}

const CUSTOM_SERVICE_ID = '550e8400-e29b-41d4-a716-446655440999';

export default function ServiceSelectionScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [myServiceIds, setMyServiceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  useEffect(() => {
    fetchServices();
  }, [user]);

  const fetchServices = async () => {
    if (!user) return;

    try {
      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Get provider's existing services
      const { data: providerServices } = await supabase
        .from('provider_services')
        .select('service_id')
        .eq('provider_id', profile.id);

      const existingServiceIds = providerServices?.map(ps => ps.service_id) || [];
      setMyServiceIds(existingServiceIds);

      // Get all available services
      const { data: allServices, error } = await supabase
        .from('services')
        .select(`
          id,
          name,
          description,
          base_duration_minutes,
          service_categories (name)
        `)
        .order('name');

      if (error) throw error;

      const formattedServices = allServices?.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        base_duration_minutes: s.base_duration_minutes,
        category_name: s.service_categories?.name,
      })) || [];

      setServices(formattedServices);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setModalVisible(true);
  };

  const handleSaveService = async (data: {
    price: number;
    duration: number;
    customDescription: string;
    customServiceName: string;
    isActive: boolean;
    maxTravelDistance: number;
    travelFee0to10: number;
    travelFee11to15: number;
    travelFee16to25: number;
  }) => {
    if (!user || !selectedService) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('provider_services')
        .insert({
          provider_id: profile.id,
          service_id: selectedService.id,
          base_price: data.price,
          duration_minutes: data.duration,
          description: data.customDescription || null,
          custom_service_name: data.customServiceName || null,
          is_active: data.isActive,
          platform_commission_rate: 0.20,
          max_travel_distance_km: data.maxTravelDistance,
          travel_fee_0_10km: data.travelFee0to10,
          travel_fee_11_15km: data.travelFee11to15,
          travel_fee_16_25km: data.travelFee16to25,
        });

      if (error) throw error;

      Alert.alert('Success', 'Service added successfully');
      setModalVisible(false);
      setSelectedService(null);

      // Refresh the services list
      fetchServices();
    } catch (error) {
      console.error('Error adding service:', error);
      Alert.alert('Error', 'Failed to add service. Please try again.');
    }
  };

  const filteredServices = services.filter(service => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      service.name.toLowerCase().includes(query) ||
      service.description.toLowerCase().includes(query) ||
      service.category_name?.toLowerCase().includes(query)
    );
  });

  // Separate available services from already added ones
  const availableServices = filteredServices.filter(s => !myServiceIds.includes(s.id));
  const customService = availableServices.find(s => s.id === CUSTOM_SERVICE_ID);
  const regularServices = availableServices.filter(s => s.id !== CUSTOM_SERVICE_ID);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search services..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Custom Service Card (Always at top) */}
        {customService && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ Create Your Own</Text>
            <TouchableOpacity
              style={[styles.serviceCard, styles.customServiceCard]}
              onPress={() => handleServiceSelect(customService)}
            >
              <View style={styles.customServiceIcon}>
                <Ionicons name="add-circle" size={32} color={colors.primary} />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{customService.name}</Text>
                <Text style={styles.serviceDescription}>{customService.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Regular Services */}
        {regularServices.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              📋 Available Services ({regularServices.length})
            </Text>
            {regularServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() => handleServiceSelect(service)}
              >
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDescription}>{service.description}</Text>
                  <View style={styles.serviceMetaRow}>
                    {service.category_name && (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{service.category_name}</Text>
                      </View>
                    )}
                    <Text style={styles.durationText}>
                      ⏱️ {service.base_duration_minutes} min
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
            <Text style={styles.emptyText}>All services added!</Text>
            <Text style={styles.emptySubtext}>
              You've added all available services. You can still create custom services.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Service Modal */}
      <AddServiceModal
        visible={modalVisible}
        service={selectedService}
        onClose={() => {
          setModalVisible(false);
          setSelectedService(null);
        }}
        onSave={handleSaveService}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  customServiceCard: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  customServiceIcon: {
    marginRight: spacing.md,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  serviceDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  durationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});

