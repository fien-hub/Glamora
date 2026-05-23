import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '../utils/icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { useScreenTracking } from '../hooks/useScreenTracking';
import {
  deleteUserAccount,
  deactivateUserAccount,
  confirmAccountDeletion,
  exportUserDataToFile,
  exportUserDataByEmail,
} from '../services/accountDeletion';

export default function AccountSettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [emailingExport, setEmailingExport] = useState(false);

  useScreenTracking('Account Settings');

  const handleExportData = async () => {
    if (!user) return;

    setExporting(true);
    try {
      const result = await exportUserDataToFile(user.id, user.email || undefined);

      if (result.success) {
        Alert.alert(
          'Data Export',
          'Your data export file was generated and opened in the system share menu. You can save it locally or send it by email.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to export your data. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while exporting your data.');
    } finally {
      setExporting(false);
    }
  };

  const handleEmailExport = async () => {
    if (!user) return;

    setEmailingExport(true);
    try {
      const result = await exportUserDataByEmail(user.id, user.email || undefined);

      if (result.success) {
        Alert.alert(
          'Email Export',
          'Your export file is ready in the mail/share composer. Send or save it to complete delivery.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to prepare email export. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while preparing your email export.');
    } finally {
      setEmailingExport(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    confirmAccountDeletion(async () => {
      setDeleting(true);
      try {
        const result = await deleteUserAccount(user.id);

        if (result.success) {
          Alert.alert(
            'Account Deleted',
            'Your account has been permanently deleted. Thank you for using Eve Beauty.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Sign out and navigate to auth screens
                  signOut();
                },
              },
            ],
            { cancelable: false }
          );
        } else {
          Alert.alert(
            'Deletion Failed',
            result.error || 'We could not delete your account. Please contact support.',
            [{ text: 'OK' }]
          );
        }
      } catch (error: any) {
        Alert.alert(
          'Error',
          'An unexpected error occurred. Please try again or contact support.',
          [{ text: 'OK' }]
        );
      } finally {
        setDeleting(false);
      }
    }, user.email || 'your account');
  };

  const handleDeactivateAccount = () => {
    if (!user) return;

    Alert.alert(
      'Deactivate Account',
      'Account deactivation temporarily disables your account. You can reactivate it by logging in again.\n\nWould you like to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            setDeactivating(true);
            try {
              const result = await deactivateUserAccount(user.id);

              if (result.success) {
                Alert.alert(
                  'Account Deactivated',
                  'Your account has been deactivated. Log in again anytime to reactivate and continue using Eve Beauty.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        signOut();
                      },
                    },
                  ],
                  { cancelable: false }
                );
              } else {
                Alert.alert(
                  'Deactivation Failed',
                  result.error || 'We could not deactivate your account. Please try again.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              Alert.alert(
                'Error',
                'An unexpected error occurred while deactivating your account.',
                [{ text: 'OK' }]
              );
            } finally {
              setDeactivating(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}> 
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Settings</Text>
        </View>

      {/* Account Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account ID</Text>
            <Text style={styles.infoValue}>{user?.id.slice(0, 8)}...</Text>
          </View>
        </View>
      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleExportData}
          disabled={exporting}
        >
          <View style={styles.actionButtonContent}>
            <Ionicons name="download-outline" size={24} color={colors.primary} />
            <View style={styles.actionButtonTextContainer}>
              <Text style={styles.actionButtonTitle}>Export My Data</Text>
              <Text style={styles.actionButtonSubtitle}>
                Download a copy of all your account data
              </Text>
            </View>
          </View>
          {exporting && <ActivityIndicator size="small" color={colors.primary} />}
          {!exporting && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleEmailExport}
          disabled={emailingExport}
        >
          <View style={styles.actionButtonContent}>
            <Ionicons name="mail-outline" size={24} color={colors.primary} />
            <View style={styles.actionButtonTextContainer}>
              <Text style={styles.actionButtonTitle}>Email My Data</Text>
              <Text style={styles.actionButtonSubtitle}>
                Open an email draft with your data export attached
              </Text>
            </View>
          </View>
          {emailingExport && <ActivityIndicator size="small" color={colors.primary} />}
          {!emailingExport && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
        </TouchableOpacity>
        <Text style={styles.helperNote}>
          Opens your default mail app with the export attached. Falls back to the system share sheet if mail is unavailable on this device.
        </Text>
      </View>

      {/* Danger Zone Section */}
      <View style={styles.section}>
        <Text style={styles.dangerSectionTitle}>Danger Zone</Text>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.warningButton]}
          onPress={handleDeactivateAccount}
          disabled={deactivating}
        >
          <View style={styles.actionButtonContent}>
            <Ionicons name="pause-circle-outline" size={24} color={colors.warning} />
            <View style={styles.actionButtonTextContainer}>
              <Text style={[styles.actionButtonTitle, styles.warningText]}>
                Deactivate Account
              </Text>
              <Text style={styles.actionButtonSubtitle}>
                Temporarily disable your account (can be reactivated)
              </Text>
            </View>
          </View>
          {deactivating && <ActivityIndicator size="small" color={colors.warning} />}
          {!deactivating && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          onPress={handleDeleteAccount}
          disabled={deleting}
        >
          <View style={styles.actionButtonContent}>
            <Ionicons name="trash-outline" size={24} color={colors.error} />
            <View style={styles.actionButtonTextContainer}>
              <Text style={[styles.actionButtonTitle, styles.dangerText]}>
                Delete Account
              </Text>
              <Text style={styles.actionButtonSubtitle}>
                Permanently delete your account and all data
              </Text>
            </View>
          </View>
          {deleting && <ActivityIndicator size="small" color={colors.error} />}
          {!deleting && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
        </TouchableOpacity>
      </View>

      {/* Warning Text */}
      <View style={styles.warningContainer}>
        <Ionicons name="warning-outline" size={20} color={colors.warning} />
        <Text style={styles.warningTextContainer}>
          Deleting your account is permanent and cannot be undone. All your data,
          including bookings, reviews, and favorites will be permanently removed.
        </Text>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  dangerSectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionButtonTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  actionButtonSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  helperNote: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginHorizontal: spacing.md,
    lineHeight: 16,
  },
  warningButton: {
    borderColor: colors.warning,
  },
  warningText: {
    color: colors.warning,
  },
  dangerButton: {
    borderColor: colors.error,
  },
  dangerText: {
    color: colors.error,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
