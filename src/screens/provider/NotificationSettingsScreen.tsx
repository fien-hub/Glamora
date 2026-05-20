import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
let DateTimePicker: any = View;
try { DateTimePicker = require('@react-native-community/datetimepicker').default; } catch (e) { console.warn('[ProviderNotificationSettings] datetimepicker unavailable:', e); }
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';

interface NotificationPreferences {
  push_new_booking: boolean;
  push_booking_cancelled: boolean;
  push_booking_reminder: boolean;
  push_payment_received: boolean;
  push_new_review: boolean;
  push_new_message: boolean;
  email_new_booking: boolean;
  email_booking_cancelled: boolean;
  email_booking_reminder: boolean;
  email_payment_received: boolean;
  email_new_review: boolean;
  email_new_message: boolean;
  email_weekly_summary: boolean;
  email_monthly_report: boolean;
  sms_new_booking: boolean;
  sms_booking_cancelled: boolean;
  sms_booking_reminder: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_new_booking: true,
    push_booking_cancelled: true,
    push_booking_reminder: true,
    push_payment_received: true,
    push_new_review: true,
    push_new_message: true,
    email_new_booking: true,
    email_booking_cancelled: true,
    email_booking_reminder: false,
    email_payment_received: true,
    email_new_review: true,
    email_new_message: false,
    email_weekly_summary: true,
    email_monthly_report: true,
    sms_new_booking: false,
    sms_booking_cancelled: false,
    sms_booking_reminder: false,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00:00',
    quiet_hours_end: '08:00:00',
  });

  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      Alert.alert('Error', 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user?.id,
          ...preferences,
        });

      if (error) throw error;

      Alert.alert('Success', 'Notification preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleTimeChange = (type: 'start' | 'end', event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
      setShowEndTimePicker(false);
    }

    if (selectedDate) {
      const timeString = selectedDate.toTimeString().split(' ')[0];
      setPreferences((prev) => ({
        ...prev,
        [type === 'start' ? 'quiet_hours_start' : 'quiet_hours_end']: timeString,
      }));
    }
  };

  const parseTime = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0);
    return date;
  };

  const formatTime = (timeString: string): string => {
    const date = parseTime(timeString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
      {/* Push Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Push Notifications</Text>
        <Text style={styles.sectionDescription}>
          Receive instant notifications on your device
        </Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>New Booking</Text>
          <Switch
            value={preferences.push_new_booking}
            onValueChange={() => togglePreference('push_new_booking')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Booking Cancelled</Text>
          <Switch
            value={preferences.push_booking_cancelled}
            onValueChange={() => togglePreference('push_booking_cancelled')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Booking Reminder</Text>
          <Switch
            value={preferences.push_booking_reminder}
            onValueChange={() => togglePreference('push_booking_reminder')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Payment Received</Text>
          <Switch
            value={preferences.push_payment_received}
            onValueChange={() => togglePreference('push_payment_received')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>New Review</Text>
          <Switch
            value={preferences.push_new_review}
            onValueChange={() => togglePreference('push_new_review')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>New Message</Text>
          <Switch
            value={preferences.push_new_message}
            onValueChange={() => togglePreference('push_new_message')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      {/* Email Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📧 Email Notifications</Text>
        <Text style={styles.sectionDescription}>
          Receive notifications via email
        </Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>New Booking</Text>
          <Switch
            value={preferences.email_new_booking}
            onValueChange={() => togglePreference('email_new_booking')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Booking Cancelled</Text>
          <Switch
            value={preferences.email_booking_cancelled}
            onValueChange={() => togglePreference('email_booking_cancelled')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Booking Reminder</Text>
          <Switch
            value={preferences.email_booking_reminder}
            onValueChange={() => togglePreference('email_booking_reminder')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Payment Received</Text>
          <Switch
            value={preferences.email_payment_received}
            onValueChange={() => togglePreference('email_payment_received')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>New Review</Text>
          <Switch
            value={preferences.email_new_review}
            onValueChange={() => togglePreference('email_new_review')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>New Message</Text>
          <Switch
            value={preferences.email_new_message}
            onValueChange={() => togglePreference('email_new_message')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Weekly Summary</Text>
          <Switch
            value={preferences.email_weekly_summary}
            onValueChange={() => togglePreference('email_weekly_summary')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Monthly Report</Text>
          <Switch
            value={preferences.email_monthly_report}
            onValueChange={() => togglePreference('email_monthly_report')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      {/* SMS Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💬 SMS Notifications</Text>
        <Text style={styles.sectionDescription}>
          Receive text messages for important updates
        </Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>New Booking</Text>
          <Switch
            value={preferences.sms_new_booking}
            onValueChange={() => togglePreference('sms_new_booking')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Booking Cancelled</Text>
          <Switch
            value={preferences.sms_booking_cancelled}
            onValueChange={() => togglePreference('sms_booking_cancelled')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Booking Reminder</Text>
          <Switch
            value={preferences.sms_booking_reminder}
            onValueChange={() => togglePreference('sms_booking_reminder')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      {/* Quiet Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌙 Quiet Hours</Text>
        <Text style={styles.sectionDescription}>
          Mute non-urgent notifications during specific hours
        </Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Enable Quiet Hours</Text>
          <Switch
            value={preferences.quiet_hours_enabled}
            onValueChange={() => togglePreference('quiet_hours_enabled')}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        {preferences.quiet_hours_enabled && (
          <>
            <View style={styles.timePickerRow}>
              <Text style={styles.timeLabel}>Start Time</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Text style={styles.timeButtonText}>
                  {formatTime(preferences.quiet_hours_start)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timePickerRow}>
              <Text style={styles.timeLabel}>End Time</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Text style={styles.timeButtonText}>
                  {formatTime(preferences.quiet_hours_end)}
                </Text>
              </TouchableOpacity>
            </View>

            {showStartTimePicker && (
              <DateTimePicker
                value={parseTime(preferences.quiet_hours_start)}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={(event, date) => handleTimeChange('start', event, date)}
              />
            )}

            {showEndTimePicker && (
              <DateTimePicker
                value={parseTime(preferences.quiet_hours_end)}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={(event, date) => handleTimeChange('end', event, date)}
              />
            )}
          </>
        )}
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
            <Text style={styles.saveButtonText}>Save Preferences</Text>
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
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
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
  settingLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timeLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  timeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  timeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
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
    color: colors.white,
  },
});

