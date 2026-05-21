import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
let WebBrowser: typeof import('expo-web-browser') = {} as any;
try { WebBrowser = require('expo-web-browser'); } catch (e) { console.warn('[ProviderOnboardingScreen] expo-web-browser unavailable:', e); }
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { getPayoutAccountStatus, getPayoutOnboardingUrl } from '../../services/payouts';
import { getCurrentLocation, reverseGeocode } from '../../services/location';
import { colors, spacing, fontSize, borderRadius, fontWeight } from '../../constants/theme';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import { DocumentUpload } from '../../components/DocumentUpload';
import { getVerificationStatus, getUserVerificationStatus, sendPhoneVerificationCode, verifyPhoneCode, uploadVerificationDocument, DocumentType } from '../../services/verification';
import AddServiceModal from '../../components/AddServiceModal';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';
import { Ionicons } from '../../utils/icons';
let ImagePicker: typeof import('expo-image-picker') = {} as any;
try { ImagePicker = require('expo-image-picker'); } catch (e) { console.warn('[ProviderOnboardingScreen] expo-image-picker unavailable:', e); }
import ModernInput from '../../components/ModernInput';
import ModernTextArea from '../../components/ModernTextArea';
import FormCard from '../../components/FormCard';

export default function ProviderOnboardingScreen() {
  const navigation = useNavigation<any>();
  const { user, markOnboardingComplete, refreshOnboardingStatus } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const submitInProgressRef = useRef(false);

  // Track screen view
  useScreenTracking('Provider Onboarding');

  // Step 1: Business Information
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [certifications, setCertifications] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  // Step 2: Service Setup
  const [selectedServices, setSelectedServices] = useState<Array<{
    serviceId: string;
    serviceName: string;
    duration: number;
    customServiceName?: string;
    isCustom: boolean;
    basePrice: number;  // Provider's base price in cents
    acceptsOver25km: boolean;
  }>>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedServiceForModal, setSelectedServiceForModal] = useState<any>(null);
  const CUSTOM_SERVICE_ID = '550e8400-e29b-41d4-a716-446655440999';

  // Step 3: Availability
  const [serviceRadius, setServiceRadius] = useState('10');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  // Step 4: Verification (formerly Step 5)
  const [bankAccountConnected, setBankAccountConnected] = useState(false);
  const [payoutAccountStatus, setPayoutAccountStatus] = useState<any>(null);
  const [loadingPayoutSetup, setLoadingPayoutSetup] = useState(false);
  const [identityVerificationStatus, setIdentityVerificationStatus] = useState<string>('pending');
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);

  // Enhanced verification states
  const [certificationUri, setCertificationUri] = useState<string | null>(null);
  const [licenseUri, setLicenseUri] = useState<string | null>(null);
  const [activeDocumentType, setActiveDocumentType] = useState<'govt_id' | 'selfie' | 'certification' | 'license' | null>(null);

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  useEffect(() => {
    fetchAvailableServices();
    checkExistingProfile();
    checkPayoutAccountStatus();
    checkVerificationStatus();
  }, []);

  const checkPayoutAccountStatus = async () => {
    try {
      const status = await getPayoutAccountStatus();
      setPayoutAccountStatus(status);
      setBankAccountConnected(status.connected && status.payoutsEnabled);
    } catch (error) {
      setPayoutAccountStatus(null);
      setBankAccountConnected(false);
    }
  };

  const checkVerificationStatus = async () => {
    try {
      const status = await getVerificationStatus();
      setIdentityVerificationStatus(status.status);
    } catch (error) {
      console.error('[Onboarding] Error checking verification status:', error);
    }
  };

  const checkExistingProfile = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profileData) return;

      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('id', profileData.id)
        .single();

      if (providerProfile) {
        setBusinessName(providerProfile.business_name || '');
        setYearsExperience(providerProfile.years_experience?.toString() || '');
        setServiceRadius(providerProfile.service_radius_km?.toString() || '10');
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    }
  };

  const fetchAvailableServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, description, base_duration_minutes')
        .neq('id', CUSTOM_SERVICE_ID) // Exclude the "Custom Service" placeholder
        .order('name');

      if (error) throw error;
      setAvailableServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const toggleService = (service: any) => {
    // Open modal to collect price and duration
    setSelectedServiceForModal(service);
    setModalVisible(true);
  };

  const handleSaveServiceDetails = (data: {
    duration: number;
    customDescription: string;
    customServiceName: string;
    isActive: boolean;
    basePrice: number;
    acceptsOver25km: boolean;
  }) => {
    if (!selectedServiceForModal) return;

    const isCustom = selectedServiceForModal.id === CUSTOM_SERVICE_ID;

    const newServiceEntry = {
      serviceId: selectedServiceForModal.id,
      serviceName: isCustom ? data.customServiceName : selectedServiceForModal.name,
      duration: data.duration,
      customServiceName: isCustom ? data.customServiceName : undefined,
      isCustom,
      basePrice: data.basePrice,
      acceptsOver25km: data.acceptsOver25km,
    };

    setSelectedServices([...selectedServices, newServiceEntry]);
    setModalVisible(false);
    setSelectedServiceForModal(null);
  };

  const removeService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter(s => s.serviceId !== serviceId));
  };

  const toggleWorkingDay = (day: number) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleAutoLocate = async () => {
    setLocating(true);
    try {
      console.log('[Onboarding] Auto-locating user...');
      const location = await getCurrentLocation();

      if (location) {
        setLatitude(location.latitude);
        setLongitude(location.longitude);

        // Reverse geocode to get city and state
        const address = await reverseGeocode(location);
        if (address) {
          setCity(address.city || '');
          setState(address.state || '');
          console.log('[Onboarding] Location auto-filled:', address.city, address.state);
        }
      }
    } catch (error) {
      console.error('[Onboarding] Error auto-locating:', error);
      Alert.alert('Location Error', 'Could not get your location. Please enter manually.');
    } finally {
      setLocating(false);
    }
  };

  const validateStep = () => {
    console.log('[Onboarding] Validating step:', currentStep);

    switch (currentStep) {
      case 1:
        console.log('[Onboarding] Step 1 - businessName:', businessName, 'bio:', bio, 'city:', city);
        if (!businessName.trim()) {
          Alert.alert('Required', 'Please enter your business name');
          return false;
        }
        if (!bio.trim()) {
          Alert.alert('Required', 'Please enter a bio');
          return false;
        }
        if (!city.trim() || !state.trim()) {
          Alert.alert('Required', 'Please enter your location or use Auto-Locate');
          return false;
        }
        return true;
      case 2:
        console.log('[Onboarding] Step 2 - selectedServices:', selectedServices.length);
        if (selectedServices.length === 0) {
          Alert.alert('Required', 'Please select at least one service');
          return false;
        }
        return true;
      case 3:
        console.log('[Onboarding] Step 3 - workingDays:', workingDays.length);
        if (workingDays.length === 0) {
          Alert.alert('Required', 'Please select at least one working day');
          return false;
        }
        return true;
      case 4:
        console.log('[Onboarding] Step 4 - Human review setup (optional at onboarding)');
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    console.log('[Onboarding] handleNext called, currentStep:', currentStep);

    if (!validateStep()) {
      console.log('[Onboarding] Validation failed');
      return;
    }

    if (currentStep < totalSteps) {
      console.log('[Onboarding] Moving to next step');
      setCurrentStep(currentStep + 1);
    } else {
      console.log('[Onboarding] Final step, calling saveProfile...');
      await saveProfile();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipForNow = async () => {
    if (loading || submitInProgressRef.current) return;

    submitInProgressRef.current = true;
    setLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        throw new Error('Profile not found');
      }

      const { error: providerError } = await supabase
        .from('provider_profiles')
        .upsert({
          id: profileData.id,
          business_name: businessName,
          years_experience: parseInt(yearsExperience) || 0,
          certifications: certifications.split(',').map((c) => c.trim()).filter(Boolean),
          service_radius_km: parseInt(serviceRadius) || 10,
          city,
          state,
          latitude,
          longitude,
          onboarding_completed: true,
        }, { onConflict: 'id' });

      if (providerError) {
        throw providerError;
      }

      await supabase
        .from('profiles')
        .update({ bio })
        .eq('id', profileData.id);

      markOnboardingComplete();
    } catch (error: any) {
      console.error('[Onboarding] Error skipping verification step:', error);
      Alert.alert('Error', error.message || 'Failed to skip verification step');
    } finally {
      setLoading(false);
      submitInProgressRef.current = false;
    }
  };

  const handleOpenPayoutSetup = async () => {
    setLoadingPayoutSetup(true);
    try {
      const url = await getPayoutOnboardingUrl();
      // openAuthSessionAsync closes itself when Stripe redirects to glamora://
      const result = await WebBrowser.openAuthSessionAsync(url, 'glamora://');
      // After the user returns, refresh status regardless of result
      await checkPayoutAccountStatus();
      if (result.type === 'cancel') {
        // User closed the browser — they may have completed or abandoned
        Alert.alert(
          'Payout Setup',
          bankAccountConnected
            ? 'Your bank account is connected!'
            : 'You can complete bank setup from your Earnings screen at any time.'
        );
      }
    } catch (error: any) {
      Alert.alert('Setup Failed', error.message || 'Could not open payout setup. Please try again.');
    } finally {
      setLoadingPayoutSetup(false);
    }
  };

  const saveProfile = async () => {
    if (submitInProgressRef.current) return;

    submitInProgressRef.current = true;
    setLoading(true);
    try {
      console.log('[Onboarding] Starting profile save...');

      // Get profile id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profileError) {
        console.error('[Onboarding] Profile fetch error:', profileError);
        throw profileError;
      }
      if (!profileData) {
        console.error('[Onboarding] Profile not found');
        throw new Error('Profile not found');
      }

      console.log('[Onboarding] Profile ID:', profileData.id);

      // Update provider profile
      console.log('[Onboarding] Updating provider profile...');
      const { error: providerError } = await supabase
        .from('provider_profiles')
        .upsert({
          id: profileData.id,
          business_name: businessName,
          years_experience: parseInt(yearsExperience) || 0,
          certifications: certifications.split(',').map((c) => c.trim()).filter(Boolean),
          service_radius_km: parseInt(serviceRadius) || 10,
          city: city,
          state: state,
          latitude: latitude,
          longitude: longitude,
          onboarding_completed: true,
        }, { onConflict: 'id' });

      if (providerError) {
        console.error('[Onboarding] Provider update error:', providerError);
        throw providerError;
      }

      console.log('[Onboarding] Provider profile updated');

      // Update profile bio
      console.log('[Onboarding] Updating bio...');
      await supabase
        .from('profiles')
        .update({ bio })
        .eq('id', profileData.id);

      // Add selected services with default pricing
      console.log('[Onboarding] Adding services...');

      // First, delete existing services for this provider to avoid duplicates
      const { error: deleteError } = await supabase
        .from('provider_services')
        .delete()
        .eq('provider_id', profileData.id);

      if (deleteError) {
        console.error('[Onboarding] Error deleting existing services:', deleteError);
        // Continue anyway - might be first time
      }

      // Insert all selected services with their configured pricing by distance
      for (const service of selectedServices) {
        const insertData: any = {
          provider_id: profileData.id,
          service_id: service.serviceId,
          duration_minutes: service.duration,
          custom_service_name: service.customServiceName || null,
          is_active: true,
          platform_commission_rate: 0.20, // 20% commission
          // Base price model - travel fees are handled by platform
          base_price: service.basePrice,
          accepts_over_25km: service.acceptsOver25km,
        };

        const { error: serviceError } = await supabase.from('provider_services').insert(insertData);

        if (serviceError) {
          console.error('[Onboarding] Service insert error:', serviceError);
          throw serviceError;
        }
      }

      console.log('[Onboarding] Services added');

      // Add availability schedule
      console.log('[Onboarding] Adding availability...');

      // First, delete existing availability to avoid duplicates
      const { error: deleteAvailError } = await supabase
        .from('provider_availability')
        .delete()
        .eq('provider_id', profileData.id);

      if (deleteAvailError) {
        console.error('[Onboarding] Error deleting existing availability:', deleteAvailError);
        // Continue anyway - might be first time
      }

      for (const day of workingDays) {
        const { error: availError } = await supabase.from('provider_availability').insert({
          provider_id: profileData.id,
          day_of_week: day,
          start_time: startTime,
          end_time: endTime,
          is_available: true,
        });

        if (availError) {
          console.error('[Onboarding] Availability insert error:', availError);
          throw availError;
        }
      }

      console.log('[Onboarding] Availability added');
      console.log('[Onboarding] All steps completed successfully!');

      // Mark onboarding complete immediately so navigation can switch right away.
      // refreshOnboardingStatus() is intentionally NOT called — it re-queries the DB
      // and can set needsOnboarding=true if there's any transient read error, bouncing
      // the user back to onboarding right after they just completed it.
      markOnboardingComplete();

      setLoading(false);
    } catch (error: any) {
      console.error('[Onboarding] Error saving profile:', error);
      Alert.alert('Error', error.message || 'Failed to save profile');
      setLoading(false);
    } finally {
      submitInProgressRef.current = false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return renderBusinessInfo();
      case 2:
        return renderServiceSetup();
      case 3:
        return renderAvailability();
      case 4:
        return renderVerification();
      default:
        return null;
    }
  };

  const renderBusinessInfo = () => (
    <View style={styles.stepContainer}>
      <SlideUpView delay={0}>
        <Text style={styles.stepTitle}>Business Information</Text>
        <Text style={styles.stepDescription}>Tell us about your business</Text>
      </SlideUpView>

      <SlideUpView delay={100}>
        <FormCard title="Basic Details" icon="💼">
          <ModernInput
            label="Business Name"
            value={businessName}
            onChangeText={setBusinessName}
            icon="business-outline"
            required
            hint="e.g., Glamorous Nails & Spa"
          />

          <ModernTextArea
            label="Bio"
            value={bio}
            onChangeText={setBio}
            required
            maxLength={500}
            hint="Tell customers about your expertise and services"
          />
        </FormCard>
      </SlideUpView>

      <SlideUpView delay={200}>
        <FormCard title="Experience" icon="⭐">
          <ModernInput
            label="Years of Experience"
            value={yearsExperience}
            onChangeText={setYearsExperience}
            icon="time-outline"
            keyboardType="numeric"
            hint="e.g., 5"
          />

          <ModernInput
            label="Certifications"
            value={certifications}
            onChangeText={setCertifications}
            icon="ribbon-outline"
            hint="Comma separated, e.g., Licensed Cosmetologist"
          />
        </FormCard>
      </SlideUpView>

      <SlideUpView delay={300}>
        <FormCard title="Location" icon="📍">
          <TouchableOpacity
            style={styles.autoLocateButtonModern}
            onPress={handleAutoLocate}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="locate" size={20} color={colors.white} />
                <Text style={styles.autoLocateTextModern}>Auto-Detect Location</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.locationRow}>
            <View style={styles.locationInputHalf}>
              <ModernInput
                label="City"
                value={city}
                onChangeText={setCity}
                icon="location-outline"
                required
              />
            </View>
            <View style={styles.locationInputHalf}>
              <ModernInput
                label="State"
                value={state}
                onChangeText={setState}
                icon="map-outline"
                required
              />
            </View>
          </View>
        </FormCard>
      </SlideUpView>
    </View>
  );

  const renderServiceSetup = () => {
    // Filter services based on search query
    const filteredServices = availableServices.filter(service =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Select Your Services</Text>
        <Text style={styles.stepDescription}>Choose the services you offer</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search services..."
            placeholderTextColor={colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Add Custom Service Button */}
        <View style={styles.customServiceContainer}>
          <Text style={styles.customServiceHint}>
            Can't find your service? Add a custom one below
          </Text>
          <TouchableOpacity
            style={styles.addCustomServiceButton}
            onPress={() => {
              const customService = {
                id: CUSTOM_SERVICE_ID,
                name: 'Custom Service',
                base_duration_minutes: 60,
              };
              toggleService(customService);
            }}
          >
            <Ionicons name="add-circle" size={24} color={colors.primary} />
            <Text style={styles.addCustomServiceText}>Add Custom Service</Text>
          </TouchableOpacity>
          <Text style={styles.customServiceNote}>
            ℹ️ Custom services will be reviewed to ensure they're beauty-related
          </Text>
        </View>

        {/* Selected Services List */}
        {selectedServices.length > 0 && (
          <View style={styles.customServicesSection}>
            <Text style={styles.sectionTitle}>Your Services ({selectedServices.length})</Text>
            {selectedServices.map((service) => (
              <View key={service.serviceId} style={styles.customServiceCard}>
                <View style={styles.customServiceInfo}>
                  <View style={styles.serviceNameRow}>
                    <Text style={styles.serviceName}>{service.serviceName}</Text>
                    {service.isCustom && (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>Pending Review</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.servicePrice}>
                    Base: ${(service.basePrice / 100).toFixed(2)} • {service.duration} min
                  </Text>
                  {service.isCustom && (
                    <Text style={styles.customServiceNote}>
                      Will be reviewed before appearing in search
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => removeService(service.serviceId)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Available Services List */}
        <Text style={styles.sectionTitle}>Add Services ({filteredServices.length})</Text>
        <View style={styles.servicesList}>
          {filteredServices.map((service) => {
            const isSelected = selectedServices.some(s => s.serviceId === service.id);
            return (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceItem,
                  isSelected && styles.serviceItemSelected,
                ]}
                onPress={() => !isSelected && toggleService(service)}
                disabled={isSelected}
              >
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.servicePrice}>
                    {service.base_duration_minutes} min (suggested)
                  </Text>
                </View>
                {isSelected ? (
                  <Text style={styles.addedText}>✓ Added</Text>
                ) : (
                  <Text style={styles.addText}>+ Add</Text>
                )}
              </TouchableOpacity>
            );
          })}
          {filteredServices.length === 0 && (
            <Text style={styles.noResultsText}>
              No services found. Try a different search.
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderAvailability = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <View style={styles.stepContainer}>
        <SlideUpView delay={0}>
          <Text style={styles.stepTitle}>Set Your Availability</Text>
          <Text style={styles.stepDescription}>When are you available to work?</Text>
        </SlideUpView>

        <SlideUpView delay={100}>
          <FormCard title="Working Days" icon="📅" subtitle="Select the days you're available">
            <View style={styles.daysContainerModern}>
              {days.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayButtonModern,
                    workingDays.includes(index) && styles.dayButtonSelectedModern,
                  ]}
                  onPress={() => toggleWorkingDay(index)}
                >
                  <Text
                    style={[
                      styles.dayTextModern,
                      workingDays.includes(index) && styles.dayTextSelectedModern,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </FormCard>
        </SlideUpView>

        <SlideUpView delay={300}>
          <FormCard title="Working Hours" icon="⏰">
            <View style={styles.timeContainerModern}>
              <View style={styles.timeInputModern}>
                <ModernInput
                  label="Start Time"
                  value={startTime}
                  onChangeText={setStartTime}
                  icon="time-outline"
                  hint="e.g., 09:00"
                />
              </View>
              <View style={styles.timeInputModern}>
                <ModernInput
                  label="End Time"
                  value={endTime}
                  onChangeText={setEndTime}
                  icon="time-outline"
                  hint="e.g., 17:00"
                />
              </View>
            </View>
          </FormCard>
        </SlideUpView>
      </View>
    );
  };

  const handlePickDocument = async (type: 'certification' | 'license') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;

        // Set loading state
        if (type === 'certification') {
          setCertificationUri(uri);
        } else {
          setLicenseUri(uri);
        }

        // Upload the document to verification_documents table
        try {
          const fileName = uri.split('/').pop() || 'document.jpg';
          const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
          const documentType: DocumentType = type === 'certification' ? 'certification' : 'professional_license';

          await uploadVerificationDocument(
            { uri, name: fileName, type: fileType },
            documentType
          );

          Alert.alert('Success', `${type === 'certification' ? 'Certification' : 'Professional License'} uploaded successfully!`);
        } catch (uploadError: any) {
          console.error('Error uploading document:', uploadError);
          Alert.alert('Upload Error', uploadError.message || 'Failed to upload document. You can try again later from your profile.');
          // Keep the URI set so user can see they selected something
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };

  const renderVerificationItem = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    description: string,
    isComplete: boolean,
    isRequired: boolean,
    onAction: () => void,
    actionLabel: string,
    status?: 'pending' | 'under_review' | 'approved' | 'rejected'
  ) => (
    <View style={[styles.verificationCard, isComplete && styles.verificationCardComplete]}>
      <View style={styles.verificationHeader}>
        <View style={styles.verificationIconContainer}>
          <Ionicons
            name={isComplete ? 'checkmark-circle' : icon}
            size={24}
            color={isComplete ? colors.success : colors.primary}
          />
        </View>
        <View style={styles.verificationTextContainer}>
          <View style={styles.verificationTitleRow}>
            <Text style={styles.verificationTitle}>{title}</Text>
            {isRequired && !isComplete && (
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>Required</Text>
              </View>
            )}
            {!isRequired && (
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalBadgeText}>Optional</Text>
              </View>
            )}
          </View>
          <Text style={styles.verificationDescription}>{description}</Text>
        </View>
      </View>

      <View style={styles.verificationFooter}>
        {status === 'under_review' ? (
          <View style={styles.reviewBadge}>
            <Ionicons name="time-outline" size={16} color={colors.warning} />
            <Text style={styles.reviewBadgeText}>Under Review</Text>
          </View>
        ) : isComplete ? (
          <View style={styles.completeBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.completeBadgeText}>Completed</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.verificationActionButton} onPress={onAction}>
            <Text style={styles.verificationActionText}>{actionLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderVerification = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Trust & Safety Review</Text>
      <Text style={styles.stepDescription}>
        Submit identity documents and services for human review before customer visibility
      </Text>

      {/* Required Section */}
      <Text style={styles.sectionLabel}>Required For Marketplace Visibility</Text>

      {/* KYC Verification - Combined ID + Selfie */}
      {renderVerificationItem(
        'shield-checkmark-outline',
        'KYC Verification',
        'Upload government ID for manual trust & safety review',
        identityVerificationStatus === 'approved',
        true,
        () => (navigation as any).navigate('KYCVerification', {
          onSuccess: () => {
            checkVerificationStatus();
          },
        }),
        identityVerificationStatus === 'approved'
          ? 'Verified ✓'
          : identityVerificationStatus === 'under_review' || identityVerificationStatus === 'processing'
          ? 'Under Review'
          : 'Upload Documents',
        identityVerificationStatus as any
      )}

      {identityVerificationStatus === 'approved' && (
        <View style={styles.verifiedBadgeContainer}>
          <Ionicons name="shield-checkmark" size={20} color={colors.success} />
          <Text style={styles.verifiedBadgeText}>KYC Verified</Text>
        </View>
      )}

      {/* Optional Section */}
      <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Optional Documents</Text>

      {renderVerificationItem(
        'ribbon-outline',
        'Certifications',
        'Upload beauty/cosmetology certifications',
        !!certificationUri,
        false,
        () => handlePickDocument('certification'),
        certificationUri ? 'Change' : 'Upload'
      )}

      {renderVerificationItem(
        'document-text-outline',
        'Professional License',
        'Upload spa/facial license if applicable',
        !!licenseUri,
        false,
        () => handlePickDocument('license'),
        licenseUri ? 'Change' : 'Upload'
      )}

      {/* Bank Account */}
      <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Payment Setup</Text>

      {renderVerificationItem(
        'card-outline',
        'Bank Account',
        bankAccountConnected
          ? 'Connected and ready for payouts'
          : 'Connect your bank account to receive payments',
        bankAccountConnected,
        false,
        handleOpenPayoutSetup,
        loadingPayoutSetup ? 'Connecting...' : bankAccountConnected ? 'Manage' : 'Connect Bank'
      )}

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color={colors.warning} />
        <Text style={styles.infoText}>
          You won't be visible to customers until identity is approved and your services pass admin review. You can skip now and complete this later from Profile.
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 140 : 80}
    >
      {/* Progress Bar with fade-in animation */}
      <FadeInView delay={0}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Step {currentStep} of {totalSteps}
          </Text>
        </View>
      </FadeInView>

      {/* Content with slide-up animation */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        <SlideUpView delay={100} key={currentStep} direction={currentStep % 2 === 0 ? 'left' : 'right'}>
          {renderStep()}
        </SlideUpView>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        {/* Show "Skip for Now" button on Step 4 */}
        {currentStep === totalSteps ? (
          <>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipForNow}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.skipButtonText}>Skip for Now</Text>
              )}
            </TouchableOpacity>

            {bankAccountConnected && (
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
                disabled={loading}
              >
                <Text style={styles.nextButtonText}>Complete & Start</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={[styles.nextButton, currentStep === 1 && styles.nextButtonFull]}
            onPress={handleNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.nextButtonText}>Next</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Add Service Modal */}
      {selectedServiceForModal && (
        <AddServiceModal
          visible={modalVisible}
          service={selectedServiceForModal}
          onClose={() => {
            setModalVisible(false);
            setSelectedServiceForModal(null);
          }}
          onSave={handleSaveServiceDetails}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressContainer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.round,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primaryDarker,
  },
  progressText: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: spacing.lg,
  },
  stepTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stepDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
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
    height: 100,
    textAlignVertical: 'top',
  },
  servicesList: {
    marginTop: spacing.md,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  serviceItemSelected: {
    borderColor: colors.primaryDarker,
    backgroundColor: colors.primaryDarker + '20',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  servicePrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primaryDarker,
    borderColor: colors.primaryDarker,
  },
  checkmark: {
    color: colors.black,
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  dayButton: {
    width: 45,
    height: 45,
    borderRadius: borderRadius.round,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  dayButtonSelected: {
    backgroundColor: colors.primaryDarker,
    borderColor: colors.primaryDarker,
  },
  dayText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: colors.black,
  },
  timeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  timeInput: {
    flex: 1,
  },
  daysContainerModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dayButtonModern: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dayButtonSelectedModern: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  dayTextModern: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  dayTextSelectedModern: {
    color: colors.black,
    fontWeight: '700',
  },
  timeContainerModern: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeInputModern: {
    flex: 1,
  },
  timeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  verificationCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  verificationTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  verificationDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 21,
  },
  connectButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  connectButtonText: {
    color: colors.black,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  uploadButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: colors.backgroundGray,
    borderColor: colors.border,
    opacity: 0.6,
  },
  uploadButtonTextDisabled: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: colors.primary + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    color: colors.black,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  skipButton: {
    flex: 2,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  skipButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  autoLocateButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
  },
  autoLocateText: {
    color: colors.black,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  autoLocateButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  autoLocateTextModern: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  locationInputHalf: {
    flex: 1,
  },
  documentUploadContainer: {
    marginTop: spacing.md,
  },
  documentTypeLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  cancelUploadButton: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelUploadButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  statusBadge: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  approvedText: {
    color: colors.success,
  },
  serviceDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  customServiceInputContainer: {
    marginTop: spacing.md,
    marginLeft: spacing.lg,
    marginRight: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  customServiceLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  clearSearchButton: {
    padding: spacing.sm,
  },
  clearSearchText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  customServiceContainer: {
    marginBottom: spacing.lg,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  customServiceHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  addCustomServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLighter,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addCustomServiceText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  customServiceNote: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  customServicesSection: {
    marginBottom: spacing.md,
  },
  customServiceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  customServiceInfo: {
    flex: 1,
  },
  serviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  pendingBadge: {
    backgroundColor: colors.secondaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  pendingBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.secondaryDark,
  },
  removeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  removeButtonText: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  noResultsText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: fontSize.md,
    padding: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalCancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  modalAddButton: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalAddButtonText: {
    color: colors.black,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  // Travel Settings Styles
  travelInfoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  travelInfoIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  travelInfoContent: {
    flex: 1,
  },
  travelInfoTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  travelInfoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  zonesCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  zonesCardTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  zoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  zoneDistance: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  zoneFee: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.primary,
  },
  zoneFeeSpecial: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  exampleBox: {
    backgroundColor: '#f0f9ff',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  exampleTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  exampleText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  addedText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: '600',
  },
  addText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  // Enhanced verification styles
  sectionLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  verificationCardComplete: {
    borderColor: colors.success,
    backgroundColor: colors.success + '08',
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  verificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  verificationTextContainer: {
    flex: 1,
  },
  verificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  requiredBadge: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  requiredBadgeText: {
    fontSize: fontSize.xs,
    color: colors.error,
    fontWeight: '600',
  },
  optionalBadge: {
    backgroundColor: colors.textSecondary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  optionalBadgeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  verificationFooter: {
    marginTop: spacing.sm,
  },
  verificationActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryDarker,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  verificationActionText: {
    fontSize: fontSize.sm,
    color: colors.white,
    fontWeight: '600',
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  reviewBadgeText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: '600',
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  completeBadgeText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: '600',
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  selfiePreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.success,
  },
  socialInputContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  socialInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  socialInput: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  verifiedBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  verifiedBadgeText: {
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: '600',
  },
});

