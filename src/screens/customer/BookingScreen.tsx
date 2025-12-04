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
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { analytics } from '../../services/analytics';
import BookingConfirmationModal from '../../components/BookingConfirmationModal';
import { getCurrentLocation, reverseGeocode } from '../../services/location';
import { useStripe } from '@stripe/stripe-react-native';

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number; // Starting price (0-10km) in dollars for display
  price_0_10km: number; // Price in cents
  price_11_15km: number; // Price in cents
  price_16_25km: number; // Price in cents
  accepts_over_25km: boolean;
  duration: number;
  provider_service_id: string; // ID from provider_services table
}

interface ProviderInfo {
  id: string;
  business_name: string;
  avatar_url?: string;
}

export default function BookingScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const providerId = route.params?.providerId;
  const portfolioItemId = route.params?.portfolioItemId;
  const preSelectedServiceId = route.params?.serviceId; // Pre-selected service from tagged post

  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [pricingData, setPricingData] = useState<any>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [isFromTaggedPost, setIsFromTaggedPost] = useState(false); // Track if booking is from tagged post
  const [isProvider, setIsProvider] = useState(false); // Track if user is a provider booking as customer
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Address fields
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    if (providerId) {
      loadBookingData();
    }
    checkIfProvider();
  }, [providerId]);

  // Check if the current user is a provider
  const checkIfProvider = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        const { data: providerProfile } = await supabase
          .from('provider_profiles')
          .select('id')
          .eq('id', profile.id)
          .maybeSingle();

        setIsProvider(!!providerProfile);
      }
    } catch (error) {
      console.log('[Booking] Error checking provider status:', error);
    }
  };

  const loadBookingData = async () => {
    try {
      setLoading(true);

      console.log('[Booking] Loading booking data for provider:', providerId);

      // Get provider info with profile data
      const { data: providerData, error: providerError } = await supabase
        .from('provider_profiles')
        .select(`
          id,
          business_name,
          profiles (
            avatar_url
          )
        `)
        .eq('id', providerId)
        .single();

      if (providerError) {
        console.error('[Booking] Provider fetch error:', providerError);
        throw providerError;
      }

      console.log('[Booking] Provider data:', providerData);

      // Flatten the provider data structure
      const flatProvider = {
        id: providerData.id,
        business_name: providerData.business_name,
        avatar_url: providerData.profiles?.avatar_url,
      };
      setProvider(flatProvider);

      // Get provider services with distance-based pricing
      const { data: servicesData, error: servicesError } = await supabase
        .from('provider_services')
        .select(`
          id,
          duration_minutes,
          price_0_10km,
          price_11_15km,
          price_16_25km,
          accepts_over_25km,
          service:services (
            id,
            name,
            description
          )
        `)
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('price_0_10km');

      if (servicesError) {
        console.error('[Booking] Services fetch error:', servicesError);
        throw servicesError;
      }

      console.log('[Booking] Services data:', servicesData);

      // Transform services data to match expected format
      // Use the lowest price (0-10km) as the starting price
      const transformedServices = servicesData?.map((ps: any) => {
        return {
          id: ps.service.id,
          name: ps.service.name,
          description: ps.service.description,
          price: ps.price_0_10km / 100, // Convert cents to dollars for display
          price_0_10km: ps.price_0_10km,
          price_11_15km: ps.price_11_15km,
          price_16_25km: ps.price_16_25km,
          accepts_over_25km: ps.accepts_over_25km,
          duration: ps.duration_minutes,
          provider_service_id: ps.id, // Store this for booking creation
        };
      }) || [];

      console.log('[Booking] Transformed services:', transformedServices);

      // If coming from a tagged post with a specific service, only show that service
      if (preSelectedServiceId && transformedServices.length > 0) {
        const preSelectedService = transformedServices.find(
          (s) => s.provider_service_id === preSelectedServiceId
        );

        if (preSelectedService) {
          console.log('[Booking] Pre-selecting service from tagged post:', preSelectedService.name);
          // Only show the tagged service, not all services
          setServices([preSelectedService]);
          setSelectedService(preSelectedService);
          setIsFromTaggedPost(true);

          // Track that this booking originated from a tagged post
          analytics.track('booking_from_tagged_post', {
            portfolio_item_id: portfolioItemId,
            provider_id: providerId,
            service_id: preSelectedServiceId,
            service_name: preSelectedService.name,
          }, user?.id);
        } else {
          // Service not found, show all services
          setServices(transformedServices);
        }
      } else {
        // No pre-selected service, show all services
        setServices(transformedServices);
      }

      // Track analytics
      if (portfolioItemId) {
        analytics.trackBookingStart(portfolioItemId, providerId, user?.id);
      }
    } catch (error) {
      console.error('Error loading booking data:', error);
      Alert.alert('Error', 'Failed to load booking information');
    } finally {
      setLoading(false);
    }
  };

  // Calculate pricing when service is selected
  useEffect(() => {
    if (selectedService && providerId && user) {
      calculatePricing();
    }
  }, [selectedService, providerId, user]);

  const calculatePricing = async () => {
    if (!user) return;

    try {
      setLoadingPrice(true);

      // Get customer location
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) return;

      const { data: customerData } = await supabase
        .from('customer_profiles')
        .select('latitude, longitude')
        .eq('id', profileData.id)
        .maybeSingle(); // Use maybeSingle to handle case where customer_profile doesn't exist

      if (!customerData || !customerData?.latitude || !customerData?.longitude) {
        // No location set, just use service price
        setPricingData({
          pricing: {
            service_price_cents: selectedService!.price,
            travel_fee_cents: 0,
            total_cents: selectedService!.price,
          },
          distance_km: 0,
          within_range: true,
        });
        return;
      }

      // Call pricing API
      const response = await fetch('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: providerId,
          service_id: selectedService!.provider_service_id,
          customer_latitude: customerData.latitude,
          customer_longitude: customerData.longitude,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Map new API response to expected format
        setPricingData({
          pricing: {
            total_cents: data.pricing.total_cents,
          },
          distance_km: data.distance_km,
          within_range: data.within_range,
          distance_tier: data.distance_tier,
          requires_special_request: data.requires_special_request,
          accepts_over_25km: data.accepts_over_25km,
        });
      } else {
        // Fallback to 0-10km price
        setPricingData({
          pricing: {
            total_cents: selectedService!.price_0_10km || selectedService!.price * 100,
          },
          distance_km: 0,
          within_range: true,
          distance_tier: '0-10km',
        });
      }
    } catch (error) {
      console.error('Error calculating pricing:', error);
      // Fallback to 0-10km price
      setPricingData({
        pricing: {
          total_cents: selectedService!.price_0_10km || selectedService!.price * 100,
        },
        distance_km: 0,
        within_range: true,
        distance_tier: '0-10km',
      });
    } finally {
      setLoadingPrice(false);
    }
  };

  const handleSubmitBooking = async () => {
    if (!selectedService) {
      Alert.alert('Service Required', 'Please select a service');
      return;
    }

    if (!selectedTime) {
      Alert.alert('Time Required', 'Please select a time');
      return;
    }

    if (!user) {
      Alert.alert('Login Required', 'Please log in to book a service');
      return;
    }

    try {
      setSubmitting(true);
      console.log('[Booking] Starting booking submission...');

      // Get customer profile ID and address
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('[Booking] Profile fetch error:', profileError);
        throw profileError;
      }

      if (!profileData) {
        Alert.alert('Error', 'Profile not found');
        return;
      }

      console.log('[Booking] Profile ID:', profileData.id);

      // Ensure customer_profiles record exists (required for RLS policy)
      const { data: existingCustomerProfile } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('id', profileData.id)
        .maybeSingle();

      if (!existingCustomerProfile) {
        console.log('[Booking] Creating customer_profiles record...');
        const { error: createCustomerError } = await supabase
          .from('customer_profiles')
          .insert({ id: profileData.id });

        if (createCustomerError) {
          console.error('[Booking] Error creating customer profile:', createCustomerError);
          Alert.alert('Error', 'Failed to set up your customer profile. Please try again.');
          return;
        }
        console.log('[Booking] Customer profile created successfully');
      } else {
        console.log('[Booking] Customer profile already exists:', existingCustomerProfile.id);
      }

      // Validate address fields from form
      if (!address || !city || !state || !zipCode) {
        Alert.alert('Address Required', 'Please fill in all address fields');
        return;
      }

      console.log('[Booking] Service address:', { address, city, state, zipCode });

      // Parse date and time
      const bookingDate = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');

      // Format date as YYYY-MM-DD
      const scheduledDate = bookingDate.toISOString().split('T')[0];

      // Format time as HH:MM:SS
      const scheduledTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;

      console.log('[Booking] Scheduled date:', scheduledDate);
      console.log('[Booking] Scheduled time:', scheduledTime);
      console.log('[Booking] Provider service ID:', selectedService.provider_service_id);
      console.log('[Booking] Total price:', selectedService.price);

      // Get provider location
      const { data: providerData } = await supabase
        .from('provider_profiles')
        .select('latitude, longitude')
        .eq('id', providerId)
        .single();

      // Get price based on distance tier
      const totalPrice = pricingData?.pricing?.total_cents || selectedService.price_0_10km;
      const distanceKm = pricingData?.distance_km || null;
      const distanceTier = pricingData?.distance_tier || '0-10km';

      // Create booking with address from form
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_id: profileData.id,
          provider_id: providerId,
          provider_service_id: selectedService.provider_service_id,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
          total_price: totalPrice,
          distance_km: distanceKm,
          distance_tier: distanceTier,
          provider_latitude: providerData?.latitude || null,
          provider_longitude: providerData?.longitude || null,
          address: address,
          city: city,
          state: state,
          zip_code: zipCode,
          status: 'pending',
          notes: notes || null,
        })
        .select()
        .single();

      if (bookingError) {
        console.error('[Booking] Booking creation error:', bookingError);
        throw bookingError;
      }

      console.log('[Booking] Booking created successfully:', bookingData);

      // PAYMENT PROCESSING - Pay at booking
      setPaymentProcessing(true);
      console.log('[Booking] Starting payment processing...');

      // Get session token for API calls
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        console.error('[Booking] Session refresh error:', sessionError);
        // Cancel the booking since payment can't proceed
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingData.id);
        throw new Error('Session expired. Please log in again.');
      }

      // Create payment intent
      console.log('[Booking] Creating payment intent...');
      const paymentResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          bookingId: bookingData.id,
          amount: totalPrice,
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        console.error('[Booking] Payment intent creation failed:', errorData);
        // Cancel the booking since payment failed
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingData.id);
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const { clientSecret, ephemeralKey, customer } = await paymentResponse.json();
      console.log('[Booking] Payment intent created successfully');

      // Initialize Payment Sheet
      console.log('[Booking] Initializing Payment Sheet...');
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: provider?.business_name || 'Glamora',
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          email: user?.email,
          address: {
            line1: address,
            city: city,
            state: state,
            postalCode: zipCode,
            country: 'US',
          },
        },
        allowsDelayedPaymentMethods: false,
      });

      if (initError) {
        console.error('[Booking] Payment Sheet init error:', initError);
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingData.id);
        throw new Error(initError.message);
      }

      // Present Payment Sheet
      console.log('[Booking] Presenting Payment Sheet...');
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        console.error('[Booking] Payment cancelled or failed:', presentError);
        // Cancel the booking since payment was cancelled/failed
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingData.id);

        if (presentError.code === 'Canceled') {
          Alert.alert('Payment Cancelled', 'Your booking has been cancelled. No payment was processed.');
        } else {
          Alert.alert('Payment Failed', presentError.message || 'Payment could not be processed.');
        }
        return;
      }

      // Payment successful - confirm with backend
      console.log('[Booking] Payment successful! Confirming with backend...');
      const paymentIntentId = clientSecret.split('_secret_')[0];

      try {
        const confirmResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/payments/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            paymentIntentId,
            bookingId: bookingData.id,
          }),
        });

        if (!confirmResponse.ok) {
          console.error('[Booking] Payment confirmation failed:', await confirmResponse.text());
          // Payment succeeded, booking should still be confirmed
        } else {
          console.log('[Booking] Payment confirmed on backend');
        }
      } catch (confirmError) {
        console.error('[Booking] Error confirming payment:', confirmError);
        // Payment succeeded, booking should still be confirmed
      }

      // Track analytics with tagged post information
      analytics.track('booking_completed', {
        booking_id: bookingData.id,
        provider_id: providerId,
        service_id: selectedService.id,
        portfolio_item_id: portfolioItemId,
        from_tagged_post: isFromTaggedPost,
        total_price: totalPrice,
        distance_km: distanceKm,
        distance_tier: distanceTier,
        payment_status: 'paid',
      }, user?.id);

      // Track specific event for bookings from tagged posts
      if (isFromTaggedPost) {
        analytics.track('tagged_post_booking_completed', {
          booking_id: bookingData.id,
          portfolio_item_id: portfolioItemId,
          provider_id: providerId,
          service_id: selectedService.provider_service_id,
          service_name: selectedService.name,
          total_price: totalPrice,
        }, user?.id);
      }

      // Store booking ID for messaging
      setBookingId(bookingData.id);

      // Show confirmation modal
      setShowConfirmation(true);
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
      setPaymentProcessing(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const location = await getCurrentLocation();
      if (!location) {
        setLoadingLocation(false);
        return;
      }

      const addressData = await reverseGeocode(location);

      if (addressData) {
        setAddress(addressData.street);
        setCity(addressData.city);
        setState(addressData.state);
        setZipCode(addressData.zipCode);
        Alert.alert('Success', 'Location filled from your current position');
      }
    } catch (error) {
      console.error('Error using current location:', error);
      Alert.alert('Error', 'Failed to get your current location');
    } finally {
      setLoadingLocation(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 17) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading booking options...</Text>
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={styles.errorText}>Provider not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Provider Info */}
        <View style={styles.providerSection}>
          <Text style={styles.providerName}>{provider.business_name}</Text>
          <Text style={styles.sectionSubtitle}>Select a service and time</Text>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Service</Text>
            {isFromTaggedPost && (
              <View style={styles.taggedPostBadge}>
                <Ionicons name="pricetag" size={14} color={colors.primary} />
                <Text style={styles.taggedPostText}>From Post</Text>
              </View>
            )}
          </View>
          {services.length === 0 ? (
            <Text style={styles.emptyText}>No services available</Text>
          ) : (
            services.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  selectedService?.id === service.id && styles.serviceCardSelected,
                  isFromTaggedPost && selectedService?.id === service.id && styles.serviceCardTagged,
                ]}
                onPress={() => setSelectedService(service)}
              >
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  {service.description && (
                    <Text style={styles.serviceDescription}>{service.description}</Text>
                  )}
                  <View style={styles.serviceDetails}>
                    <Text style={styles.servicePrice}>${service.price}</Text>
                    <Text style={styles.serviceDuration}>{service.duration} min</Text>
                  </View>
                </View>
                {selectedService?.id === service.id && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <Calendar
            minDate={new Date().toISOString().split('T')[0]}
            maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
            onDayPress={(day: any) => setSelectedDate(new Date(day.dateString))}
            markedDates={{
              [selectedDate.toISOString().split('T')[0]]: {
                selected: true,
                selectedColor: colors.primary,
              },
            }}
            theme={{
              selectedDayBackgroundColor: colors.primary,
              todayTextColor: colors.primary,
              arrowColor: colors.primary,
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 12,
            }}
          />
          <Text style={styles.selectedDateText}>
            Selected: {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time</Text>
          <View style={styles.timeGrid}>
            {generateTimeSlots().map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeSlot,
                  selectedTime === time && styles.timeSlotSelected,
                ]}
                onPress={() => setSelectedTime(time)}
              >
                <Text
                  style={[
                    styles.timeText,
                    selectedTime === time && styles.timeTextSelected,
                  ]}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Service Location */}
        <View style={styles.section}>
          <View style={styles.locationHeader}>
            <Text style={styles.sectionTitle}>Service Location</Text>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleUseCurrentLocation}
              disabled={loadingLocation}
            >
              {loadingLocation ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.locationButtonText}>📍 Use Current Location</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address *</Text>
            <TextInput
              style={styles.addressInput}
              placeholder="Street address"
              placeholderTextColor={colors.textSecondary}
              value={address}
              onChangeText={setAddress}
            />
          </View>

          <View style={styles.addressRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.inputLabel}>City *</Text>
              <TextInput
                style={styles.addressInput}
                placeholder="City"
                placeholderTextColor={colors.textSecondary}
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>State *</Text>
              <TextInput
                style={styles.addressInput}
                placeholder="State"
                placeholderTextColor={colors.textSecondary}
                value={state}
                onChangeText={setState}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ZIP Code *</Text>
            <TextInput
              style={[styles.addressInput, { width: 120 }]}
              placeholder="ZIP"
              placeholderTextColor={colors.textSecondary}
              value={zipCode}
              onChangeText={setZipCode}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Any special requests or notes..."
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Summary */}
        {selectedService && selectedTime && (
          <View style={[styles.section, styles.summarySection]}>
            <Text style={styles.sectionTitle}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service:</Text>
              <Text style={styles.summaryValue}>{selectedService.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date:</Text>
              <Text style={styles.summaryValue}>
                {selectedDate.toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time:</Text>
              <Text style={styles.summaryValue}>{selectedTime}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration:</Text>
              <Text style={styles.summaryValue}>{selectedService.duration} min</Text>
            </View>

            {/* Price Breakdown */}
            {pricingData && (
              <View style={{ marginTop: spacing.md }}>
                <View style={styles.priceCard}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>📍 Distance</Text>
                    <Text style={styles.priceValue}>{pricingData.distance_km?.toFixed(1) || 0} km</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>📏 Distance Tier</Text>
                    <Text style={styles.priceValue}>{pricingData.distance_tier || '0-10km'}</Text>
                  </View>
                  <View style={[styles.priceRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      ${((pricingData.pricing?.total_cents || 0) / 100).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Special Request Warning for 25+ km */}
                {pricingData.requires_special_request && (
                  <View style={styles.specialRequestBanner}>
                    <Text style={styles.specialRequestIcon}>📍</Text>
                    <View style={styles.specialRequestContent}>
                      <Text style={styles.specialRequestTitle}>Special Request Required</Text>
                      <Text style={styles.specialRequestText}>
                        You're over 25km away. The provider will review your request and provide a custom quote.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Out of Range Warning */}
                {!pricingData.within_range && !pricingData.accepts_over_25km && (
                  <View style={styles.outOfRangeBanner}>
                    <Text style={styles.outOfRangeIcon}>⚠️</Text>
                    <View style={styles.outOfRangeContent}>
                      <Text style={styles.outOfRangeTitle}>Out of Service Area</Text>
                      <Text style={styles.outOfRangeText}>
                        This provider doesn't serve your location. Try a different provider.
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {loadingPrice && (
              <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
                  Calculating price...
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Book Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.bookButton,
            (!selectedService || !selectedTime || !address || !city || !state || !zipCode || submitting || (pricingData && !pricingData.within_range && !pricingData.accepts_over_25km)) && styles.bookButtonDisabled,
          ]}
          onPress={handleSubmitBooking}
          disabled={!selectedService || !selectedTime || !address || !city || !state || !zipCode || submitting || (pricingData && !pricingData.within_range && !pricingData.accepts_over_25km)}
        >
          {submitting ? (
            <View style={styles.buttonLoadingContainer}>
              <ActivityIndicator color={colors.black} />
              <Text style={styles.buttonLoadingText}>
                {paymentProcessing ? 'Processing Payment...' : 'Creating Booking...'}
              </Text>
            </View>
          ) : pricingData?.requires_special_request ? (
            <Text style={styles.bookButtonText}>Request Quote & Book</Text>
          ) : (
            <Text style={styles.bookButtonText}>Pay & Book Now</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Booking Confirmation Modal */}
      <BookingConfirmationModal
        visible={showConfirmation}
        providerName={provider?.business_name || 'the provider'}
        onViewBookings={() => {
          setShowConfirmation(false);
          if (isProvider) {
            navigation.navigate('MyCustomerBookings');
          } else {
            navigation.navigate('CustomerMain', { screen: 'Bookings' });
          }
        }}
        onMessageProvider={bookingId && providerId ? () => {
          setShowConfirmation(false);
          navigation.navigate('Chat' as never, {
            bookingId,
            otherUserId: providerId,
            otherUserName: provider?.business_name || 'Provider',
          } as never);
        } : undefined}
        onClose={() => {
          setShowConfirmation(false);
          navigation.goBack();
        }}
        viewBookingsLabel={isProvider ? 'View My Bookings' : 'View Bookings'}
        bookingsHint={isProvider ? '📍 Find your bookings in Profile → My Bookings' : undefined}
      />
    </KeyboardAvoidingView>
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
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  backButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
  },
  backButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  providerSection: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  providerName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  taggedPostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    gap: 4,
  },
  taggedPostText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  serviceCardSelected: {
    borderColor: colors.primaryDarker,
    backgroundColor: colors.primaryDarker + '15',
  },
  serviceCardTagged: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  serviceDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  servicePrice: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  serviceDuration: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  dateText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeSlot: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 80,
    alignItems: 'center',
  },
  timeSlotSelected: {
    backgroundColor: colors.primaryDarker,
    borderColor: colors.primaryDarker,
  },
  timeText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  timeTextSelected: {
    color: colors.black,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 100,
  },
  summarySection: {
    backgroundColor: colors.primarySubtle,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  totalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.md,
  },
  bookButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.round,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: colors.border,
  },
  bookButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.black,
  },
  buttonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonLoadingText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.black,
  },
  selectedDateText: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.sm,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  locationButton: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  locationButtonText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  addressInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  addressRow: {
    flexDirection: 'row',
  },
  // Price breakdown styles
  priceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
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
  // Special request banner
  specialRequestBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  specialRequestIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  specialRequestContent: {
    flex: 1,
  },
  specialRequestTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#E65100',
    marginBottom: spacing.xs,
  },
  specialRequestText: {
    fontSize: fontSize.sm,
    color: '#BF360C',
  },
  // Out of range banner
  outOfRangeBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#EF5350',
  },
  outOfRangeIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  outOfRangeContent: {
    flex: 1,
  },
  outOfRangeTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#C62828',
    marginBottom: spacing.xs,
  },
  outOfRangeText: {
    fontSize: fontSize.sm,
    color: '#B71C1C',
  },
});

