import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

interface Service {
  id: string;
  name: string;
  description: string;
  base_duration_minutes: number;
}

interface AddServiceModalProps {
  visible: boolean;
  service: Service | null;
  editMode?: boolean;
  initialData?: {
    duration: string;
    customDescription?: string;
    customServiceName?: string;
    isActive?: boolean;
    basePrice?: string;
    acceptsOver25km?: boolean;
    travelFeeOver25km?: string;
  };
  onClose: () => void;
  onSave: (data: {
    duration: number;
    customDescription: string;
    customServiceName: string;
    isActive: boolean;
    basePrice: number;
    acceptsOver25km: boolean;
    travelFeeOver25km?: number;
  }) => void;
}

const CUSTOM_SERVICE_ID = '550e8400-e29b-41d4-a716-446655440999';
const PLATFORM_COMMISSION_RATE = 0.20;

// Import shared travel fee table
import { STANDARD_TRAVEL_FEES } from '../config/travelFees';

// Calculate provider earnings (base price + travel fee)
const calculateProviderEarnings = (basePrice: number, travelFee: number = 0): number => {
  return Math.round((basePrice + travelFee) * 100) / 100;
};

// Calculate customer price (base + 20% platform fee + travel fee)
const calculateCustomerPrice = (basePrice: number, travelFee: number = 0): number => {
  const platformFee = basePrice * PLATFORM_COMMISSION_RATE;
  return Math.round((basePrice + platformFee + travelFee) * 100) / 100;
};

