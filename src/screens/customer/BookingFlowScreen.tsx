import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInRight,
  FadeInLeft,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from '../../utils/linearGradient';
import * as Haptics from 'expo-haptics';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '../../utils/icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { analytics } from '../../services/analytics';
import { getCurrentLocation, reverseGeocode } from '../../services/location';
import { purchaseBookingProduct, verifyRevenueCatBookingPayment } from '../../services/revenuecat';
import { trackMetaInitiatedCheckout, trackMetaPurchase } from '../../services/metaAds';
import { sendRemotePushToProfile } from '../../utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_BOOKING_KEY = 'glamora:pendingBooking';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';
import { useVerificationGuard } from '../../hooks/useVerificationGuard';
import PaymentVerificationPrompt from '../../components/PaymentVerificationPrompt';
import CachedImage, { CachedAvatarImage } from '../../components/CachedImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Step definitions
const STEPS = [
  { id: 1, title: 'Service', icon: 'cut-outline' },
  { id: 2, title: 'Date & Time', icon: 'calendar-outline' },
  { id: 3, title: 'Location', icon: 'location-outline' },
  { id: 4, title: 'Payment', icon: 'card-outline' },
];

interface Service {
  id: string;
  name: string;
  description?: string;
  basePrice: number;  // Provider's base price in cents
  accepts_over_25km: boolean;
  duration: number;
  provider_service_id: string;
}

interface ProviderInfo {
  id: string;
  business_name: string;
  avatar_url?: string;
}

