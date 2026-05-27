import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { trackServiceAdded, trackServiceEdited } from '../../utils/analytics';
import { notifyAdmin } from '../../utils/notifications';

interface Service {
  id: string;
  name: string;
  description: string;
  base_duration_minutes: number;
}

interface ProviderService {
  id: string;
  service_id: string;
  base_price: number;
  duration_minutes: number;
  description: string | null;
  is_active: boolean;
  platform_commission_rate: number;
  custom_service_name?: string | null;
  max_travel_distance_km?: number;
  travel_fee_0_10km?: number;
  travel_fee_11_15km?: number;
  travel_fee_16_25km?: number;
  accepts_over_25km?: boolean;
  travel_fee_over_25km?: number;
  service: Service;
}

const PLATFORM_COMMISSION_RATE = 0.20; // 20% commission
const CUSTOM_SERVICE_ID = '550e8400-e29b-41d4-a716-446655440999';

const calculateFinalPrice = (basePrice: number, commissionRate: number = PLATFORM_COMMISSION_RATE): number => {
  return Math.round(basePrice * (1 + commissionRate) * 100) / 100;
};

const calculateCommission = (basePrice: number, commissionRate: number = PLATFORM_COMMISSION_RATE): number => {
  return Math.round(basePrice * commissionRate * 100) / 100;
};

