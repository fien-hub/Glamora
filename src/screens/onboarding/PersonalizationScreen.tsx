import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentLocation } from '../../services/location';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';
import ScaleInView from '../../components/animations/ScaleInView';

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
}

export default function PersonalizationScreen() {
  const navigation = useNavigation();
  const { user, refreshOnboardingStatus } = useAuth();
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

      // Save preferences to customer profile
      const { error } = await supabase
        .from('customer_profiles')
        .update({
          preferred_categories: selectedCategories,
          location_address: address,
          location_city: city,
          location_state: state,
          location_zip_code: zipCode,
          booking_time_preference: bookingTime,
          budget_preference: budget,
          onboarding_completed: true,
        })
        .eq('id', profileData.id);

      if (error) throw error;

      console.log('[Personalization] Preferences saved successfully');

      // Refresh onboarding status in AuthContext
      // This will automatically rebuild the navigator to show CustomerMain
      console.log('[Personalization] Refreshing onboarding status...');
      await refreshOnboardingStatus();
      console.log('[Personalization] Onboarding status refreshed - navigation will auto-update');

      // No manual navigation needed - AuthContext will handle it
      setLoading(false);
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

      // Refresh onboarding status - navigation will auto-update
      await refreshOnboardingStatus();
    } catch (error) {
      console.error('[Personalization] Error skipping:', error);
      // Still try to refresh
      await refreshOnboardingStatus();
    }
  };

  const renderProgressBar = () => (
    <FadeInView delay={0}>
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((s) => (
          <View
            key={s}
            style={[styles.progressDot, s <= step && styles.progressDotActive]}
          />
        ))}
      </View>
    </FadeInView>
  );

  return (
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
                    <Text style={styles.categoryEmoji}>{category.icon}</Text>
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

            <SlideUpView delay={150}>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleUseCurrentLocation}
                disabled={loadingLocation}
              >
                {loadingLocation ? (
                  <>
                    <ActivityIndicator color={colors.primary} size="small" style={{ marginRight: 8 }} />
                    <Text style={styles.locationButtonText}>Locating...</Text>
                  </>
                ) : (
                  <Text style={styles.locationButtonText}>📍 Use Current Location</Text>
                )}
              </TouchableOpacity>
            </SlideUpView>

            <FadeInView delay={200}>
              <Text style={styles.orText}>Or enter manually</Text>
            </FadeInView>

            <SlideUpView delay={250}>
              <TextInput
                style={styles.input}
                placeholder="Street Address"
                value={address}
                onChangeText={setAddress}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="City"
                  value={city}
                  onChangeText={setCity}
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="State"
                  value={state}
                  onChangeText={setState}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="ZIP Code"
                value={zipCode}
                onChangeText={setZipCode}
                keyboardType="numeric"
              />
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

            <View>
              {['Weekday mornings', 'Weekday evenings', 'Weekends', 'Flexible'].map((time, index) => (
                <SlideUpView key={time} delay={Math.min(index * 50, 300)}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  progressDot: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressDotActive: {
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
    marginBottom: spacing.sm,
  },
  stepDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
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
    borderRadius: borderRadius.lg,
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
  categoryEmoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
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
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  locationButtonText: {
    color: colors.black,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  orText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
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
    borderRadius: borderRadius.md,
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
    borderRadius: borderRadius.md,
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
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    color: colors.black,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});

