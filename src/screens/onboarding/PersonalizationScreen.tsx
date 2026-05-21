import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '../../utils/icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

import { getCurrentLocation } from '../../services/location';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';
import ScaleInView from '../../components/animations/ScaleInView';
import FormCard from '../../components/FormCard';
import ModernInput from '../../components/ModernInput';

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
}

const getCategoryIcon = (categoryName: string): keyof typeof Ionicons.glyphMap => {
  const normalized = categoryName.toLowerCase();

  if (normalized.includes('hair') || normalized.includes('braid') || normalized.includes('wig')) {
    return 'cut-outline';
  }
  if (normalized.includes('nail') || normalized.includes('manicure') || normalized.includes('pedicure')) {
    return 'hand-left-outline';
  }
  if (normalized.includes('makeup') || normalized.includes('cosmetic') || normalized.includes('beauty')) {
    return 'color-palette-outline';
  }
  if (normalized.includes('lash') || normalized.includes('brow')) {
    return 'eye-outline';
  }
  if (normalized.includes('facial') || normalized.includes('skin') || normalized.includes('spa')) {
    return 'flower-outline';
  }
  if (normalized.includes('massage') || normalized.includes('body') || normalized.includes('wellness')) {
    return 'body-outline';
  }
  if (normalized.includes('wax') || normalized.includes('thread')) {
    return 'water-outline';
  }

  return 'sparkles-outline';
};

