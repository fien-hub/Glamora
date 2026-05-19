import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Ionicons } from '../../utils/icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import FadeInView from '../../components/animations/FadeInView';
import StaggeredList from '../../components/animations/StaggeredList';

interface DayAvailability {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface TimeOff {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

export default function AvailabilityScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [timeOffList, setTimeOffList] = useState<TimeOff[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [timeOffModalVisible, setTimeOffModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayAvailability | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartTime, setTempStartTime] = useState(new Date());
  const [tempEndTime, setTempEndTime] = useState(new Date());

  // Time off form
  const [timeOffStartDate, setTimeOffStartDate] = useState(new Date());
  const [timeOffEndDate, setTimeOffEndDate] = useState(new Date());
  const [timeOffReason, setTimeOffReason] = useState('');
  const [showTimeOffStartPicker, setShowTimeOffStartPicker] = useState(false);
  const [showTimeOffEndPicker, setShowTimeOffEndPicker] = useState(false);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchAvailability();
    fetchTimeOff();
  }, []);

  const fetchAvailability = async () => {
    if (!user) return;

    try {
      // Get profile ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfileId(profile.id);

      // Fetch availability
      const { data, error } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', profile.id)
        .order('day_of_week');

      if (error) throw error;

      // Initialize all days if no data exists
      if (!data || data.length === 0) {
        const defaultAvailability: DayAvailability[] = [];
        for (let i = 0; i < 7; i++) {
          defaultAvailability.push({
            day_of_week: i,
            start_time: '09:00:00',
            end_time: '17:00:00',
            is_available: i >= 1 && i <= 5, // Mon-Fri by default
          });
        }
        setAvailability(defaultAvailability);
      } else {
        setAvailability(data);
      }
    } catch (error: any) {
      console.error('Error fetching availability:', error);
      Alert.alert('Error', 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeOff = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('provider_time_off')
        .select('*')
        .eq('provider_id', profile.id)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('start_date');

      if (error) throw error;
      setTimeOffList(data || []);
    } catch (error: any) {
      console.error('Error fetching time off:', error);
    }
  };

  const handleToggleDay = (dayIndex: number) => {
    const updatedAvailability = [...availability];
    const dayData = updatedAvailability.find((d) => d.day_of_week === dayIndex);
    if (dayData) {
      dayData.is_available = !dayData.is_available;
      setAvailability(updatedAvailability);
    }
  };

  const handleEditDay = (dayIndex: number) => {
    const dayData = availability.find((d) => d.day_of_week === dayIndex);
    if (dayData) {
      setSelectedDay(dayData);
      // Parse time strings to Date objects
      const [startHours, startMinutes] = dayData.start_time.split(':').map(Number);
      const [endHours, endMinutes] = dayData.end_time.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(startHours, startMinutes, 0, 0);
      const endDate = new Date();
      endDate.setHours(endHours, endMinutes, 0, 0);
      setTempStartTime(startDate);
      setTempEndTime(endDate);
      setEditModalVisible(true);
    }
  };

  const handleSaveTimeEdit = () => {
    if (!selectedDay) return;

    const startTimeStr = `${tempStartTime.getHours().toString().padStart(2, '0')}:${tempStartTime.getMinutes().toString().padStart(2, '0')}:00`;
    const endTimeStr = `${tempEndTime.getHours().toString().padStart(2, '0')}:${tempEndTime.getMinutes().toString().padStart(2, '0')}:00`;

    const updatedAvailability = availability.map((day) =>
      day.day_of_week === selectedDay.day_of_week
        ? { ...day, start_time: startTimeStr, end_time: endTimeStr }
        : day
    );

    setAvailability(updatedAvailability);
    setEditModalVisible(false);
  };

  const handleSaveAvailability = async () => {
    if (!profileId) return;

    setSaving(true);
    try {
      // Delete existing availability
      await supabase
        .from('provider_availability')
        .delete()
        .eq('provider_id', profileId);

      // Insert new availability (only for available days)
      const availabilityToInsert = availability
        .filter((day) => day.is_available)
        .map((day) => ({
          provider_id: profileId,
          day_of_week: day.day_of_week,
          start_time: day.start_time,
          end_time: day.end_time,
          is_available: true,
        }));

      if (availabilityToInsert.length > 0) {
        const { error } = await supabase
          .from('provider_availability')
          .insert(availabilityToInsert);

        if (error) throw error;
      }

      Alert.alert('Success', 'Availability updated successfully!');
    } catch (error: any) {
      console.error('Error saving availability:', error);
      Alert.alert('Error', error.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTimeOff = async () => {
    if (!profileId) return;

    if (!timeOffReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for time off');
      return;
    }

    if (timeOffEndDate < timeOffStartDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    try {
      const { error } = await supabase
        .from('provider_time_off')
        .insert({
          provider_id: profileId,
          start_date: timeOffStartDate.toISOString().split('T')[0],
          end_date: timeOffEndDate.toISOString().split('T')[0],
          reason: timeOffReason.trim(),
        });

      if (error) throw error;

      Alert.alert('Success', 'Time off added successfully!');
      setTimeOffModalVisible(false);
      setTimeOffReason('');
      fetchTimeOff();
    } catch (error: any) {
      console.error('Error adding time off:', error);
      Alert.alert('Error', error.message || 'Failed to add time off');
    }
  };

  const handleDeleteTimeOff = async (timeOffId: string) => {
    Alert.alert(
      'Delete Time Off',
      'Are you sure you want to delete this time off period?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('provider_time_off')
                .delete()
                .eq('id', timeOffId);

              if (error) throw error;
              fetchTimeOff();
            } catch (error: any) {
              console.error('Error deleting time off:', error);
              Alert.alert('Error', 'Failed to delete time off');
            }
          },
        },
      ]
    );
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Weekly Schedule Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Schedule</Text>
          <Text style={styles.sectionDescription}>Set your working hours for each day</Text>

          {availability.map((day) => (
            <View key={day.day_of_week} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={styles.dayInfo}>
                  <Text style={styles.dayName}>{daysOfWeek[day.day_of_week]}</Text>
                  {day.is_available && (
                    <Text style={styles.dayTime}>
                      {formatTime(day.start_time)} - {formatTime(day.end_time)}
                    </Text>
                  )}
                </View>
                <Switch
                  value={day.is_available}
                  onValueChange={() => handleToggleDay(day.day_of_week)}
                  trackColor={{ false: colors.border, true: colors.success }}
                  thumbColor={colors.white}
                />
              </View>
              {day.is_available && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditDay(day.day_of_week)}
                >
                  <Ionicons name="time-outline" size={18} color={colors.primary} />
                  <Text style={styles.editButtonText}>Edit Hours</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Time Off Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Time Off</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setTimeOffModalVisible(true)}
            >
              <Ionicons name="add-circle" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionDescription}>Block dates when you're unavailable</Text>

          {timeOffList.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>No time off scheduled</Text>
            </View>
          ) : (
            timeOffList.map((timeOff) => (
              <View key={timeOff.id} style={styles.timeOffCard}>
                <View style={styles.timeOffInfo}>
                  <View style={styles.timeOffDates}>
                    <Ionicons name="calendar" size={20} color={colors.error} />
                    <Text style={styles.timeOffDateText}>
                      {formatDate(timeOff.start_date)} - {formatDate(timeOff.end_date)}
                    </Text>
                  </View>
                  <Text style={styles.timeOffReason}>{timeOff.reason}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteIconButton}
                  onPress={() => handleDeleteTimeOff(timeOff.id)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveAvailability}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Schedule</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Time Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit {selectedDay && daysOfWeek[selectedDay.day_of_week]} Hours
            </Text>

            <View style={styles.timePickerRow}>
              <Text style={styles.timeLabel}>Start Time:</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.timeButtonText}>{formatTime(tempStartTime.toTimeString().slice(0, 8))}</Text>
              </TouchableOpacity>
            </View>

            {showStartPicker && (
              <DateTimePicker
                value={tempStartTime}
                mode="time"
                display="spinner"
                onChange={(_: DateTimePickerEvent, date?: Date) => {
                  setShowStartPicker(false);
                  if (date) setTempStartTime(date);
                }}
              />
            )}

            <View style={styles.timePickerRow}>
              <Text style={styles.timeLabel}>End Time:</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.timeButtonText}>{formatTime(tempEndTime.toTimeString().slice(0, 8))}</Text>
              </TouchableOpacity>
            </View>

            {showEndPicker && (
              <DateTimePicker
                value={tempEndTime}
                mode="time"
                display="spinner"
                onChange={(_: DateTimePickerEvent, date?: Date) => {
                  setShowEndPicker(false);
                  if (date) setTempEndTime(date);
                }}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveTimeEdit}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Time Off Modal */}
      <Modal
        visible={timeOffModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTimeOffModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Time Off</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowTimeOffStartPicker(true)}
              >
                <Text style={styles.dateButtonText}>{formatDate(timeOffStartDate.toISOString())}</Text>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {showTimeOffStartPicker && (
              <DateTimePicker
                value={timeOffStartDate}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(_: DateTimePickerEvent, date?: Date) => {
                  setShowTimeOffStartPicker(false);
                  if (date) setTimeOffStartDate(date);
                }}
              />
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowTimeOffEndPicker(true)}
              >
                <Text style={styles.dateButtonText}>{formatDate(timeOffEndDate.toISOString())}</Text>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {showTimeOffEndPicker && (
              <DateTimePicker
                value={timeOffEndDate}
                mode="date"
                display="default"
                minimumDate={timeOffStartDate}
                onChange={(_: DateTimePickerEvent, date?: Date) => {
                  setShowTimeOffEndPicker(false);
                  if (date) setTimeOffEndDate(date);
                }}
              />
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reason</Text>
              <TextInput
                style={styles.textInput}
                value={timeOffReason}
                onChangeText={setTimeOffReason}
                placeholder="e.g., Vacation, Personal, etc."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setTimeOffModalVisible(false);
                  setTimeOffReason('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleAddTimeOff}
              >
                <Text style={styles.modalButtonTextSave}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  dayCard: {
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  dayTime: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    marginLeft: spacing.xs,
  },
  addButton: {
    padding: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  timeOffCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  timeOffInfo: {
    flex: 1,
  },
  timeOffDates: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  timeOffDateText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginLeft: spacing.xs,
  },
  timeOffReason: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  deleteIconButton: {
    padding: spacing.sm,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timeLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  timeButton: {
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minWidth: 120,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  dateButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  textInput: {
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.backgroundGray,
  },
  modalButtonSave: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  modalButtonTextSave: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});

