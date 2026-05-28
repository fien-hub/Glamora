import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
let Calendar: any = View;
try { Calendar = require('react-native-calendars').Calendar; } catch (e) { console.warn('[BookingModal] react-native-calendars unavailable:', e); }
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { purchaseBookingProduct, verifyRevenueCatBookingPayment } from '../services/revenuecat';
import { trackMetaInitiatedCheckout } from '../services/metaAds';
import { getCurrentLocation } from '../services/location';
import {
  checkProviderAvailability,
  getAvailableTimeSlots,
  formatTimeSlot,
  TimeSlot
} from '../services/availability';
import { createBookingCalendarEvent, promptAddToCalendar } from '../utils/calendar';
import { trackBookingCreated, trackPaymentSuccess, trackPaymentFailed, trackRecurringBookingCreated } from '../utils/analytics';
import { trackBookingError, trackPaymentError, trackUserAction } from '../utils/errorTracking';
import { scheduleLocalNotification, sendRemotePushToProfile } from '../utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RecurringFrequency,
  RecurringEndType,
  RecurringPattern,
  validateRecurringPattern,
  getRecurringDescription,
  calculateRecurringTotalCost,
  formatFrequency,
  generateBookingInstances,
  RecurringBookingInstance,
} from '../utils/recurringBooking';
import BookingConfirmationAnimation from './BookingConfirmationAnimation';

interface BookingModalProps {
  visible: boolean;
  onClose: () => void;
  service: {
    id: string;
    name: string;
    description: string;
    base_duration_minutes: number;
  };
  provider: {
    id: string;
    user_id: string;
    business_name: string;
    price: number;
  };
  onSuccess: (bookingId?: string, providerId?: string, providerName?: string) => void;
}