export default function AddServiceModal({
  visible,
  service,
  editMode = false,
  initialData,
  onClose,
  onSave,
}: AddServiceModalProps) {
  const [duration, setDuration] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customServiceName, setCustomServiceName] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Simple base price (provider's earnings before commission)
  const [basePrice, setBasePrice] = useState('');
  const [acceptsOver25km, setAcceptsOver25km] = useState(false);
  const [travelFeeOver25km, setTravelFeeOver25km] = useState('');

  useEffect(() => {
    if (visible && service) {
      if (initialData) {
        setDuration(initialData.duration);
        setCustomDescription(initialData.customDescription || '');
        setCustomServiceName(initialData.customServiceName || '');
        setIsActive(initialData.isActive ?? true);
        setBasePrice(initialData.basePrice || '');
        setAcceptsOver25km(initialData.acceptsOver25km ?? false);
        setTravelFeeOver25km(initialData.travelFeeOver25km || '');
      } else {
        // New service - default values
        setDuration('');
        setCustomDescription('');
        setCustomServiceName('');
        setIsActive(true);
        setBasePrice('');
        setAcceptsOver25km(false);
        setTravelFeeOver25km('');
      }
    }
  }, [visible, service, initialData]);

  const handleSave = () => {
    if (!service) return;

    const isCustomService = service.id === CUSTOM_SERVICE_ID;

    if (isCustomService && !customServiceName.trim()) {
      Alert.alert('Required', 'Please enter a custom service name');
      return;
    }

    if (!duration) {
      Alert.alert('Required', 'Please enter service duration');
      return;
    }

    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      Alert.alert('Invalid Duration', 'Please enter a valid duration');
      return;
    }

    // Validate base price
    const basePriceNum = parseFloat(basePrice);
    if (isNaN(basePriceNum) || basePriceNum <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid base price');
      return;
    }

    const feeOver25 = parseFloat(travelFeeOver25km) || 0;
    onSave({
      duration: durationNum,
      customDescription: customDescription.trim(),
      customServiceName: customServiceName.trim(),
      isActive,
      basePrice: Math.round(basePriceNum * 100), // Convert to cents
      acceptsOver25km,
      travelFeeOver25km: acceptsOver25km ? Math.round(feeOver25 * 100) : undefined,
    });

    // Reset form
    resetForm();
  };

  const resetForm = () => {
    setDuration('');
    setCustomDescription('');
    setCustomServiceName('');
    setIsActive(true);
    setBasePrice('');
    setAcceptsOver25km(false);
    setTravelFeeOver25km('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!service) return null;

  const isCustomService = service.id === CUSTOM_SERVICE_ID;
  const basePriceNum = parseFloat(basePrice);
  const showPricing = !isNaN(basePriceNum) && basePriceNum > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editMode ? 'Edit Service' : 'Add Service'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Service Info */}
            <View style={styles.serviceInfoCard}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDescription}>{service.description}</Text>
            </View>

            {/* Custom Service Name (only for custom services) */}
            {isCustomService && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Service Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Lash Extensions, Microblading"
                  value={customServiceName}
                  onChangeText={setCustomServiceName}
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.inputHint}>Enter the name of your custom service</Text>
              </View>
            )}

            {/* BASE PRICE SECTION */}
            <View style={styles.travelSection}>
              <Text style={styles.sectionTitle}>💰 Set Your Base Price</Text>
              <Text style={styles.sectionDescription}>
                Enter what you want to earn for this service. Travel fees are added automatically based on customer distance.
              </Text>

              {/* Base Price Input */}
              <View style={styles.basePriceCard}>
                <Text style={styles.basePriceLabel}>Your Base Price *</Text>
                <View style={styles.basePriceInputWrapper}>
                  <Text style={styles.dollarSign}>$</Text>
                  <TextInput
                    style={styles.basePriceInput}
                    placeholder="Enter price"
                    keyboardType="decimal-pad"
                    value={basePrice}
                    onChangeText={setBasePrice}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <Text style={styles.basePriceHint}>
                  This is what you'll earn per service (before 20% platform fee)
                </Text>
              </View>

              {/* Important Notice */}
              <View style={styles.noticeCard}>
                <Text style={styles.noticeIcon}>⚠️</Text>
                <View style={styles.noticeContent}>
                  <Text style={styles.noticeTitle}>Don't Include Travel Costs!</Text>
                  <Text style={styles.noticeText}>
                    Set your base price for the service ONLY. Travel fees are automatically added based on customer distance and go directly to you. This keeps prices fair and transparent for customers.
                  </Text>
                </View>
              </View>

              {/* Platform Travel Fee Policy */}
              <View style={styles.travelPolicyCard}>
                <Text style={styles.travelPolicyTitle}>🚗 Standard Travel Fees</Text>
                <Text style={styles.travelPolicySubtitle}>
                  These fees are added to your base price for customers:
                </Text>

                <View style={styles.travelFeeRow}>
                  <Text style={styles.travelFeeDistance}>0-3 mi</Text>
                  <Text style={styles.travelFeeAmount}>+${STANDARD_TRAVEL_FEES['0-3 mi']}</Text>
                </View>
                <View style={styles.travelFeeRow}>
                  <Text style={styles.travelFeeDistance}>3-5 mi</Text>
                  <Text style={styles.travelFeeAmount}>+${STANDARD_TRAVEL_FEES['3-5 mi']}</Text>
                </View>
                <View style={styles.travelFeeRow}>
                  <Text style={styles.travelFeeDistance}>5-8 mi</Text>
                  <Text style={styles.travelFeeAmount}>+${STANDARD_TRAVEL_FEES['5-8 mi']}</Text>
                </View>
                <View style={styles.travelFeeRow}>
                  <Text style={styles.travelFeeDistance}>8-12 mi</Text>
                  <Text style={styles.travelFeeAmount}>+${STANDARD_TRAVEL_FEES['8-12 mi']}</Text>
                </View>
                <View style={styles.travelFeeRow}>
                  <Text style={styles.travelFeeDistance}>12-15 mi</Text>
                  <Text style={styles.travelFeeAmount}>+${STANDARD_TRAVEL_FEES['12-15 mi']}</Text>
                </View>
                <View style={styles.travelFeeRow}>
                  <Text style={styles.travelFeeDistance}>15+ mi</Text>
                  <Text style={styles.travelFeeAmount}>+${STANDARD_TRAVEL_FEES['15+ mi']}</Text>
                </View>
              </View>

              {/* 15+ miles Special Request Toggle */}
              <View style={styles.specialRequestCard}>
                <View style={styles.specialRequestInfo}>
                  <Text style={styles.specialRequestLabel}>Accept 15+ Mile Requests?</Text>
                  <Text style={styles.specialRequestHint}>
                    Allow customers beyond 15 miles to book your service
                  </Text>
                </View>
                <Switch
                  value={acceptsOver25km}
                  onValueChange={setAcceptsOver25km}
                  trackColor={{ false: colors.border, true: colors.success }}
                  thumbColor={colors.white}
                />
              </View>

              {/* Custom 15+ mi fee (shown when opted in) */}
              {acceptsOver25km && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>15+ Mile Travel Fee</Text>
                  <View style={styles.basePriceInputWrapper}>
                    <Text style={styles.dollarSign}>$</Text>
                    <TextInput
                      style={styles.basePriceInput}
                      placeholder={`${STANDARD_TRAVEL_FEES['15+ mi'].toFixed(2)} (platform default)`}
                      keyboardType="decimal-pad"
                      value={travelFeeOver25km}
                      onChangeText={setTravelFeeOver25km}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <Text style={styles.inputHint}>
                    Leave blank to use the platform default (${STANDARD_TRAVEL_FEES['15+ mi']})
                  </Text>
                </View>
              )}

              {/* Price Breakdown Preview */}
              {showPricing && (
                <View style={styles.earningsCard}>
                  <Text style={styles.earningsTitle}>📊 Customer Prices by Distance</Text>

                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsLabel}>0-3 mi:</Text>
                    <Text style={styles.earningsValue}>
                      ${calculateCustomerPrice(basePriceNum, STANDARD_TRAVEL_FEES['0-3 mi']).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsLabel}>3-5 mi:</Text>
                    <Text style={styles.earningsValue}>
                      ${calculateCustomerPrice(basePriceNum, STANDARD_TRAVEL_FEES['3-5 mi']).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsLabel}>5-8 mi:</Text>
                    <Text style={styles.earningsValue}>
                      ${calculateCustomerPrice(basePriceNum, STANDARD_TRAVEL_FEES['5-8 mi']).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsLabel}>8-12 mi:</Text>
                    <Text style={styles.earningsValue}>
                      ${calculateCustomerPrice(basePriceNum, STANDARD_TRAVEL_FEES['8-12 mi']).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsLabel}>12-15 mi:</Text>
                    <Text style={styles.earningsValue}>
                      ${calculateCustomerPrice(basePriceNum, STANDARD_TRAVEL_FEES['12-15 mi']).toFixed(2)}
                    </Text>
                  </View>
                  {acceptsOver25km && (
                    <View style={styles.earningsRow}>
                      <Text style={styles.earningsLabel}>15+ mi:</Text>
                      <Text style={styles.earningsValue}>
                        ${calculateCustomerPrice(basePriceNum, parseFloat(travelFeeOver25km) || STANDARD_TRAVEL_FEES['15+ mi']).toFixed(2)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.earningsDivider} />

                  <Text style={styles.earningsNoteTitle}>💵 Your Earnings (Base + Travel Fee):</Text>
                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsLabelSmall}>0-3 mi:</Text>
                    <Text style={styles.earningsValueGreen}>
                      ${calculateProviderEarnings(basePriceNum, STANDARD_TRAVEL_FEES['0-3 mi']).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsLabelSmall}>3-5 mi:</Text>
                    <Text style={styles.earningsValueGreen}>
                      ${calculateProviderEarnings(basePriceNum, STANDARD_TRAVEL_FEES['3-5 mi']).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsLabelSmall}>5-8 mi:</Text>
                    <Text style={styles.earningsValueGreen}>
                      ${calculateProviderEarnings(basePriceNum, STANDARD_TRAVEL_FEES['5-8 mi']).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsLabelSmall}>8-12 mi:</Text>
                    <Text style={styles.earningsValueGreen}>
                      ${calculateProviderEarnings(basePriceNum, STANDARD_TRAVEL_FEES['8-12 mi']).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsLabelSmall}>12-15 mi:</Text>
                    <Text style={styles.earningsValueGreen}>
                      ${calculateProviderEarnings(basePriceNum, STANDARD_TRAVEL_FEES['12-15 mi']).toFixed(2)}
                    </Text>
                  </View>
                  {acceptsOver25km && (
                    <View style={styles.earningsRow}>
                      <Text style={styles.earningsLabelSmall}>15+ mi:</Text>
                      <Text style={styles.earningsValueGreen}>
                        ${calculateProviderEarnings(basePriceNum, parseFloat(travelFeeOver25km) || STANDARD_TRAVEL_FEES['15+ mi']).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.earningsNote}>
                    Platform takes 20% of base price only. Travel fees are yours!
                  </Text>
                </View>
              )}
            </View>

            {/* Duration Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration (minutes) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter duration"
                keyboardType="number-pad"
                value={duration}
                onChangeText={setDuration}
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={styles.inputHint}>
                How long does this service take?
              </Text>
            </View>

            {/* Custom Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Custom Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add your own description or leave blank"
                multiline
                numberOfLines={3}
                value={customDescription}
                onChangeText={setCustomDescription}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Active Toggle */}
            <View style={styles.switchGroup}>
              <Text style={styles.inputLabel}>Active</Text>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={colors.white}
              />
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                {editMode ? 'Update' : 'Add Service'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: fontWeight.bold,
  },
  modalBody: {
    padding: spacing.xl,
  },
  serviceInfoCard: {
    backgroundColor: colors.backgroundGray,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
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
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.white,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  pricingBreakdown: {
    backgroundColor: colors.backgroundGray,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  // Travel Settings Styles
  travelSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  travelZonesCard: {
    backgroundColor: colors.backgroundGray,
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
  zoneLabelContainer: {
    flex: 1,
  },
  zoneLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  zoneHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  zoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    width: 110,
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
  // Special Request (25+ km)
  specialRequestContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  specialRequestInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  specialRequestLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  specialRequestHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Earnings Card
  earningsCard: {
    backgroundColor: '#E8F5E9',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  earningsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  earningsLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  earningsValue: {
    fontSize: fontSize.md,
    color: '#2E7D32',
    fontWeight: fontWeight.bold,
  },
  earningsNote: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  earningsNoteTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  earningsLabelSmall: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  earningsValueGreen: {
    fontSize: fontSize.sm,
    color: '#2E7D32',
    fontWeight: fontWeight.bold,
  },
  earningsDivider: {
    height: 1,
    backgroundColor: '#A5D6A7',
    marginVertical: spacing.md,
  },
  // Base Price Card
  basePriceCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  basePriceLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  basePriceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  basePriceInput: {
    flex: 1,
    padding: spacing.md,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  basePriceHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  // Notice Card (warning for providers)
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#90CAF9',
    alignItems: 'flex-start',
  },
  noticeIcon: {
    fontSize: fontSize.xl,
    marginRight: spacing.sm,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: '#1565C0',
    marginBottom: spacing.xs,
  },
  noticeText: {
    fontSize: fontSize.xs,
    color: '#1976D2',
    lineHeight: 18,
  },
  // Travel Policy Card
  travelPolicyCard: {
    backgroundColor: '#FFF8E1',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  travelPolicyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  travelPolicySubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  travelFeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  travelFeeDistance: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  travelFeeAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: '#F57C00',
  },
  // Special Request Card
  specialRequestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundGray,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
});

