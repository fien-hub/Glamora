import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../services/supabase';
import {
  getAvailableTimeSlots,
  formatTimeSlot,
  TimeSlot
} from '../services/availability';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';
import { updateCalendarEvent, deleteCalendarEvent } from '../utils/calendar';

interface RescheduleModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  providerId: string;
  serviceDuration: number;
  currentDate: string;
  currentTime: string;
  onSuccess: () => void;
}

export default function RescheduleModal({
  visible,
  onClose,
  bookingId,
  providerId,
  serviceDuration,
  currentDate,
  currentTime,
  onSuccess,
}: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedTime, setSelectedTime] = useState(currentTime);
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  // Load blocked dates when modal opens
  useEffect(() => {
    if (visible && providerId) {
      loadBlockedDates();
    }
  }, [visible, providerId]);

  // Load available time slots when date changes
  useEffect(() => {
    if (selectedDate && providerId) {
      loadAvailableTimeSlots();
    }
  }, [selectedDate, providerId]);

  const loadBlockedDates = async () => {
    try {
      const { data: timeOffData } = await supabase
        .from('provider_time_off')
        .select('start_date, end_date')
        .eq('provider_id', providerId);

      if (timeOffData) {
        const blocked: string[] = [];
        timeOffData.forEach((timeOff) => {
          const start = new Date(timeOff.start_date);
          const end = new Date(timeOff.end_date);

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
        providerId,
        selectedDate,
        serviceDuration
      );
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading time slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Error', 'Please select both date and time');
      return;
    }

    setLoading(true);
    try {
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`);

      // Get current booking to check for calendar event ID
      const { data: bookingData, error: fetchError } = await supabase
        .from('bookings')
        .select('customer_calendar_event_id, provider_calendar_event_id')
        .eq('id', bookingId)
        .single();

      if (fetchError) throw fetchError;

      // Update booking in database
      const { error } = await supabase
        .from('bookings')
        .update({
          scheduled_at: scheduledAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Update calendar event if it exists
      if (bookingData?.customer_calendar_event_id) {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const [hours, minutes] = selectedTime.split(':').map(Number);

        const startDate = new Date(year, month - 1, day, hours, minutes);
        const endDate = new Date(startDate.getTime() + serviceDuration * 60000);

        await updateCalendarEvent(bookingData.customer_calendar_event_id, {
          startDate,
          endDate,
        });
      }

      Alert.alert('Success', 'Booking rescheduled successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reschedule booking');
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1); // Tomorrow

  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3); // 3 months ahead

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Reschedule Booking</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Current Booking Info */}
            <View style={styles.currentBooking}>
              <Text style={styles.currentLabel}>Current Booking:</Text>
              <Text style={styles.currentValue}>
                {new Date(currentDate).toLocaleDateString()} at {currentTime}
              </Text>
            </View>

            {/* Calendar */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select New Date</Text>
              <Calendar
                minDate={minDate.toISOString().split('T')[0]}
                maxDate={maxDate.toISOString().split('T')[0]}
                onDayPress={(day: any) => setSelectedDate(day.dateString)}
                markedDates={{
                  [selectedDate]: {
                    selected: true,
                    selectedColor: colors.primary,
                  },
                  ...blockedDates.reduce((acc, date) => ({
                    ...acc,
                    [date]: {
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
                }}
              />
            </View>

            {/* Time Slots */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select New Time</Text>
              {loadingSlots ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading available times...</Text>
                </View>
              ) : availableSlots.length > 0 ? (
                <View style={styles.timeGrid}>
                  {availableSlots.map((slot) => (
                    <TouchableOpacity
                      key={slot.time}
                      style={[
                        styles.timeSlot,
                        selectedTime === slot.time && styles.timeSlotSelected,
                        !slot.available && styles.timeSlotDisabled,
                      ]}
                      onPress={() => slot.available && setSelectedTime(slot.time)}
                      disabled={!slot.available}
                    >
                      <Text
                        style={[
                          styles.timeText,
                          selectedTime === slot.time && styles.timeTextSelected,
                          !slot.available && styles.timeTextDisabled,
                        ]}
                      >
                        {formatTimeSlot(slot.time)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.noSlotsText}>
                  No available time slots for this date
                </Text>
              )}
            </View>

            {/* Reschedule Policy */}
            <View style={styles.policyCard}>
              <Text style={styles.policyTitle}>📋 Reschedule Policy</Text>
              <Text style={styles.policyText}>
                • Free rescheduling up to 24 hours before appointment
              </Text>
              <Text style={styles.policyText}>
                • Rescheduling within 24 hours may incur a fee
              </Text>
              <Text style={styles.policyText}>
                • Maximum 2 reschedules per booking
              </Text>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleReschedule}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Reschedule</Text>
              )}
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
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    fontSize: fontSize.xl,
    color: colors.textSecondary,
    padding: spacing.sm,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  currentBooking: {
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  currentLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  currentValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeSlot: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    minWidth: 70,
    alignItems: 'center',
  },
  timeSlotSelected: {
    backgroundColor: colors.primaryDarker,
    borderColor: colors.primaryDarker,
  },
  timeText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  timeTextSelected: {
    color: colors.white,
  },
  timeSlotDisabled: {
    backgroundColor: colors.backgroundGray,
    borderColor: colors.border,
    opacity: 0.5,
  },
  timeTextDisabled: {
    color: colors.textSecondary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
  },
  loadingText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  noSlotsText: {
    padding: spacing.md,
    fontSize: fontSize.sm,
    color: colors.error,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    textAlign: 'center',
  },
  policyCard: {
    backgroundColor: colors.infoLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.info,
  },
  policyTitle: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  policyText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