export default function BookingModal({
  visible,
  onClose,
  service,
  provider,
  onSuccess,
}: BookingModalProps) {
  const { user } = useAuth();
  
  const [step, setStep] = useState<'details' | 'payment' | 'processing'>('details');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [notes, setNotes] = useState('');

  // Pricing state
  const [pricingData, setPricingData] = useState<any>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [paymentSheetReady, setPaymentSheetReady] = useState(false);

  const [loadingLocation, setLoadingLocation] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [showTimeSlots, setShowTimeSlots] = useState(false);

  // Recurring booking state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('weekly');
  const [recurringEndType, setRecurringEndType] = useState<RecurringEndType>('after_occurrences');
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [recurringOccurrences, setRecurringOccurrences] = useState('4');
  const [showEndDateCalendar, setShowEndDateCalendar] = useState(false);

  // Confirmation animation state
  const [showConfirmation, setShowConfirmation] = useState(false);


  // Load blocked dates when modal opens
  useEffect(() => {
    if (visible && provider.id) {
      loadBlockedDates();
      // Track user action
      trackUserAction('booking_modal_opened', {
        providerId: provider.id,
        serviceId: service.id,
        serviceName: service.name,
      });
    }
  }, [visible, provider.id]);

  // Load available time slots when date changes
  useEffect(() => {
    if (date && provider.id) {
      loadAvailableTimeSlots();
    }
  }, [date, provider.id]);

  // Calculate pricing when address or provider changes
  useEffect(() => {
    if (provider && service && address && city && state && zipCode) {
      calculatePricing();
    }
  }, [provider, service, address, city, state, zipCode]);

  // Calculate pricing (travel fee + base price)
  const calculatePricing = async () => {
    setLoadingPrice(true);
    try {
      // Compose address string
      const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;
      // Call pricing API (replace with your backend endpoint)
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/api/pricing/calculate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider_id: provider.id,
            service_id: service.id,
            customer_address: fullAddress,
          }),
        }
      );
      const data: any = await response.json();
      if (data.success) {
        setPricingData(data.data);
      } else {
        setPricingData(null);
      }
    } catch (error) {
      setPricingData(null);
    } finally {
      setLoadingPrice(false);
    }
  };

  const loadBlockedDates = async () => {
    try {
      // Get provider's time off dates
      const { data: timeOffData } = await supabase
        .from('provider_time_off')
        .select('start_date, end_date')
        .eq('provider_id', provider.id);

      if (timeOffData) {
        const blocked: string[] = [];
        timeOffData.forEach((timeOff) => {
          const start = new Date(timeOff.start_date);
          const end = new Date(timeOff.end_date);

          // Add all dates in the range
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            blocked.push(d.toISOString().split('T')[0]);
          }
        });
        setBlockedDates(blocked);
      }
    } catch (error) {
      console.error('Error loading blocked dates:', error);
    }
  };

  const loadAvailableTimeSlots = async () => {
    setLoadingSlots(true);
    try {
      const slots = await getAvailableTimeSlots(
        provider.id,
        date,
        service.base_duration_minutes
      );
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading time slots:', error);
      Alert.alert('Error', 'Failed to load available time slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const getNoSlotsMessage = () => {
    if (!date) return '';

    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];

    // Check if it's a weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return `${provider.business_name} doesn't work on ${dayName}s. Please select a weekday.`;
    }

    // Check if it's in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return 'Cannot book appointments in the past. Please select a future date.';
    }

    // Generic message for other cases
    return `${provider.business_name} has no available time slots on this ${dayName}. They may be fully booked or not working on this date.`;
  };

  const handleUseCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const location = await getCurrentLocation();
      if (!location) {
        setLoadingLocation(false);
        return;
      }

      // Reverse geocode to get address
      const { reverseGeocode } = await import('../services/location');
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

  const handleBookingDetailsSubmit = () => {
    if (!date || !time || !address || !city || !state || !zipCode) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    // Validate date is in the future
    const selectedDate = new Date(date);
    if (selectedDate < new Date()) {
      Alert.alert('Invalid Date', 'Please select a future date');
      return;
    }

    // Validate recurring booking if enabled
    if (isRecurring) {
      const pattern: RecurringPattern = {
        frequency: recurringFrequency,
        interval: 1,
        startDate: date,
        startTime: time,
        endType: recurringEndType,
        endDate: recurringEndDate || undefined,
        maxOccurrences: recurringOccurrences ? parseInt(recurringOccurrences) : undefined,
      };

      const validation = validateRecurringPattern(pattern);
      if (!validation.isValid) {
        Alert.alert('Invalid Recurring Pattern', validation.error);
        return;
      }
    }

    setStep('payment');
  };

  const handlePayment = async () => {
    setStep('processing');
    let bookingData: any = null;
    // Track reserved booking IDs so we can roll back if payment fails
    let pendingBookingIds: string[] = [];
    let recurringBookingId: string | null = null;
    // Becomes true the moment we call purchaseBookingProduct so we know
    // whether the user may have been charged when deciding whether to clean up.
    let paymentAttempted = false;

    try {
      // Get customer profile ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profileError || !profileData) {
        throw new Error('Customer profile not found');
      }

      const customerProfileId = profileData.id;

      // Get the correct provider_service_id
      console.log('[Booking] Looking up provider_service_id with:', {
        provider_id: provider.id,
        service_id: service.id,
      });

      const { data: providerServiceData, error: providerServiceError } = await supabase
        .from('provider_services')
        .select('id, base_price')
        .eq('provider_id', provider.id)
        .eq('service_id', service.id)
        .eq('is_active', true)
        .single();

      console.log('[Booking] Provider service lookup result:', {
        data: providerServiceData,
        error: providerServiceError,
      });

      if (providerServiceError || !providerServiceData) {
        console.error('Provider service lookup error:', providerServiceError);
        throw new Error('Service not available from this provider');
      }

      const providerServiceId = providerServiceData.id;
      console.log('[Booking] Using provider_service_id:', providerServiceId);

      // Resolve the authoritative price from the DB. If it changed since the customer
      // opened this screen, show a confirmation before proceeding — no slot reserved yet.
      const livePrice: number = await new Promise((resolve, reject) => {
        if (providerServiceData.base_price === provider.price) {
          resolve(provider.price);
          return;
        }
        const oldDisplay = (provider.price / 100).toFixed(2);
        const newDisplay = (providerServiceData.base_price / 100).toFixed(2);
        Alert.alert(
          'Price Has Changed',
          `The price for this service changed from $${oldDisplay} to $${newDisplay} while you were booking. Would you like to continue at the updated price?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => reject(new Error('PRICE_CHANGED_CANCELLED')) },
            { text: `Continue at $${newDisplay}`, onPress: () => resolve(providerServiceData.base_price) },
          ]
        );
      });

      // Re-check availability immediately before reserving the slot
      const availabilityCheck = await checkProviderAvailability(
        provider.id,
        date,
        time,
        service.base_duration_minutes
      );
      if (!availabilityCheck.isAvailable) {
        throw new Error(`SLOT_TAKEN: ${availabilityCheck.reason ?? 'This time slot is no longer available'}`);
      }

      // STEP 1: Reserve the slot BEFORE charging by inserting pending booking(s).
      // The DB exclusion constraint prevents any other booking from taking the same slot
      // from this point on, regardless of concurrent requests.
      if (isRecurring) {
        // Create recurring booking record
        const { data: recurringData, error: recurringError } = await supabase
          .from('recurring_bookings')
          .insert({
            customer_id: customerProfileId,
            provider_id: provider.id,
            provider_service_id: providerServiceId,
            frequency: recurringFrequency,
            interval: 1,
            start_date: date,
            start_time: time,
            end_type: recurringEndType,
            end_date: recurringEndDate || null,
            max_occurrences: recurringOccurrences ? parseInt(recurringOccurrences) : null,
            total_price: livePrice,
            address: address,
            city: city,
            state: state,
            zip_code: zipCode,
            notes: notes || null,
            is_active: true,
          })
          .select()
          .single();

        if (recurringError) throw recurringError;
        recurringBookingId = recurringData.id;

        const pattern: RecurringPattern = {
          frequency: recurringFrequency,
          interval: 1,
          startDate: date,
          startTime: time,
          endType: recurringEndType,
          endDate: recurringEndDate || undefined,
          maxOccurrences: recurringOccurrences ? parseInt(recurringOccurrences) : undefined,
        };

        const instances = generateBookingInstances(pattern);
        const bookingInstances = instances.map((instance: RecurringBookingInstance) => ({
          customer_id: customerProfileId,
          provider_id: provider.id,
          provider_service_id: providerServiceId,
          scheduled_date: instance.date,
          scheduled_time: instance.time,
          status: 'pending',
          total_price: livePrice,
          address: address,
          city: city,
          state: state,
          zip_code: zipCode,
          notes: notes || null,
          payment_status: 'pending',
          recurring_booking_id: recurringBookingId,
          instance_number: instance.instanceNumber,
          is_recurring_instance: true,
        }));

        const { data: instancesData, error: instancesError } = await supabase
          .from('bookings')
          .insert(bookingInstances)
          .select();

        if (instancesError) throw instancesError;
        pendingBookingIds = instancesData.map((b: any) => b.id);
        bookingData = instancesData[0];
      } else {
        const { data: singleBookingData, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            customer_id: customerProfileId,
            provider_id: provider.id,
            provider_service_id: providerServiceId,
            scheduled_date: date,
            scheduled_time: time,
            status: 'pending',
            total_price: livePrice,
            address: address,
            city: city,
            state: state,
            zip_code: zipCode,
            notes: notes || null,
            payment_status: 'pending',
            is_recurring_instance: false,
          })
          .select()
          .single();

        if (bookingError) throw bookingError;
        bookingData = singleBookingData;
        pendingBookingIds = [singleBookingData.id];
      }

      // STEP 2: Slot is reserved — now process payment
      console.log('[Booking] Slot reserved, processing payment...');
      void trackMetaInitiatedCheckout(livePrice / 100, {
        providerId: provider.id,
        serviceId: providerServiceId,
        source: 'booking_modal',
      });

      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        console.error('[Booking] Session refresh error:', sessionError);
        throw new Error('Session expired. Please log in again.');
      }

      console.log('[Booking] Session refreshed, creating RevenueCat purchase...');
      paymentAttempted = true;
      const purchasePayload = await purchaseBookingProduct(session.user.id);
      const verification = (await verifyRevenueCatBookingPayment(
        session.access_token,
        purchasePayload
      )) as { success?: boolean; paymentReference?: string };

      if (!verification?.success) {
        throw new Error('Payment verification failed');
      }

      // STEP 3: Payment confirmed — mark booking(s) as paid and confirmed.
      //
      // IMPORTANT: payment_status is updated FIRST (with retries) so that even if
      // the subsequent status='confirmed' write fails, the stale-pending cron job
      // will not delete a paid booking (it only deletes rows where BOTH
      // payment_status AND status are still 'pending').
      const paymentRef = verification?.paymentReference || `rc_${purchasePayload.transactionId}`;

      // Retry helper for the critical payment_status write
      const retryPaidUpdate = async (updateFn: () => Promise<{ error: any }>) => {
        for (let attempt = 0; attempt < 3; attempt++) {
          const { error } = await updateFn();
          if (!error) return;
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          else throw new Error(`PAID_BUT_DB_FAILED:${paymentRef}`);
        }
      };

      if (isRecurring && recurringBookingId) {
        // Mark all instances paid first
        await retryPaidUpdate(async () =>
          supabase
            .from('bookings')
            .update({ payment_status: 'paid', payment_intent_id: paymentRef })
            .in('id', pendingBookingIds)
        );
        // Confirm the first instance; subsequent instances stay 'pending' until scheduled
        await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', pendingBookingIds[0]);
      } else {
        // Mark paid first
        await retryPaidUpdate(async () =>
          supabase
            .from('bookings')
            .update({ payment_status: 'paid', payment_intent_id: paymentRef })
            .eq('id', bookingData.id)
        );
        // Then confirm
        await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', bookingData.id);
      }

      console.log('[Booking] Payment confirmed and booking updated successfully!');

      // Send confirmation emails (best-effort — non-fatal)
      const emailBookingId = isRecurring ? pendingBookingIds[0] : bookingData.id;
      supabase.functions
        .invoke('send-booking-email', { body: { bookingId: emailBookingId, type: 'booking_confirmed' } })
        .catch((e: any) => console.warn('[Booking] booking_confirmed email failed:', e));
      supabase.functions
        .invoke('send-booking-email', { body: { bookingId: emailBookingId, type: 'booking_received' } })
        .catch((e: any) => console.warn('[Booking] booking_received email failed:', e));

      // Push notification to provider (best-effort)
      sendRemotePushToProfile(
        provider.id,
        'New Booking Confirmed',
        `${service.name} booked for ${date} at ${time}`,
        { type: 'booking', bookingId: emailBookingId },
        'booking'
      ).catch((e: any) => console.warn('[Booking] provider push failed:', e));

      // Schedule a 24h reminder local notification for the customer
      try {
        const appointmentDate = new Date(`${date}T${time}:00`);
        const reminderDate = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);
        if (reminderDate > new Date()) {
          const notifId = await scheduleLocalNotification(
            'Appointment Tomorrow',
            `Your booking with ${provider.business_name} is tomorrow at ${time}. Don't forget!`,
            { bookingId: bookingData.id, type: 'booking' },
            { date: reminderDate } as any
          );
          if (notifId) {
            await AsyncStorage.setItem(`booking_reminder_${bookingData.id}`, notifId);
          }
        }
      } catch (reminderError) {
        // Non-fatal — booking is confirmed regardless
        console.warn('[Booking] Could not schedule reminder:', reminderError);
      }

      // Track successful booking and payment
      if (isRecurring && recurringBookingId) {
        // Calculate total instances and cost for recurring booking
        const pattern: RecurringPattern = {
          frequency: recurringFrequency,
          interval: 1,
          startDate: date,
          startTime: time,
          endType: recurringEndType,
          endDate: recurringEndDate || undefined,
          maxOccurrences: recurringOccurrences ? parseInt(recurringOccurrences) : undefined,
        };
        const { totalInstances, totalCost } = calculateRecurringTotalCost(pattern, provider.price);

        trackRecurringBookingCreated(
          recurringFrequency,
          totalInstances,
          totalCost,
          service.name,
          provider.user_id
        );
      } else {
        trackBookingCreated(service.name, provider.price, provider.user_id);
      }
      trackPaymentSuccess(provider.price, bookingData.id);

      // 4. Success! Prompt to add to calendar
      promptAddToCalendar(
        async () => {
          // User wants to add to calendar
          const calendarResult = await createBookingCalendarEvent({
            serviceName: service.name,
            providerName: provider.business_name,
            scheduledDate: date,
            scheduledTime: time,
            duration: service.base_duration_minutes,
            address: address,
            city: city,
            state: state,
            notes: notes,
          });

          if (calendarResult.success && calendarResult.eventId) {
            // Save calendar event ID to booking
            await supabase
              .from('bookings')
              .update({ customer_calendar_event_id: calendarResult.eventId })
              .eq('id', bookingData.id);

            const message = isRecurring
              ? `Your recurring booking with ${provider.business_name} has been confirmed and added to your calendar.`
              : `Your booking with ${provider.business_name} has been confirmed and added to your calendar.`;

            // Show confirmation animation
            setShowConfirmation(true);
            setTimeout(() => {
              setShowConfirmation(false);
              onSuccess(bookingData.id, provider.id, provider.business_name);
              handleClose();
            }, 2500);
          } else {
            const message = isRecurring
              ? `Your recurring booking with ${provider.business_name} has been confirmed. ${calendarResult.error || 'Could not add to calendar.'}`
              : `Your booking with ${provider.business_name} has been confirmed. ${calendarResult.error || 'Could not add to calendar.'}`;

            // Show confirmation animation
            setShowConfirmation(true);
            setTimeout(() => {
              setShowConfirmation(false);
              onSuccess(bookingData.id, provider.id, provider.business_name);
              handleClose();
            }, 2500);
          }
        },
        () => {
          // User declined calendar sync - still show confirmation animation
          setShowConfirmation(true);
          setTimeout(() => {
            setShowConfirmation(false);
            onSuccess(bookingData.id, provider.id, provider.business_name);
            handleClose();
          }, 2500);
        }
      );
    } catch (error: any) {
      console.error('Booking error:', error);

      // Roll back the pending reservation if the user was definitely not charged.
      // We consider them safe to clean up when payment was never attempted, OR when
      // the error clearly indicates the purchase was cancelled or declined (RevenueCat
      // never finalised a charge in those cases).
      const safeToCleanUp =
        !paymentAttempted ||
        error.message?.includes('canceled') ||
        error.message?.includes('Canceled') ||
        error.message?.includes('cancelled') ||
        error.message?.includes('declined');

      if (safeToCleanUp && pendingBookingIds.length > 0) {
        await supabase.from('bookings').delete().in('id', pendingBookingIds);
        if (recurringBookingId) {
          await supabase.from('recurring_bookings').delete().eq('id', recurringBookingId);
        }
      }

      // Track booking error to Sentry
      trackBookingError(error, {
        bookingId: bookingData?.id,
        providerId: provider.id,
        serviceId: service.id,
        action: 'create',
      });

      let errorMessage = 'Failed to complete booking. Please try again.';
      let errorTitle = 'Booking Failed';

      if (error.message?.includes('PRICE_CHANGED_CANCELLED')) {
        // User saw the price-change prompt and chose not to proceed — no alert needed,
        // no slot was reserved, no payment was attempted.
        setStep('details');
        return;
      } else if (error.message?.includes('SLOT_TAKEN') || error.code === '23P01' || error.message?.includes('bookings_no_overlap') || error.message?.includes('already has a booking')) {
        errorTitle = 'Time Slot Unavailable';
        errorMessage = 'This time slot was just taken by another booking. Please go back and choose a different time. You have not been charged.';
        setStep('details');
      } else if (error.message?.includes('Service not available')) {
        errorMessage = 'This service is not currently available from this provider. Please try a different service.';
      } else if (error.message?.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message?.includes('canceled') || error.message?.includes('Canceled')) {
        errorTitle = 'Payment Canceled';
        errorMessage = 'You canceled the payment. No booking was created. You can try again when ready.';
      } else if (error.message?.includes('declined')) {
        errorTitle = 'Payment Declined';
        errorMessage = 'Your in-app purchase could not be completed. Please try again.';
      } else if (error.message?.startsWith('PAID_BUT_DB_FAILED:')) {
        const ref = error.message.split(':')[1];
        errorTitle = 'Payment Received — Sync Issue';
        errorMessage = `Your payment was accepted but we had trouble confirming your booking. Your appointment is reserved. Please contact support with reference: ${ref}`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(errorTitle, errorMessage);
      setStep('payment');
    }
  };

  const handleClose = () => {
    setStep('details');
    setDate('');
    setTime('');
    setAddress('');
    setCity('');
    setState('');
    setZipCode('');
    setNotes('');
    // Reset recurring booking state
    setIsRecurring(false);
    setRecurringFrequency('weekly');
    setRecurringEndType('after_occurrences');
    setRecurringEndDate('');
    setRecurringOccurrences('4');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === 'details' ? 'Booking Details' : step === 'payment' ? 'Payment' : 'Processing...'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Service Info */}

          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.providerName}>{provider.business_name}</Text>
            {loadingPrice ? (
              <Text style={styles.price}>Calculating price...</Text>
            ) : pricingData && pricingData.pricing && pricingData.pricing.total_cents ? (
              <Text style={styles.price}>
                ${ (pricingData.pricing.total_cents / 100).toFixed(2) }
                <Text style={styles.priceLabel}> (includes travel fee)</Text>
              </Text>
            ) : (
              <Text style={styles.price}>${(provider.price / 100).toFixed(2)}</Text>
            )}
            <Text style={styles.duration}>⏱️ {service.base_duration_minutes} minutes</Text>
          </View>

          {step === 'details' && (
            <View style={styles.form}>
              <Text style={styles.sectionTitle}>Appointment Details</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date *</Text>
                <Calendar
                  minDate={new Date().toISOString().split('T')[0]}
                  maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  onDayPress={(day: any) => setDate(day.dateString)}
                  markedDates={{
                    ...(date ? {
                      [date]: {
                        selected: true,
                        selectedColor: colors.primary,
                      },
                    } : {}),
                    ...blockedDates.reduce((acc, blockedDate) => ({
                      ...acc,
                      [blockedDate]: {
                        disabled: true,
                        disableTouchEvent: true,
                        marked: true,
                        dotColor: colors.error,
                      },
                    }), {}),
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
                {date && (
                  <Text style={styles.selectedDateText}>
                    Selected: {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Time *</Text>
                {date && !loadingSlots && availableSlots.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.timeSlotsContainer}
                  >
                    {availableSlots.map((slot) => (
                      <TouchableOpacity
                        key={slot.time}
                        style={[
                          styles.timeSlot,
                          time === slot.time && styles.timeSlotSelected,
                          !slot.available && styles.timeSlotDisabled,
                        ]}
                        onPress={() => slot.available && setTime(slot.time)}
                        disabled={!slot.available}
                      >
                        <Text
                          style={[
                            styles.timeSlotText,
                            time === slot.time && styles.timeSlotTextSelected,
                            !slot.available && styles.timeSlotTextDisabled,
                          ]}
                        >
                          {formatTimeSlot(slot.time)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : date && loadingSlots ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading available times...</Text>
                  </View>
                ) : date && availableSlots.length === 0 ? (
                  <View style={styles.noSlotsContainer}>
                    <Text style={styles.noSlotsText}>
                      {getNoSlotsMessage()}
                    </Text>
                    <Text style={styles.noSlotsHint}>
                      💡 Try selecting a different date
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.selectDateText}>
                    Please select a date first
                  </Text>
                )}
              </View>

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
                <Text style={styles.label}>Address *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Street address"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>City *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="City"
                    value={city}
                    onChangeText={setCity}
                  />
                </View>

                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>State *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="State"
                    value={state}
                    onChangeText={setState}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>ZIP Code *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ZIP Code"
                  value={zipCode}
                  onChangeText={setZipCode}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Any special requests or notes..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Recurring Booking Section */}
              <View style={styles.recurringSection}>
                <View style={styles.recurringSectionHeader}>
                  <Text style={styles.sectionTitle}>Recurring Booking</Text>
                  <TouchableOpacity
                    style={styles.recurringToggle}
                    onPress={() => setIsRecurring(!isRecurring)}
                  >
                    <View style={[styles.toggleSwitch, isRecurring && styles.toggleSwitchActive]}>
                      <View style={[styles.toggleThumb, isRecurring && styles.toggleThumbActive]} />
                    </View>
                    <Text style={styles.toggleLabel}>{isRecurring ? 'On' : 'Off'}</Text>
                  </TouchableOpacity>
                </View>

                {isRecurring && (
                  <View style={styles.recurringOptions}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Frequency *</Text>
                      <View style={styles.frequencyButtons}>
                        {(['daily', 'weekly', 'bi_weekly', 'monthly'] as RecurringFrequency[]).map((freq) => (
                          <TouchableOpacity
                            key={freq}
                            style={[
                              styles.frequencyButton,
                              recurringFrequency === freq && styles.frequencyButtonActive,
                            ]}
                            onPress={() => setRecurringFrequency(freq)}
                          >
                            <Text
                              style={[
                                styles.frequencyButtonText,
                                recurringFrequency === freq && styles.frequencyButtonTextActive,
                              ]}
                            >
                              {formatFrequency(freq)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Ends *</Text>
                      <View style={styles.endTypeButtons}>
                        <TouchableOpacity
                          style={[
                            styles.endTypeButton,
                            recurringEndType === 'after_occurrences' && styles.endTypeButtonActive,
                          ]}
                          onPress={() => setRecurringEndType('after_occurrences')}
                        >
                          <Text
                            style={[
                              styles.endTypeButtonText,
                              recurringEndType === 'after_occurrences' && styles.endTypeButtonTextActive,
                            ]}
                          >
                            After
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.endTypeButton,
                            recurringEndType === 'on_date' && styles.endTypeButtonActive,
                          ]}
                          onPress={() => setRecurringEndType('on_date')}
                        >
                          <Text
                            style={[
                              styles.endTypeButtonText,
                              recurringEndType === 'on_date' && styles.endTypeButtonTextActive,
                            ]}
                          >
                            On Date
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.endTypeButton,
                            recurringEndType === 'never' && styles.endTypeButtonActive,
                          ]}
                          onPress={() => setRecurringEndType('never')}
                        >
                          <Text
                            style={[
                              styles.endTypeButtonText,
                              recurringEndType === 'never' && styles.endTypeButtonTextActive,
                            ]}
                          >
                            Never
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {recurringEndType === 'after_occurrences' && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Number of Occurrences *</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g., 4"
                          value={recurringOccurrences}
                          onChangeText={setRecurringOccurrences}
                          keyboardType="numeric"
                        />
                      </View>
                    )}

                    {recurringEndType === 'on_date' && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>End Date *</Text>
                        {!showEndDateCalendar ? (
                          <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowEndDateCalendar(true)}
                          >
                            <Text style={recurringEndDate ? styles.dateButtonText : styles.dateButtonPlaceholder}>
                              {recurringEndDate
                                ? new Date(recurringEndDate).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : 'Select end date'}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <>
                            <Calendar
                              minDate={date || new Date().toISOString().split('T')[0]}
                              maxDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                              onDayPress={(day: any) => {
                                setRecurringEndDate(day.dateString);
                                setShowEndDateCalendar(false);
                              }}
                              markedDates={{
                                ...(recurringEndDate ? {
                                  [recurringEndDate]: {
                                    selected: true,
                                    selectedColor: colors.secondary,
                                  },
                                } : {}),
                              }}
                              theme={{
                                selectedDayBackgroundColor: colors.secondary,
                                todayTextColor: colors.primary,
                                arrowColor: colors.primary,
                                textDayFontSize: 14,
                                textMonthFontSize: 16,
                                textDayHeaderFontSize: 12,
                              }}
                            />
                            <TouchableOpacity
                              style={styles.cancelButton}
                              onPress={() => setShowEndDateCalendar(false)}
                            >
                              <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}

                    {isRecurring && date && time && (
                      <View style={styles.recurringPreview}>
                        <Text style={styles.recurringPreviewTitle}>📅 Recurring Schedule:</Text>
                        <Text style={styles.recurringPreviewText}>
                          {getRecurringDescription({
                            frequency: recurringFrequency,
                            interval: 1,
                            startDate: date,
                            startTime: time,
                            endType: recurringEndType,
                            endDate: recurringEndDate || undefined,
                            maxOccurrences: recurringOccurrences ? parseInt(recurringOccurrences) : undefined,
                          })}
                        </Text>
                        {recurringEndType !== 'never' && (
                          <Text style={styles.recurringCostText}>
                            Total: ${((provider.price / 100) * calculateRecurringTotalCost({
                              frequency: recurringFrequency,
                              interval: 1,
                              startDate: date,
                              startTime: time,
                              endType: recurringEndType,
                              endDate: recurringEndDate || undefined,
                              maxOccurrences: recurringOccurrences ? parseInt(recurringOccurrences) : undefined,
                            }, provider.price).totalInstances).toFixed(2)} for {calculateRecurringTotalCost({
                              frequency: recurringFrequency,
                              interval: 1,
                              startDate: date,
                              startTime: time,
                              endType: recurringEndType,
                              endDate: recurringEndDate || undefined,
                              maxOccurrences: recurringOccurrences ? parseInt(recurringOccurrences) : undefined,
                            }, provider.price).totalInstances} bookings
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleBookingDetailsSubmit}
              >
                <Text style={styles.continueButtonText}>Continue to Payment</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'payment' && (
            <View style={styles.form}>
              <Text style={styles.sectionTitle}>Payment</Text>

              <View style={styles.testCardInfo}>
                <Text style={styles.testCardTitle}>💳 Secure Payment</Text>
                <Text style={styles.testCardText}>
                  You'll be prompted to complete your in-app purchase securely on the next screen.
                </Text>
              </View>


              <TouchableOpacity
                style={styles.payButton}
                onPress={handlePayment}
                disabled={loadingPrice}
              >
                <Text style={styles.payButtonText}>
                  {loadingPrice
                    ? 'Calculating...'
                    : pricingData && pricingData.pricing && pricingData.pricing.total_cents
                      ? `Pay $${(pricingData.pricing.total_cents / 100).toFixed(2)}`
                      : `Pay $${(provider.price / 100).toFixed(2)}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep('details')}
              >
                <Text style={styles.backButtonText}>← Back to Details</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'processing' && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.processingText}>Processing your booking...</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Booking Confirmation Animation */}
      <BookingConfirmationAnimation
        visible={showConfirmation}
        onComplete={() => setShowConfirmation(false)}
      />
    </Modal>
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
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: fontSize.xl,
    color: colors.text,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  serviceInfo: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  serviceName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  providerName: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  price: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  priceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.regular,
  },
  duration: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  form: {
    backgroundColor: colors.white,
    padding: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
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
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
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
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex1: {
    flex: 1,
  },
  continueButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  continueButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  cardFieldContainer: {
    marginBottom: spacing.md,
  },
  cardFieldWrapper: {
    height: 50,
  },
  cardField: {
    backgroundColor: colors.white,
  },
  cardStatusInfo: {
    backgroundColor: '#FFF3CD',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  cardStatusText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    textAlign: 'center',
  },
  cardStatusInfoSuccess: {
    backgroundColor: colors.successLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.success,
  },
  cardStatusTextSuccess: {
    fontSize: fontSize.sm,
    color: colors.success,
    textAlign: 'center',
    fontWeight: fontWeight.semibold,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 4,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxCheck: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  checkboxLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  testCardInfo: {
    backgroundColor: colors.backgroundGray,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  testCardTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  testCardText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  payButton: {
    backgroundColor: colors.success,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  payButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
  payButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  backButton: {
    padding: spacing.md,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  processingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  processingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  timeSlotsContainer: {
    marginTop: spacing.sm,
  },
  timeSlot: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginRight: spacing.sm,
    minWidth: 70,
    alignItems: 'center',
  },
  timeSlotSelected: {
    backgroundColor: colors.primaryDarker,
    borderColor: colors.primaryDarker,
  },
  timeSlotDisabled: {
    backgroundColor: colors.backgroundGray,
    borderColor: colors.border,
    opacity: 0.5,
  },
  timeSlotText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  timeSlotTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  timeSlotTextDisabled: {
    color: colors.textSecondary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
  },
  loadingText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  noSlotsContainer: {
    padding: spacing.md,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  noSlotsText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  noSlotsHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  selectDateText: {
    padding: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
    textAlign: 'center',
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
  // Recurring booking styles
  recurringSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.lg,
  },
  recurringSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  recurringToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: colors.primaryDarker,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  toggleLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  recurringOptions: {
    marginTop: spacing.md,
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  frequencyButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: colors.primaryDarker,
    borderColor: colors.primaryDarker,
  },
  frequencyButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  frequencyButtonTextActive: {
    color: colors.white,
  },
  endTypeButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  endTypeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  endTypeButtonActive: {
    backgroundColor: colors.primaryDarker,
    borderColor: colors.primaryDarker,
  },
  endTypeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  endTypeButtonTextActive: {
    color: colors.white,
  },
  recurringPreview: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  recurringPreviewTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  recurringPreviewText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  recurringCostText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
  },
  dateButtonText: {
    fontSize: fontSize.body,
    color: colors.text,
  },
  dateButtonPlaceholder: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
  cancelButton: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
  },
  cancelButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
});

