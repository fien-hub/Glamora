import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';

export default function BusinessSettingsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Business settings
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [cancellationWindow, setCancellationWindow] = useState('24');
  const [bookingBuffer, setBookingBuffer] = useState('15');
  const [minLeadTime, setMinLeadTime] = useState('2');
  const [maxAdvanceBooking, setMaxAdvanceBooking] = useState('90');
  const [autoAcceptBookings, setAutoAcceptBookings] = useState(false);
  const [instantBookingEnabled, setInstantBookingEnabled] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);

      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;
      setProfileId(profile.id);

      // Get provider profile with business settings
      const { data: providerProfile, error } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('id', profile.id)
        .single();

      if (error) throw error;

      if (providerProfile) {
        setCancellationPolicy(providerProfile.cancellation_policy || '');
        setCancellationWindow(providerProfile.cancellation_window_hours?.toString() || '24');
        setBookingBuffer(providerProfile.booking_buffer_minutes?.toString() || '15');
        setMinLeadTime(providerProfile.min_lead_time_hours?.toString() || '2');
        setMaxAdvanceBooking(providerProfile.max_advance_booking_days?.toString() || '90');
        setAutoAcceptBookings(providerProfile.auto_accept_bookings || false);
        setInstantBookingEnabled(providerProfile.instant_booking_enabled ?? true);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      Alert.alert('Error', 'Failed to load business settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    const cancellationWindowNum = parseInt(cancellationWindow);
    if (isNaN(cancellationWindowNum) || cancellationWindowNum < 0 || cancellationWindowNum > 168) {
      Alert.alert('Validation Error', 'Cancellation window must be between 0 and 168 hours (7 days)');
      return;
    }

    const bookingBufferNum = parseInt(bookingBuffer);
    if (isNaN(bookingBufferNum) || bookingBufferNum < 0 || bookingBufferNum > 120) {
      Alert.alert('Validation Error', 'Booking buffer must be between 0 and 120 minutes');
      return;
    }

    const minLeadTimeNum = parseInt(minLeadTime);
    if (isNaN(minLeadTimeNum) || minLeadTimeNum < 0 || minLeadTimeNum > 168) {
      Alert.alert('Validation Error', 'Minimum lead time must be between 0 and 168 hours (7 days)');
      return;
    }

    const maxAdvanceBookingNum = parseInt(maxAdvanceBooking);
    if (isNaN(maxAdvanceBookingNum) || maxAdvanceBookingNum < 1 || maxAdvanceBookingNum > 365) {
      Alert.alert('Validation Error', 'Maximum advance booking must be between 1 and 365 days');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('provider_profiles')
        .update({
          cancellation_policy: cancellationPolicy.trim(),
          cancellation_window_hours: cancellationWindowNum,
          booking_buffer_minutes: bookingBufferNum,
          min_lead_time_hours: minLeadTimeNum,
          max_advance_booking_days: maxAdvanceBookingNum,
          auto_accept_bookings: autoAcceptBookings,
          instant_booking_enabled: instantBookingEnabled,
        })
        .eq('id', profileId);

      if (error) throw error;

      Alert.alert('Success', 'Business settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save business settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Booking Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Booking Settings</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Instant Booking</Text>
            <Text style={styles.settingDescription}>Allow customers to book instantly without approval</Text>
          </View>
          <Switch
            value={instantBookingEnabled}
            onValueChange={setInstantBookingEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto-Accept Bookings</Text>
            <Text style={styles.settingDescription}>Automatically accept all booking requests</Text>
          </View>
          <Switch
            value={autoAcceptBookings}
            onValueChange={setAutoAcceptBookings}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Minimum Lead Time (hours)</Text>
          <TextInput
            style={styles.input}
            placeholder="2"
            value={minLeadTime}
            onChangeText={setMinLeadTime}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Text style={styles.hint}>
            Customers must book at least {minLeadTime || '0'} hours in advance
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Maximum Advance Booking (days)</Text>
          <TextInput
            style={styles.input}
            placeholder="90"
            value={maxAdvanceBooking}
            onChangeText={setMaxAdvanceBooking}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Text style={styles.hint}>
            Customers can book up to {maxAdvanceBooking || '0'} days in advance
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Booking Buffer Time (minutes)</Text>
          <TextInput
            style={styles.input}
            placeholder="15"
            value={bookingBuffer}
            onChangeText={setBookingBuffer}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Text style={styles.hint}>
            Add {bookingBuffer || '0'} minutes buffer between appointments for travel/setup
          </Text>
        </View>
      </View>

      {/* Cancellation Policy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚫 Cancellation Policy</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cancellation Window (hours)</Text>
          <TextInput
            style={styles.input}
            placeholder="24"
            value={cancellationWindow}
            onChangeText={setCancellationWindow}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Text style={styles.hint}>
            Customers can cancel up to {cancellationWindow || '0'} hours before appointment
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cancellation Policy Text</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your cancellation policy..."
            value={cancellationPolicy}
            onChangeText={setCancellationPolicy}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.charCount}>{cancellationPolicy.length}/500</Text>
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Business Settings</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  section: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  settingDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.black,
  },
});