export default function BookingFlowScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  
  const providerId = route.params?.providerId;
  const preSelectedServiceId = route.params?.serviceId;

  // Current step
  const [currentStep, setCurrentStep] = useState(1);
  const contentOpacity = useSharedValue(1);

  // Data states
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Step 1: Service selection
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Step 2: Date & Time
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Step 3: Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLon, setCustomerLon] = useState<number | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Step 4: Payment & Summary
  const [notes, setNotes] = useState('');
  const [pricingData, setPricingData] = useState<any>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Verification guard
  const {
    requireVerification,
    paymentMethodVerified,
    loading: verificationLoading,
  } = useVerificationGuard();

  useEffect(() => {
    // Check verification before allowing booking
    if (!requireVerification('booking')) {
      navigation.goBack();
      return;
    }

    if (providerId) {
      loadBookingData();
    }
    if (user) {
      fetchProfileId();
    }
  }, [providerId, user]);

  // Fetch profile ID from profiles table (needed for bookings)
  const fetchProfileId = async () => {
    if (!user) return;
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile ID:', error);
        return;
      }

      if (profileData) {
        setProfileId(profileData.id);
      }
    } catch (error) {
      console.error('Error fetching profile ID:', error);
    }
  };

  // Calculate pricing when service and location are set
  useEffect(() => {
    if (selectedService && address && city && state && zipCode && currentStep === 4) {
      calculatePricing();
    }
  }, [selectedService, address, city, state, zipCode, currentStep]);

  const loadBookingData = async () => {
    try {
      setLoading(true);

      // Get provider info
      const { data: providerData, error: providerError } = await supabase
        .from('provider_profiles')
        .select(`
          id,
          business_name,
          profiles (user_id, avatar_url)
        `)
        .eq('id', providerId)
        .single();

      if (providerError) throw providerError;

      const providerProfiles = providerData.profiles as any;
      const providerUserId = Array.isArray(providerProfiles)
        ? providerProfiles?.[0]?.user_id
        : providerProfiles?.user_id;

      if (providerUserId) {
        const { data: activeUser, error: activeUserError } = await supabase
          .from('users')
          .select('id')
          .eq('id', providerUserId)
          .eq('is_active', true)
          .single();

        if (activeUserError || !activeUser) {
          throw new Error('This provider is currently unavailable for booking.');
        }
      }

      setProvider({
        id: providerData.id,
        business_name: providerData.business_name,
        avatar_url: providerProfiles?.avatar_url ?? (Array.isArray(providerProfiles) ? providerProfiles[0]?.avatar_url : undefined),
      });

      // Get provider services
      const { data: servicesData, error: servicesError } = await supabase
        .from('provider_services')
        .select(`
          id,
          duration_minutes,
          base_price,
          accepts_over_25km,
          service:services (id, name, description)
        `)
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('base_price');

      if (servicesError) throw servicesError;

      const transformedServices = servicesData?.map((ps: any) => ({
        id: ps.service.id,
        name: ps.service.name,
        description: ps.service.description,
        basePrice: ps.base_price || 0,
        accepts_over_25km: ps.accepts_over_25km,
        duration: ps.duration_minutes,
        provider_service_id: ps.id,
      })) || [];

      // If coming from a tagged post/portfolio, only show that specific service
      if (preSelectedServiceId) {
        if (__DEV__) console.log('[BookingFlow] Pre-selected service ID:', preSelectedServiceId);
        if (__DEV__) console.log('[BookingFlow] Available services:', transformedServices.map(s => ({ id: s.id, ps_id: s.provider_service_id, name: s.name })));

        const preSelected = transformedServices.find(
          (s) => s.provider_service_id === preSelectedServiceId || s.id === preSelectedServiceId
        );

        if (preSelected) {
          if (__DEV__) console.log('[BookingFlow] Found pre-selected service:', preSelected.name);
          setServices([preSelected]); // ONLY show the tagged service
          setSelectedService(preSelected);
        } else {
          console.warn('[BookingFlow] Pre-selected service not found, showing all services');
          setServices(transformedServices);
        }
      } else {
        if (__DEV__) console.log('[BookingFlow] No pre-selected service, showing all services');
        setServices(transformedServices);
      }
    } catch (error) {
      console.error('[BookingFlow] Error loading data:', error);
      Alert.alert('Error', 'Failed to load booking data');
    } finally {
      setLoading(false);
    }
  };

  const calculatePricing = async () => {
    if (!selectedService || !address || !city) return;
    if (customerLat === null || customerLon === null) return; // coords required for travel-fee calc

    setLoadingPrice(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/api/pricing/calculate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider_id: providerId,
            service_id: selectedService.id,
            customer_latitude: customerLat,
            customer_longitude: customerLon,
          }),
        }
      );

      const data = await response.json() as any;
      if (data.success) {
        setPricingData(data);
      }
    } catch (error) {
      console.error('[BookingFlow] Pricing error:', error);
    } finally {
      setLoadingPrice(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 18; hour++) {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour;
      slots.push(`${displayHour}:00 ${period}`);
      if (hour < 18) slots.push(`${displayHour}:30 ${period}`);
    }
    return slots;
  };

  const handleUseCurrentLocation = async () => {
    setLoadingLocation(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const applyStoredProfileLocation = async (): Promise<boolean> => {
      if (!user?.id) return false;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profileData?.id) {
        return false;
      }

      const { data: customerProfile, error: customerError } = await supabase
        .from('customer_profiles')
        .select('address, city, state, zip_code, latitude, longitude')
        .eq('id', profileData.id)
        .single();

      if (customerError || !customerProfile) {
        return false;
      }

      const nextAddress = customerProfile.address || '';
      const nextCity = customerProfile.city || '';
      const nextState = customerProfile.state || '';
      const nextZip = customerProfile.zip_code || '';

      if (!nextAddress && !nextCity && !nextState && !nextZip) {
        return false;
      }

      // Use stored coordinates if available so pricing API can calculate travel fee
      setCustomerLat(customerProfile.latitude ?? null);
      setCustomerLon(customerProfile.longitude ?? null);
      setAddress(nextAddress);
      setCity(nextCity);
      setState(nextState);
      setZipCode(nextZip);
      return true;
    };

    try {
      const location = await getCurrentLocation();
      if (location) {
        // Store GPS coordinates for pricing API
        setCustomerLat(location.latitude);
        setCustomerLon(location.longitude);
        const addressInfo = await reverseGeocode(location);
        if (addressInfo) {
          setAddress(addressInfo.street || '');
          setCity(addressInfo.city || '');
          setState(addressInfo.state || '');
          setZipCode(addressInfo.zipCode || '');
          return;
        }
      }

      const usedStoredLocation = await applyStoredProfileLocation();
      if (!usedStoredLocation) {
        Alert.alert('Location Error', 'Could not get your location');
      }
    } catch (error) {
      console.error('Error using current location:', error);

      try {
        const usedStoredLocation = await applyStoredProfileLocation();
        if (!usedStoredLocation) {
          Alert.alert('Location Error', 'Could not get your location');
        }
      } catch {
        Alert.alert('Location Error', 'Could not get your location');
      }
    } finally {
      setLoadingLocation(false);
    }
  };

  // Navigation between steps
  const goToNextStep = () => {
    if (currentStep < 4) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      contentOpacity.value = withTiming(0, { duration: 150 }, () => {
        contentOpacity.value = withTiming(1, { duration: 150 });
      });
      setTimeout(() => setCurrentStep(currentStep + 1), 150);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      contentOpacity.value = withTiming(0, { duration: 150 }, () => {
        contentOpacity.value = withTiming(1, { duration: 150 });
      });
      setTimeout(() => setCurrentStep(currentStep - 1), 150);
    } else {
      navigation.goBack();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!selectedService;
      case 2: return !!selectedTime;
      case 3: return address && city && state && zipCode;
      case 4: return pricingData?.within_range !== false || pricingData?.accepts_over_25km;
      default: return false;
    }
  };

  const handleSubmitBooking = async () => {
    if (!user || !selectedService || !selectedTime || !provider) return;

    setSubmitting(true);
    setPaymentProcessing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const amountCents = pricingData?.pricing?.total_cents || selectedService.basePrice;
      void trackMetaInitiatedCheckout(amountCents / 100, {
        providerId,
        serviceId: selectedService.provider_service_id,
        source: 'booking_flow_screen',
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please log in again.');
      }

      const purchaseData = await purchaseBookingProduct(user.id);
      const verification = await verifyRevenueCatBookingPayment(session.access_token, purchaseData);

      // Payment successful - create booking
      const bookingDate = selectedDate.toISOString().split('T')[0];
      const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;

      // Use profile ID for customer_id (references customer_profiles.id)
      if (!profileId) {
        throw new Error('Profile not loaded. Please try again.');
      }

      // Fetch provider location for distance tracking
      const { data: providerLoc } = await supabase
        .from('provider_profiles')
        .select('latitude, longitude')
        .eq('id', providerId)
        .single();

      const paymentReference = verification?.paymentReference || `rc_${purchaseData.transactionId}`;

      const bookingPayload = {
        customer_id: profileId,
        provider_id: providerId,
        provider_service_id: selectedService.provider_service_id,
        scheduled_date: bookingDate,
        scheduled_time: selectedTime,
        address: fullAddress,
        city,
        state,
        zip_code: zipCode,
        latitude: customerLat,
        longitude: customerLon,
        distance_km: pricingData?.distance_miles
          ? Math.round(pricingData.distance_miles * 1.60934 * 100) / 100
          : null,
        provider_latitude: providerLoc?.latitude || null,
        provider_longitude: providerLoc?.longitude || null,
        notes: notes || null,
        status: 'pending',
        total_price: amountCents / 100,
        platform_fee: pricingData?.pricing?.platform_fee_cents
          ? pricingData.pricing.platform_fee_cents / 100
          : null,
        provider_payout: pricingData?.pricing?.provider_earnings_cents
          ? pricingData.pricing.provider_earnings_cents / 100
          : null,
        payment_intent_id: paymentReference,
        payment_status: 'paid',
      };

      // Persist before DB insert — if insert fails, recovery can retry with the same reference
      await AsyncStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify({ paymentReference, bookingPayload }));

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingPayload)
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Insert succeeded — clear the recovery record
      await AsyncStorage.removeItem(PENDING_BOOKING_KEY);

      sendRemotePushToProfile(
        providerId,
        'New Booking Request',
        `${selectedService.name} booking requested for ${bookingDate} at ${selectedTime}`,
        {
          type: 'booking',
          bookingId: booking.id,
          providerId,
          serviceId: selectedService.provider_service_id,
        },
        'booking'
      ).catch((pushError) => {
        console.error('[BookingFlow] Failed to send provider push:', pushError);
      });

      setBookingId(booking.id);
      setShowSuccess(true);
      void trackMetaPurchase(amountCents / 100, 'USD', {
        bookingId: booking.id,
        providerId,
        source: 'booking_flow_screen',
      });

      analytics.track('booking_created', {
        provider_id: providerId,
        service_id: selectedService.id,
        amount: amountCents / 100,
        payment_provider: 'revenuecat',
      });
    } catch (error: any) {
      // Check if payment succeeded but DB insert failed — show recovery reference
      const pendingRaw = await AsyncStorage.getItem(PENDING_BOOKING_KEY).catch(() => null);
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        Alert.alert(
          'Booking Not Saved',
          `Your payment went through but we couldn't save your booking. Please open the app again — it will retry automatically.\n\nSupport reference: ${pending.paymentReference}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Booking Failed', error.message || 'Please try again');
      }
    } finally {
      setSubmitting(false);
      setPaymentProcessing(false);
    }
  };

  // Animated styles
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: interpolate(contentOpacity.value, [0, 1], [0.95, 1]) }],
  }));

  // Step indicator
  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {STEPS.map((step, index) => {
        const isActive = currentStep >= step.id;
        const isCurrent = currentStep === step.id;
        return (
          <React.Fragment key={step.id}>
            <TouchableOpacity
              style={[
                styles.stepDot,
                isActive && styles.stepDotActive,
                isCurrent && styles.stepDotCurrent,
              ]}
              onPress={() => {
                if (step.id <= currentStep) {
                  setCurrentStep(step.id);
                }
              }}
            >
              <Ionicons
                name={step.icon as any}
                size={18}
                color={isActive ? colors.black : colors.textSecondary}
              />
            </TouchableOpacity>
            {index < STEPS.length - 1 && (
              <View style={[styles.stepLine, isActive && styles.stepLineActive]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  // Step 1: Service Selection
  const renderServiceSelection = () => (
    <Animated.View style={contentAnimatedStyle}>
      <FadeInView delay={0}>
        <Text style={styles.stepTitle}>Choose Your Service</Text>
        <Text style={styles.stepSubtitle}>
          Select the service you'd like to book with {provider?.business_name}
        </Text>
      </FadeInView>

      <SlideUpView delay={100}>
        <View style={styles.servicesContainer}>
          {services.map((service, index) => (
            <Animated.View key={service.id} entering={FadeIn.delay(index * 100)}>
              <TouchableOpacity
                style={[
                  styles.serviceCard,
                  selectedService?.id === service.id && styles.serviceCardSelected,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedService(service);
                  // Trigger price calculation immediately if address is available
                  if (address && city && state && zipCode && customerLat !== null && customerLon !== null) {
                    setLoadingPrice(true);
                    (async () => {
                      try {
                        const response = await fetch(
                          `${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/api/pricing/calculate`,
                          {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              provider_id: providerId,
                              service_id: service.id,
                              customer_latitude: customerLat,
                              customer_longitude: customerLon,
                            }),
                          }
                        );
                        const data = await response.json() as any;
                        if (data.success) {
                          setPricingData(data);
                        }
                      } catch (error) {
                        console.error('[BookingFlow] Immediate pricing error:', error);
                      } finally {
                        setLoadingPrice(false);
                      }
                    })();
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.serviceCardContent}>
                  <View style={styles.serviceHeader}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    {selectedService?.id === service.id && (
                      <Animated.View entering={FadeIn}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                      </Animated.View>
                    )}
                  </View>
                  {service.description && (
                    <Text style={styles.serviceDescription} numberOfLines={2}>
                      {service.description}
                    </Text>
                  )}
                  <View style={styles.serviceFooter}>
                    <View style={styles.priceTag}>
                      <Text style={styles.priceFrom}>From</Text>
                      {selectedService?.id === service.id && pricingData && pricingData.pricing?.total_cents ? (
                        <Text style={styles.servicePrice}>
                          ${ (pricingData.pricing.total_cents / 100).toFixed(2) }
                        </Text>
                      ) : (
                        <Text style={styles.servicePrice}>${(service.basePrice / 100).toFixed(2)}</Text>
                      )}
                    </View>
                    <View style={styles.durationTag}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.serviceDuration}>{service.duration} min</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </SlideUpView>
    </Animated.View>
  );

  // Step 2: Date & Time Selection
  const renderDateTimeSelection = () => (
    <Animated.View style={contentAnimatedStyle}>
      <FadeInView delay={0}>
        <Text style={styles.stepTitle}>Pick Date & Time</Text>
        <Text style={styles.stepSubtitle}>
          When would you like your appointment?
        </Text>
      </FadeInView>

      <SlideUpView delay={100}>
        <View style={styles.calendarContainer}>
          <Calendar
            minDate={new Date().toISOString().split('T')[0]}
            maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
            onDayPress={(day: any) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedDate(new Date(day.dateString));
            }}
            markedDates={{
              [selectedDate.toISOString().split('T')[0]]: {
                selected: true,
                selectedColor: colors.primary,
              },
            }}
            theme={{
              backgroundColor: colors.white,
              calendarBackground: colors.white,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: colors.black,
              todayTextColor: colors.primary,
              dayTextColor: colors.text,
              arrowColor: colors.primary,
              monthTextColor: colors.text,
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '500',
            }}
            style={styles.calendar}
          />
        </View>
      </SlideUpView>

      <SlideUpView delay={150}>
        <Text style={styles.timeLabel}>Select Time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
          {generateTimeSlots().map((time) => (
            <TouchableOpacity
              key={time}
              style={[
                styles.timeChip,
                selectedTime === time && styles.timeChipSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedTime(time);
              }}
            >
              <Text style={[
                styles.timeChipText,
                selectedTime === time && styles.timeChipTextSelected,
              ]}>
                {time}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SlideUpView>

      {selectedTime && (
        <SlideUpView delay={200}>
          <View style={styles.selectedDateTime}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text style={styles.selectedDateTimeText}>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })} at {selectedTime}
            </Text>
          </View>
        </SlideUpView>
      )}
    </Animated.View>
  );

  // Step 3: Location
  const renderLocation = () => (
    <Animated.View style={contentAnimatedStyle}>
      <FadeInView delay={0}>
        <Text style={styles.stepTitle}>Service Location</Text>
        <Text style={styles.stepSubtitle}>
          Where should the provider come to you?
        </Text>
      </FadeInView>

      <SlideUpView delay={100}>
        <TouchableOpacity style={styles.locationAutoButton} onPress={handleUseCurrentLocation}>
          <LinearGradient
            colors={[colors.primary, '#FF69B4']}
            style={styles.locationAutoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loadingLocation ? (
              <ActivityIndicator color={colors.black} size="small" />
            ) : (
              <>
                <Ionicons name="navigate" size={20} color={colors.black} />
                <Text style={styles.locationAutoText}>Use My Current Location</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </SlideUpView>

      <SlideUpView delay={150}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Street Address</Text>
          <TextInput
            style={styles.textInput}
            placeholder="123 Main Street"
            placeholderTextColor={colors.textLight}
            value={address}
            onChangeText={setAddress}
          />
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
            <Text style={styles.inputLabel}>City</Text>
            <TextInput
              style={styles.textInput}
              placeholder="City"
              placeholderTextColor={colors.textLight}
              value={city}
              onChangeText={setCity}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>State</Text>
            <TextInput
              style={styles.textInput}
              placeholder="State"
              placeholderTextColor={colors.textLight}
              value={state}
              onChangeText={setState}
            />
          </View>
        </View>

        <View style={[styles.inputGroup, { width: 150 }]}>
          <Text style={styles.inputLabel}>ZIP Code</Text>
          <TextInput
            style={styles.textInput}
            placeholder="12345"
            placeholderTextColor={colors.textLight}
            value={zipCode}
            onChangeText={setZipCode}
            keyboardType="numeric"
          />
        </View>
      </SlideUpView>
    </Animated.View>
  );

  // Step 4: Review & Payment
  const renderReviewPayment = () => (
    <Animated.View style={contentAnimatedStyle}>
      <FadeInView delay={0}>
        <Text style={styles.stepTitle}>Review & Pay</Text>
        <Text style={styles.stepSubtitle}>
          Confirm your booking details
        </Text>
      </FadeInView>

      <SlideUpView delay={100}>
        {/* Booking Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.providerAvatar}>
              {provider?.avatar_url ? (
                <CachedAvatarImage uri={provider.avatar_url} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={24} color={colors.textSecondary} />
              )}
            </View>
            <View>
              <Text style={styles.providerName}>{provider?.business_name}</Text>
              <Text style={styles.serviceSummary}>{selectedService?.name}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={styles.summaryItemText}>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={styles.summaryItemText}>{selectedTime}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="hourglass-outline" size={20} color={colors.primary} />
              <Text style={styles.summaryItemText}>{selectedService?.duration} min</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.locationSummary}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={styles.locationText}>
              {address}, {city}, {state} {zipCode}
            </Text>
          </View>
        </View>
      </SlideUpView>

      <SlideUpView delay={150}>
        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            placeholder="Any special requests or notes..."
            placeholderTextColor={colors.textLight}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>
      </SlideUpView>

      <SlideUpView delay={200}>
        {!verificationLoading && !paymentMethodVerified && (
          <PaymentVerificationPrompt
            containerStyle={{ marginBottom: spacing.md }}
            onPress={() => navigation.navigate('PaymentMethods')}
          />
        )}

        {/* Price Breakdown */}
        <View style={styles.priceCard}>
          <Text style={styles.priceCardTitle}>Price Breakdown</Text>

          {loadingPrice ? (
            <View style={styles.priceLoading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.priceLoadingText}>Calculating...</Text>
            </View>
          ) : pricingData ? (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Service</Text>
                <Text style={styles.priceValue}>
                  ${((pricingData.pricing?.base_price_cents || 0) / 100).toFixed(2)}
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Platform Fee (20%)</Text>
                <Text style={styles.priceValue}>
                  ${((pricingData.pricing?.platform_fee_cents || 0) / 100).toFixed(2)}
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  Travel Fee ({pricingData.distance_tier})
                </Text>
                <Text style={styles.priceValue}>
                  {pricingData.pricing?.travel_fee_cents === 0
                    ? 'Free'
                    : `$${((pricingData.pricing?.travel_fee_cents || 0) / 100).toFixed(2)}`}
                </Text>
              </View>
              <View style={styles.priceRowSubtle}>
                <Text style={styles.priceLabelSubtle}>Distance</Text>
                <Text style={styles.priceValueSubtle}>{pricingData.distance_miles?.toFixed(1)} mi</Text>
              </View>
              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  ${((pricingData.pricing?.total_cents || 0) / 100).toFixed(2)}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Base Price</Text>
              <Text style={styles.priceValue}>${((selectedService?.basePrice || 0) / 100).toFixed(2)}</Text>
            </View>
          )}
        </View>

        {/* Special Request Warning */}
        {pricingData?.requires_special_request && (
          <View style={styles.warningBanner}>
            <Ionicons name="information-circle" size={24} color="#FF9800" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Special Request</Text>
              <Text style={styles.warningText}>
                You're over 15 miles away. The provider will review and provide a quote.
              </Text>
            </View>
          </View>
        )}

        {/* Out of Range Error */}
        {pricingData && !pricingData.within_range && !pricingData.accepts_over_25km && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={24} color={colors.error} />
            <View style={styles.warningContent}>
              <Text style={styles.errorTitle}>Out of Service Area</Text>
              <Text style={styles.errorText}>
                This provider doesn't serve your location.
              </Text>
            </View>
          </View>
        )}
      </SlideUpView>
    </Animated.View>
  );

  // Success screen
  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <Animated.View entering={FadeIn.delay(100)} style={styles.successContent}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color={colors.primary} />
        </View>
        <Text style={styles.successTitle}>Booking Confirmed! 🎉</Text>
        <Text style={styles.successSubtitle}>
          Your appointment with {provider?.business_name} has been scheduled.
        </Text>

        <View style={styles.successDetails}>
          <View style={styles.successRow}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text style={styles.successText}>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.successRow}>
            <Ionicons name="time" size={20} color={colors.primary} />
            <Text style={styles.successText}>{selectedTime}</Text>
          </View>
        </View>

        <View style={styles.successButtons}>
          <TouchableOpacity
            style={styles.viewBookingsButton}
            onPress={() => navigation.navigate('CustomerMain', { screen: 'Bookings' })}
          >
            <Text style={styles.viewBookingsText}>View My Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => {
              navigation.navigate('Chat', {
                bookingId,
                otherUserId: providerId,
                otherUserName: provider?.business_name,
              });
            }}
          >
            <Ionicons name="chatbubble" size={20} color={colors.primary} />
            <Text style={styles.messageButtonText}>Message Provider</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Success state
  if (showSuccess) {
    return renderSuccess();
  }

  // Main render
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goToPrevStep}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{STEPS[currentStep - 1].title}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {currentStep === 1 && renderServiceSelection()}
          {currentStep === 2 && renderDateTimeSelection()}
          {currentStep === 3 && renderLocation()}
          {currentStep === 4 && renderReviewPayment()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <View style={styles.stepCounter}>
          <Text style={styles.stepCounterText}>Step {currentStep} of 4</Text>
        </View>

        {currentStep < 4 ? (
          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
            onPress={goToNextStep}
            disabled={!canProceed()}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.black} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.payButton,
              (!canProceed() || submitting) && styles.payButtonDisabled,
            ]}
            onPress={handleSubmitBooking}
            disabled={!canProceed() || submitting}
          >
            {submitting ? (
              <View style={styles.payButtonLoading}>
                <ActivityIndicator color={colors.black} size="small" />
                <Text style={styles.payButtonText}>
                  {paymentProcessing ? 'Processing...' : 'Booking...'}
                </Text>
              </View>
            ) : (
              <>
                <Ionicons name="lock-closed" size={18} color={colors.black} />
                <Text style={styles.payButtonText}>
                  Pay ${((pricingData?.pricing?.total_cents || selectedService?.basePrice || 0) / 100).toFixed(2)}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
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
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.sm,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepDotCurrent: {
    transform: [{ scale: 1.1 }],
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  stepLine: {
    width: 30,
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  stepTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  // Service cards
  servicesContainer: {
    gap: spacing.md,
  },
  serviceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  serviceCardContent: {
    gap: spacing.sm,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  serviceDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  priceFrom: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  servicePrice: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  durationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  serviceDuration: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  // Calendar
  calendarContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  calendar: {
    borderRadius: borderRadius.xl,
  },
  timeLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  timeScroll: {
    marginBottom: spacing.lg,
  },
  timeChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeChipText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  timeChipTextSelected: {
    color: colors.black,
  },
  selectedDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  selectedDateTimeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  // Location
  locationAutoButton: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  locationAutoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  locationAutoText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.black,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
  },
  textInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Summary
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  providerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  providerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  serviceSummary: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryItemText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  locationSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  locationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  // Price card
  priceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceCardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  priceLoading: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  priceLoadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  priceLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  priceRowSubtle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  priceLabelSubtle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  priceValueSubtle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  // Warning/error banners
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: '#F57C00',
    marginBottom: spacing.xs,
  },
  warningText: {
    fontSize: fontSize.sm,
    color: '#F57C00',
  },
  errorBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  // Bottom navigation
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stepCounter: {
    flex: 1,
  },
  stepCounterText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.round,
    gap: spacing.sm,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.black,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.round,
    gap: spacing.sm,
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  payButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.black,
  },
  // Success screen
  successContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  successContent: {
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  successDetails: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  successText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  successButtons: {
    width: '100%',
    gap: spacing.md,
  },
  viewBookingsButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.round,
    alignItems: 'center',
  },
  viewBookingsText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.black,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.round,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  messageButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});

