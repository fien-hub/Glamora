import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '../utils/icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { supabase } from '../services/supabase';

interface ReportIssueModalProps {
  visible: boolean;
  onClose: () => void;
  booking: any;
}

const ISSUE_TYPES = [
  { id: 'no_show', label: 'Provider did not show up', icon: 'person-remove-outline' },
  { id: 'late', label: 'Provider was late', icon: 'time-outline' },
  { id: 'quality', label: 'Service quality issue', icon: 'star-outline' },
  { id: 'unprofessional', label: 'Unprofessional behavior', icon: 'alert-circle-outline' },
  { id: 'safety', label: 'Safety concern', icon: 'shield-outline' },
  { id: 'other', label: 'Other issue', icon: 'help-circle-outline' },
];

export default function ReportIssueModal({ visible, onClose, booking }: ReportIssueModalProps) {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedIssue) {
      Alert.alert('Select Issue Type', 'Please select the type of issue you experienced.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Add Description', 'Please provide details about the issue.');
      return;
    }

    setSubmitting(true);

    try {
      // Insert issue report into database
      const { error } = await supabase.from('booking_issues').insert({
        booking_id: booking.id,
        issue_type: selectedIssue,
        description: description.trim(),
        status: 'pending',
      });

      if (error) throw error;

      Alert.alert(
        'Report Submitted',
        'Thank you for reporting this issue. Our team will review it and get back to you soon.',
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedIssue(null);
              setDescription('');
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting issue report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Issue</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* Booking Info */}
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingInfoTitle}>
              {booking?.provider_profiles?.business_name || 'Provider'}
            </Text>
            <Text style={styles.bookingInfoSubtitle}>
              {booking?.provider_services?.services?.name || 'Service'}
            </Text>
            <Text style={styles.bookingInfoDate}>
              {new Date(booking?.scheduled_date).toLocaleDateString()} at {booking?.scheduled_time}
            </Text>
          </View>

          {/* Issue Types */}
          <Text style={styles.sectionTitle}>What went wrong?</Text>
          <View style={styles.issueTypesContainer}>
            {ISSUE_TYPES.map((issue) => (
              <TouchableOpacity
                key={issue.id}
                style={[
                  styles.issueTypeButton,
                  selectedIssue === issue.id && styles.issueTypeButtonSelected,
                ]}
                onPress={() => setSelectedIssue(issue.id)}
              >
                <Ionicons
                  name={issue.icon as any}
                  size={24}
                  color={selectedIssue === issue.id ? colors.white : colors.primary}
                />
                <Text
                  style={[
                    styles.issueTypeText,
                    selectedIssue === issue.id && styles.issueTypeTextSelected,
                  ]}
                >
                  {issue.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>Tell us more</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Please provide details about what happened..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={6}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + 20,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  bookingInfo: {
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
  },
  bookingInfoTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bookingInfoSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  bookingInfoDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  issueTypesContainer: {
    marginBottom: spacing.xl,
  },
  issueTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  issueTypeButtonSelected: {
    backgroundColor: colors.primaryDarker,
    borderColor: colors.primaryDarker,
  },
  issueTypeText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.md,
    fontWeight: fontWeight.medium,
  },
  issueTypeTextSelected: {
    color: colors.black,
  },
  descriptionInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 120,
    marginBottom: spacing.xl,
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.black,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});

