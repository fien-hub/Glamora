import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import {
  isBiometricAvailable,
  getBiometricType,
  authenticateWithBiometrics,
} from '../utils/biometricAuth';
import {
  isTwoFactorEnabled,
  getTwoFactorMethod,
  enableTwoFactor,
  disableTwoFactor,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  TwoFactorMethod,
} from '../utils/twoFactorAuth';
import { useScreenTracking } from '../hooks/useScreenTracking';

export default function SecuritySettingsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<TwoFactorMethod>('none');

  // Track screen view
  useScreenTracking('Security Settings');

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    setLoading(true);
    try {
      // Check biometric availability
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);

      if (available) {
        const type = await getBiometricType();
        setBiometricType(type);
      }

      // Load current settings
      const bioEnabled = await isBiometricEnabled();
      setBiometricEnabled(bioEnabled);

      const twoFAEnabled = await isTwoFactorEnabled();
      setTwoFactorEnabled(twoFAEnabled);

      const method = await getTwoFactorMethod();
      setTwoFactorMethod(method);
    } catch (error) {
      console.error('Error loading security settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      // Enabling biometric - authenticate first
      const result = await authenticateWithBiometrics({
        promptMessage: `Enable ${biometricType} for quick login`,
      });

      if (result.success) {
        await enableBiometric();
        setBiometricEnabled(true);
        Alert.alert('Success', `${biometricType} authentication enabled`);
      } else {
        Alert.alert('Authentication Failed', result.error || 'Could not enable biometric authentication');
      }
    } else {
      // Disabling biometric
      Alert.alert(
        'Disable Biometric Authentication',
        `Are you sure you want to disable ${biometricType}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await disableBiometric();
              setBiometricEnabled(false);
            },
          },
        ]
      );
    }
  };

  const handleToggleTwoFactor = async (value: boolean) => {
    if (value) {
      // Show method selection
      Alert.alert(
        'Enable Two-Factor Authentication',
        'Choose your verification method:',
        [
          {
            text: 'Email',
            onPress: () => handleEnableTwoFactor('email'),
          },
          {
            text: 'SMS',
            onPress: () => handleEnableTwoFactor('sms'),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } else {
      // Disabling 2FA
      Alert.alert(
        'Disable Two-Factor Authentication',
        'Are you sure you want to disable 2FA? This will make your account less secure.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await disableTwoFactor();
              setTwoFactorEnabled(false);
              setTwoFactorMethod('none');
              Alert.alert('Success', 'Two-factor authentication disabled');
            },
          },
        ]
      );
    }
  };

  const handleEnableTwoFactor = async (method: TwoFactorMethod) => {
    try {
      await enableTwoFactor(method);
      setTwoFactorEnabled(true);
      setTwoFactorMethod(method);
      
      Alert.alert(
        'Success',
        `Two-factor authentication enabled via ${method === 'email' ? 'Email' : 'SMS'}. You will receive a verification code when signing in.`
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to enable two-factor authentication');
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
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Security Settings</Text>
          <Text style={styles.subtitle}>
            Protect your account with additional security measures
          </Text>
        </View>

        {/* Biometric Authentication Section */}
        {biometricAvailable && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Biometric Authentication</Text>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{biometricType}</Text>
                <Text style={styles.settingDescription}>
                  Use {biometricType} for quick and secure login
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        )}

        {/* Two-Factor Authentication Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Two-Factor Authentication</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable 2FA</Text>
              <Text style={styles.settingDescription}>
                Add an extra layer of security to your account
              </Text>
              {twoFactorEnabled && (
                <Text style={styles.methodBadge}>
                  Method: {twoFactorMethod === 'email' ? 'Email' : 'SMS'}
                </Text>
              )}
            </View>
            <Switch
              value={twoFactorEnabled}
              onValueChange={handleToggleTwoFactor}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          {twoFactorEnabled && (
            <TouchableOpacity
              style={styles.changeMethodButton}
              onPress={() => handleToggleTwoFactor(true)}
            >
              <Text style={styles.changeMethodText}>Change Verification Method</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Security Tips */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Security Tips</Text>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>🔒</Text>
            <Text style={styles.tipText}>
              Use a strong, unique password for your account
            </Text>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>📱</Text>
            <Text style={styles.tipText}>
              Enable two-factor authentication for maximum security
            </Text>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>⚠️</Text>
            <Text style={styles.tipText}>
              Never share your password or verification codes with anyone
            </Text>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>🔄</Text>
            <Text style={styles.tipText}>
              Change your password regularly and avoid reusing old passwords
            </Text>
          </View>
        </View>
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
  content: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  settingDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  methodBadge: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
  },
  changeMethodButton: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  changeMethodText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  tipIcon: {
    fontSize: fontSize.xl,
    marginRight: spacing.md,
  },
  tipText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
});