export default function AddEditServiceScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { user } = useAuth();

  const editMode = route.params?.editMode || false;
  const editingService = route.params?.editingService || null;
  const selectedService = route.params?.selectedService || null;

  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customServiceName, setCustomServiceName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Travel settings
  const [maxTravelDistance, setMaxTravelDistance] = useState('25');
  const [travelFee0to10, setTravelFee0to10] = useState('');
  const [travelFee11to15, setTravelFee11to15] = useState('');
  const [travelFee16to25, setTravelFee16to25] = useState('');
  const [acceptsOver25km, setAcceptsOver25km] = useState(false);
  const [travelFeeOver25km, setTravelFeeOver25km] = useState('');

  useEffect(() => {
    if (editMode && editingService) {
      setPrice((editingService.base_price / 100).toFixed(2));
      setDuration(editingService.duration_minutes.toString());
      setCustomDescription(editingService.description || '');
      setCustomServiceName(editingService.custom_service_name || '');
      setIsActive(editingService.is_active);
      setMaxTravelDistance(editingService.max_travel_distance_km?.toString() || '25');
      // Only show saved values when editing, empty for new services
      const fee0to10 = editingService.travel_fee_0_10km;
      const fee11to15 = editingService.travel_fee_11_15km;
      const fee16to25 = editingService.travel_fee_16_25km;
      setTravelFee0to10(fee0to10 !== null && fee0to10 !== undefined ? (fee0to10 / 100).toFixed(2) : '');
      setTravelFee11to15(fee11to15 !== null && fee11to15 !== undefined ? (fee11to15 / 100).toFixed(2) : '');
      setTravelFee16to25(fee16to25 !== null && fee16to25 !== undefined ? (fee16to25 / 100).toFixed(2) : '');
      setAcceptsOver25km(editingService.accepts_over_25km ?? false);
      const feeOver25 = editingService.travel_fee_over_25km;
      setTravelFeeOver25km(feeOver25 != null ? (feeOver25 / 100).toFixed(2) : '');
    } else if (selectedService) {
      setDuration(selectedService.base_duration_minutes.toString());
    }
  }, [editMode, editingService, selectedService]);

  const handleSave = async () => {
    if (!user || !selectedService || !price || !duration) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const isCustomService = selectedService.id === CUSTOM_SERVICE_ID;
    if (isCustomService && !customServiceName.trim()) {
      Alert.alert('Error', 'Please enter a custom service name');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      Alert.alert('Error', 'Please enter a valid duration');
      return;
    }

    // Validate travel settings
    const maxTravelDistanceNum = parseInt(maxTravelDistance);
    if (isNaN(maxTravelDistanceNum) || maxTravelDistanceNum <= 0 || maxTravelDistanceNum > 25) {
      Alert.alert('Error', 'Please enter a valid travel distance (1-25 km)');
      return;
    }

    const fee0to10 = parseFloat(travelFee0to10) || 0;
    const fee11to15 = parseFloat(travelFee11to15) || 0;
    const fee16to25 = parseFloat(travelFee16to25) || 0;
    const feeOver25 = parseFloat(travelFeeOver25km) || 0;

    setSaving(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      if (editMode && editingService) {
        const { error } = await supabase
          .from('provider_services')
          .update({
            base_price: Math.round(priceNum * 100),
            duration_minutes: durationNum,
            description: customDescription.trim() || null,
            custom_service_name: isCustomService ? customServiceName.trim() : null,
            is_active: isActive,
            max_travel_distance_km: maxTravelDistanceNum,
            travel_fee_0_10km: Math.round(fee0to10 * 100),
            travel_fee_11_15km: Math.round(fee11to15 * 100),
            travel_fee_16_25km: Math.round(fee16to25 * 100),
            accepts_over_25km: acceptsOver25km,
            travel_fee_over_25km: acceptsOver25km ? Math.round(feeOver25 * 100) : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingService.id);

        if (error) throw error;
        trackServiceEdited(editingService.id);
        Alert.alert('Success', 'Service updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        const { error } = await supabase
          .from('provider_services')
          .insert({
            provider_id: profile.id,
            service_id: selectedService.id,
            base_price: Math.round(priceNum * 100),
            duration_minutes: durationNum,
            description: customDescription.trim() || null,
            custom_service_name: isCustomService ? customServiceName.trim() : null,
            is_active: isActive,
            platform_commission_rate: PLATFORM_COMMISSION_RATE,
            max_travel_distance_km: maxTravelDistanceNum,
            travel_fee_0_10km: Math.round(fee0to10 * 100),
            travel_fee_11_15km: Math.round(fee11to15 * 100),
            travel_fee_16_25km: Math.round(fee16to25 * 100),
            accepts_over_25km: acceptsOver25km,
            travel_fee_over_25km: acceptsOver25km ? Math.round(feeOver25 * 100) : null,
          });

        if (error) throw error;

        const serviceName = isCustomService ? customServiceName : selectedService.name;
        trackServiceAdded(serviceName, Math.round(priceNum * 100));
        // Notify admin that a provider added a new service
        void notifyAdmin(
          '🔧 Provider Added a Service',
          `A provider added: ${serviceName} ($${priceNum.toFixed(2)})`,
          'service_added',
          { serviceName, basePrice: Math.round(priceNum * 100), providerId: profile.id }
        );
        Alert.alert('Success', 'Service added successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      console.error('Error saving service:', error);
      Alert.alert('Error', error.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedService) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No service selected</Text>
      </View>
    );
  }

  const isCustomService = selectedService.id === CUSTOM_SERVICE_ID;
  const priceNum = parseFloat(price) || 0;
  const fee0to10 = parseFloat(travelFee0to10) || 0;
  const fee11to15 = parseFloat(travelFee11to15) || 0;
  const fee16to25 = parseFloat(travelFee16to25) || 0;
  const feeOver25km = parseFloat(travelFeeOver25km) || 0;
  const baseServicePrice = calculateFinalPrice(priceNum);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Service Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Information</Text>
          <View style={styles.serviceInfoCard}>
            <Text style={styles.serviceName}>{selectedService.name}</Text>
            <Text style={styles.serviceDescription}>{selectedService.description}</Text>
          </View>
        </View>

        {/* Custom Service Name (only for custom services) */}
        {isCustomService && (
          <View style={styles.section}>
            <Text style={styles.label}>Service Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Lash Extensions, Microblading, etc."
              value={customServiceName}
              onChangeText={setCustomServiceName}
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.hint}>Enter the name of your custom service</Text>
          </View>
        )}

        {/* TRAVEL SETTINGS - FIRST */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚗 Travel Settings</Text>
          <Text style={styles.sectionDescription}>
            Set how far you're willing to travel for this service and your travel fees
          </Text>

          {/* Maximum Travel Distance */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Maximum Travel Distance (km) *</Text>
            <TextInput
              style={styles.input}
              placeholder="25"
              keyboardType="number-pad"
              value={maxTravelDistance}
              onChangeText={setMaxTravelDistance}
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.hint}>How far will you travel? (1-25 km)</Text>
          </View>

          {/* Travel Fee Zones */}
          <View style={styles.travelZonesCard}>
            <Text style={styles.travelZonesTitle}>💰 Set Travel Fee Structure</Text>

            {/* 0-10 km */}
            <View style={styles.zoneInputGroup}>
              <Text style={styles.zoneLabel}>0-10 km</Text>
              <View style={styles.zoneInputWrapper}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.zoneInput}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={travelFee0to10}
                  onChangeText={setTravelFee0to10}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* 11-15 km */}
            <View style={styles.zoneInputGroup}>
              <Text style={styles.zoneLabel}>11-15 km</Text>
              <View style={styles.zoneInputWrapper}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.zoneInput}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={travelFee11to15}
                  onChangeText={setTravelFee11to15}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* 16-25 km */}
            <View style={styles.zoneInputGroup}>
              <Text style={styles.zoneLabel}>16-25 km</Text>
              <View style={styles.zoneInputWrapper}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.zoneInput}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={travelFee16to25}
                  onChangeText={setTravelFee16to25}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* 25+ km (opt-in toggle) */}
            <View style={styles.zoneToggleRow}>
              <View style={styles.zoneToggleInfo}>
                <Text style={styles.zoneLabel}>25+ km requests</Text>
                <Text style={styles.hint}>Accept bookings beyond 25 km (15+ mi)</Text>
              </View>
              <Switch
                value={acceptsOver25km}
                onValueChange={setAcceptsOver25km}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            {acceptsOver25km && (
              <View style={styles.zoneInputGroup}>
                <Text style={styles.zoneLabel}>25+ km travel fee</Text>
                <View style={styles.zoneInputWrapper}>
                  <Text style={styles.dollarSign}>$</Text>
                  <TextInput
                    style={styles.zoneInput}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={travelFeeOver25km}
                    onChangeText={setTravelFeeOver25km}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <Text style={styles.hint}>Your fee for customers beyond 25 km</Text>
              </View>
            )}
          </View>
        </View>

        {/* Price */}
        <View style={styles.section}>
          <Text style={styles.label}>Your Base Rate ($) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your rate"
            keyboardType="decimal-pad"
            value={price}
            onChangeText={setPrice}
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={styles.hint}>This is what you'll earn per service</Text>

          {/* Combined Pricing Display */}
          {priceNum > 0 && (
            <View style={styles.combinedPricingCard}>
              <Text style={styles.combinedPricingTitle}>📊 Customer Pricing by Distance</Text>

              <View style={styles.pricingBreakdown}>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Your base rate:</Text>
                  <Text style={styles.pricingValue}>${priceNum.toFixed(2)}</Text>
                </View>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Platform commission (20%):</Text>
                  <Text style={styles.pricingValue}>
                    ${calculateCommission(priceNum).toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.pricingRow, styles.pricingTotal]}>
                  <Text style={styles.pricingLabelBold}>Base service price:</Text>
                  <Text style={styles.pricingValueBold}>
                    ${baseServicePrice.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Distance-based totals */}
              <View style={styles.distancePricingSection}>
                <Text style={styles.distancePricingTitle}>Total Customer Pays:</Text>

                <View style={styles.distancePricingRow}>
                  <Text style={styles.distanceLabel}>0-10 km:</Text>
                  <Text style={styles.distancePrice}>
                    ${(baseServicePrice + fee0to10).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.distancePricingRow}>
                  <Text style={styles.distanceLabel}>11-15 km:</Text>
                  <Text style={styles.distancePrice}>
                    ${(baseServicePrice + fee11to15).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.distancePricingRow}>
                  <Text style={styles.distanceLabel}>16-25 km:</Text>
                  <Text style={styles.distancePrice}>
                    ${(baseServicePrice + fee16to25).toFixed(2)}
                  </Text>
                </View>

                {acceptsOver25km && (
                  <View style={styles.distancePricingRow}>
                    <Text style={styles.distanceLabel}>25+ km:</Text>
                    <Text style={styles.distancePrice}>
                      ${(baseServicePrice + feeOver25km).toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.travelFeeNote}>
                💡 Travel fees go 100% to you (no commission)
              </Text>
            </View>
          )}
        </View>

        {/* Duration */}
        <View style={styles.section}>
          <Text style={styles.label}>Duration (minutes) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter duration"
            keyboardType="number-pad"
            value={duration}
            onChangeText={setDuration}
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={styles.hint}>
            How long does this service take?
          </Text>
        </View>

        {/* Custom Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Custom Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add your own description or leave blank to use default"
            multiline
            numberOfLines={4}
            value={customDescription}
            onChangeText={setCustomDescription}
            placeholderTextColor={colors.textSecondary}
            textAlignVertical="top"
          />
        </View>

        {/* Active Toggle */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.label}>Active</Text>
              <Text style={styles.hint}>Make this service available for booking</Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={colors.white}
            />
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>
              {editMode ? 'Update Service' : 'Add Service'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  errorText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
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
  serviceInfoCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  serviceName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  serviceDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  pricingBreakdown: {
    backgroundColor: colors.primarySubtle,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  pricingTotal: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
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
    fontWeight: fontWeight.medium,
  },
  pricingLabelBold: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.bold,
  },
  pricingValueBold: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  // Travel Settings Styles
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  travelZonesCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  travelZonesTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  zoneInputGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  zoneLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  zoneToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  zoneToggleInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  zoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    width: 100,
  },
  dollarSign: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  zoneInput: {
    flex: 1,
    padding: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  // Combined Pricing Styles
  combinedPricingCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  combinedPricingTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  distancePricingSection: {
    backgroundColor: '#FFF9E6',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#FFE4A3',
  },
  distancePricingTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  distancePricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  distanceLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  distancePrice: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  travelFeeNote: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.md,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
});