export default function PersonalizationScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshOnboardingStatus, markOnboardingComplete } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Step 1: Service preferences
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Step 2: Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Step 3: Booking preferences
  const [bookingTime, setBookingTime] = useState<string>('');

  // Step 4: Budget
  const [budget, setBudget] = useState<string>('');

  const totalSteps = 4;
  const stepTitles = [
    'Service Interests',
    'Location',
    'Booking Time',
    'Budget',
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  // Auto-locate when user reaches step 2 (location step)
  useEffect(() => {
    if (step === 2 && !address && !loadingLocation) {
      console.log('[Personalization] Auto-locating user...');
      handleUseCurrentLocation(false); // false = don't show success alert
    }
  }, [step]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('id, name, icon')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter((id) => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const handleUseCurrentLocation = async (showSuccessAlert = true) => {
    setLoadingLocation(true);
    try {
      const location = await getCurrentLocation();
      if (!location) {
        setLoadingLocation(false);
        return;
      }

      const { reverseGeocode } = await import('../../services/location');
      const addressData = await reverseGeocode(location);

      if (addressData) {
        setAddress(addressData.street);
        setCity(addressData.city);
        setState(addressData.state);
        setZipCode(addressData.zipCode);

        if (showSuccessAlert) {
          Alert.alert('Success', 'Location filled from your current position');
        } else {
          console.log('[Personalization] Location auto-filled:', addressData.city, addressData.state);
        }
      }
    } catch (error) {
      console.error('Error using current location:', error);
      // Only show error alert if user manually clicked the button
      if (showSuccessAlert) {
        Alert.alert('Error', 'Failed to get your current location. Please enter manually.');
      } else {
        console.log('[Personalization] Auto-location failed, user can enter manually');
      }
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      if (selectedCategories.length === 0) {
        Alert.alert('Select Services', 'Please select at least one service category');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!address || !city || !state || !zipCode) {
        Alert.alert('Location Required', 'Please fill in your location details');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!bookingTime) {
        Alert.alert('Preference Required', 'Please select your booking preference');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!budget) {
        Alert.alert('Budget Required', 'Please select your budget preference');
        return;
      }
      await savePreferences();
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    try {
      console.log('[Personalization] Starting to save preferences...');

      // Get profile id first
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;
      if (!profileData) throw new Error('Profile not found');

      console.log('[Personalization] Profile ID:', profileData.id);

      // Save preferences to customer profile.
      // Use upsert so the row is created if it doesn't already exist for this profile id.
      const { error } = await supabase
        .from('customer_profiles')
        .upsert({
          id: profileData.id,
          preferred_categories: selectedCategories,
          location_address: address,
          location_city: city,
          location_state: state,
          location_zip_code: zipCode,
          booking_time_preference: bookingTime,
          budget_preference: budget,
          onboarding_completed: true,
        }, { onConflict: 'id' });

      if (error) throw error;

      console.log('[Personalization] Preferences saved successfully');

      // markOnboardingComplete() sets needsOnboarding=false in the auth context
      // immediately, which causes the navigator to switch to CustomerMain.
      // Do NOT call refreshOnboardingStatus() here — it re-queries the DB and
      // its internal catch blocks can set needsOnboarding=true or
      // needsVerification=true, undoing the navigation and sending the user
      // back to Personalization or AccountVerification.
      // The DB already has onboarding_completed=true, so future app launches
      // will land on the correct screen without any extra refresh needed.
      setLoading(false);
      markOnboardingComplete();
    } catch (error: any) {
      console.error('[Personalization] Error saving preferences:', error);
      Alert.alert('Error', error.message || 'Failed to save preferences');
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      // Get profile and mark onboarding as completed even when skipping
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profileData) {
        await supabase
          .from('customer_profiles')
          .update({ onboarding_completed: true })
          .eq('id', profileData.id);
      }

      // markOnboardingComplete() switches navigation immediately.
      // refreshOnboardingStatus() is intentionally omitted — see savePreferences()
      // for a full explanation of why calling it here causes navigation to break.
      markOnboardingComplete();
    } catch (error) {
      console.error('[Personalization] Error skipping:', error);
      // Navigate even if the DB update failed; the user can re-complete later.
      markOnboardingComplete();
    }
  };

  const renderProgressBar = () => (
    <FadeInView delay={0}>
      <View style={styles.progressContainer}>
        <View style={styles.progressHeaderRow}>
          <Text style={styles.progressStepText}>Step {step} of {totalSteps}</Text>
          <Text style={styles.progressStepLabel}>{stepTitles[step - 1]}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(step / totalSteps) * 100}%` }]} />
        </View>
      </View>
    </FadeInView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Personalize Your Experience</Text>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {renderProgressBar()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <View>
            <FadeInView delay={100}>
              <Text style={styles.stepTitle}>What services interest you?</Text>
              <Text style={styles.stepDescription}>
                Select all that apply. We'll show you relevant providers.
              </Text>
            </FadeInView>

            <FormCard
              title="Beauty Services"
              subtitle="Choose one or more categories"
              icon="✨"
            >
              <View style={styles.categoriesGrid}>
                {categories.map((category, index) => (
                  <ScaleInView
                    key={category.id}
                    delay={Math.min(index * 50, 300)}
                    style={styles.categoryCardWrapper}
                  >
                    <TouchableOpacity
                      style={[
                        styles.categoryCard,
                        selectedCategories.includes(category.id) && styles.categoryCardSelected,
                      ]}
                      onPress={() => toggleCategory(category.id)}
                    >
                      <View
                        style={[
                          styles.categoryIconContainer,
                          selectedCategories.includes(category.id) && styles.categoryIconContainerSelected,
                        ]}
                      >
                        <Ionicons
                          name={getCategoryIcon(category.name)}
                          size={28}
                          color={selectedCategories.includes(category.id) ? colors.white : colors.primaryDarker}
                        />
                      </View>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      {selectedCategories.includes(category.id) && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </ScaleInView>
                ))}
              </View>
            </FormCard>
          </View>
        )}

        {step === 2 && (
          <View>
            <FadeInView delay={100}>
              <Text style={styles.stepTitle}>Set your location</Text>
              <Text style={styles.stepDescription}>
                {loadingLocation
                  ? '📍 Getting your location...'
                  : 'We\'ll show you providers in your area'}
              </Text>
            </FadeInView>

            <SlideUpView delay={150} direction="right">
              <FormCard title="Where are you located?" subtitle="Used to find nearby providers" icon="📍">
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={() => handleUseCurrentLocation()}
                  disabled={loadingLocation}
                >
                  {loadingLocation ? (
                    <>
                      <ActivityIndicator color={colors.white} size="small" style={{ marginRight: 8 }} />
                      <Text style={styles.locationButtonText}>Locating...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="locate" size={18} color={colors.white} style={{ marginRight: 8 }} />
                      <Text style={styles.locationButtonText}>Use Current Location</Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text style={styles.orText}>Or enter manually</Text>

                <ModernInput
                  label="Street Address"
                  value={address}
                  onChangeText={setAddress}
                  icon="home-outline"
                  required
                />
                <View style={styles.row}>
                  <View style={styles.inputHalf}>
                    <ModernInput
                      label="City"
                      value={city}
                      onChangeText={setCity}
                      icon="location-outline"
                      required
                    />
                  </View>
                  <View style={styles.inputHalf}>
                    <ModernInput
                      label="State"
                      value={state}
                      onChangeText={setState}
                      icon="map-outline"
                      required
                    />
                  </View>
                </View>
                <ModernInput
                  label="ZIP Code"
                  value={zipCode}
                  onChangeText={setZipCode}
                  icon="mail-outline"
                  keyboardType="numeric"
                  required
                />
              </FormCard>
            </SlideUpView>
          </View>
        )}

        {step === 3 && (
          <View>
            <FadeInView delay={100}>
              <Text style={styles.stepTitle}>When do you usually book?</Text>
              <Text style={styles.stepDescription}>
                This helps us show you the best availability
              </Text>
            </FadeInView>

            <FormCard title="Availability Preference" subtitle="Pick what best fits your routine" icon="⏰">
              <View>
                {['Weekday mornings', 'Weekday evenings', 'Weekends', 'Flexible'].map((time, index) => (
                  <SlideUpView
                    key={time}
                    delay={Math.min(index * 50, 300)}
                    direction={index % 2 === 0 ? 'right' : 'left'}
                  >
                    <TouchableOpacity
                      style={[styles.optionCard, bookingTime === time && styles.optionCardSelected]}
                      onPress={() => setBookingTime(time)}
                    >
                      <Text style={[styles.optionText, bookingTime === time && styles.optionTextSelected]}>
                        {time}
                      </Text>
                      {bookingTime === time && <Text style={styles.checkIcon}>✓</Text>}
                    </TouchableOpacity>
                  </SlideUpView>
                ))}
              </View>
            </FormCard>
          </View>
        )}

        {step === 4 && (
          <View>
            <FadeInView delay={100}>
              <Text style={styles.stepTitle}>Budget preferences</Text>
              <Text style={styles.stepDescription}>
                We'll prioritize providers in your price range
              </Text>
            </FadeInView>

            <FormCard title="Price Comfort" subtitle="We tailor results to your budget" icon="💳">
              <View>
                {[
                  { label: 'Budget-friendly', value: 'budget', icon: '$' },
                  { label: 'Mid-range', value: 'mid', icon: '$$' },
                  { label: 'Premium', value: 'premium', icon: '$$$' },
                  { label: 'No preference', value: 'any', icon: '💰' },
                ].map((option, index) => (
                  <ScaleInView key={option.value} delay={Math.min(index * 50, 300)}>
                    <TouchableOpacity
                      style={[styles.optionCard, budget === option.value && styles.optionCardSelected]}
                      onPress={() => setBudget(option.value)}
                    >
                      <View style={styles.optionContent}>
                        <Text style={styles.optionIcon}>{option.icon}</Text>
                        <Text
                          style={[styles.optionText, budget === option.value && styles.optionTextSelected]}
                        >
                          {option.label}
                        </Text>
                      </View>
                      {budget === option.value && <Text style={styles.checkIcon}>✓</Text>}
                    </TouchableOpacity>
                  </ScaleInView>
                ))}
              </View>
            </FormCard>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, step === 1 && styles.nextButtonFull]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.nextButtonText}>
              {step === 4 ? 'Finish' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: colors.primarySubtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  skipText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressStepText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  progressStepLabel: {
    fontSize: fontSize.sm,
    color: colors.primaryDarker,
    fontWeight: fontWeight.bold,
  },
  progressTrack: {
    height: 6,
    borderRadius: borderRadius.round,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primaryDarker,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  stepTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stepDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCardWrapper: {
    width: '48%',
    marginBottom: spacing.md,
  },
  categoryCard: {
    width: '100%',
    minHeight: 120,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  categoryCardSelected: {
    borderColor: colors.primaryDarker,
    backgroundColor: colors.primaryDarker + '10',
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  categoryIconContainerSelected: {
    backgroundColor: colors.primaryDarker,
    borderColor: colors.primaryDarker,
  },
  categoryName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
    width: '100%',
    flexWrap: 'wrap',
  },
  checkmark: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: colors.black,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  locationButton: {
    backgroundColor: colors.primaryDarker,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  locationButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  orText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inputHalf: {
    flex: 1,
  },
  optionCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: colors.primaryDarker,
    backgroundColor: colors.primaryDarker + '10',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionIcon: {
    fontSize: fontSize.xl,
  },
  optionText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  optionTextSelected: {
    color: colors.primary,
  },
  checkIcon: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  nextButton: {
    flex: 2,
    backgroundColor: colors.primaryDarker,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});

