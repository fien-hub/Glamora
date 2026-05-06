import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import {
  sendEmailVerificationCode,
  sendSMSVerificationCode,
  verifyOTPCode,
  TwoFactorMethod,
} from '../../utils/twoFactorAuth';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';
import ScaleInView from '../../components/animations/ScaleInView';

export default function TwoFactorVerificationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  const { email, phone, method } = route.params as {
    email?: string;
    phone?: string;
    method: TwoFactorMethod;
  };

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Send initial verification code
    sendVerificationCode();
  }, []);

  useEffect(() => {
    // Countdown timer for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendVerificationCode = async () => {
    setResending(true);
    try {
      let result;
      
      if (method === 'email' && email) {
        result = await sendEmailVerificationCode(email);
      } else if (method === 'sms' && phone) {
        result = await sendSMSVerificationCode(phone);
      } else {
        Alert.alert('Error', 'Invalid verification method');
        return;
      }

      if (result.success) {
        setCountdown(60); // 60 second cooldown
        Alert.alert(
          'Code Sent',
          `A verification code has been sent to your ${method === 'email' ? 'email' : 'phone'}.`
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send verification code');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification code');
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const identifier = method === 'email' ? email! : phone!;
      const result = await verifyOTPCode(identifier, code, method as 'email' | 'sms');

      if (result.success) {
        Alert.alert('Success', 'Verification successful!', [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back or to main app
              // The auth state will be updated automatically by Supabase
              navigation.goBack();
            },
          },
        ]);
      } else {
        Alert.alert('Verification Failed', result.error || 'Invalid verification code');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (countdown > 0) return;
    sendVerificationCode();
  };

  const maskedIdentifier = method === 'email'
    ? email?.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : phone?.replace(/(\d{3})(\d{3})(\d{4})/, '($1) ***-$3');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Header scales in */}
        <ScaleInView delay={0}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🔐</Text>
            </View>
            <Text style={styles.title}>Two-Factor Authentication</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{'\n'}
              {maskedIdentifier}
            </Text>
          </View>
        </ScaleInView>

        {/* Code Input and buttons slide up with stagger */}
        <View style={styles.form}>
          <ScaleInView delay={150}>
            <TextInput
              style={styles.input}
              placeholder="000000"
              placeholderTextColor={colors.textSecondary}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              editable={!loading}
              textAlign="center"
            />
          </ScaleInView>

          {/* Verify Button */}
          <SlideUpView delay={200}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Verify</Text>
              )}
            </TouchableOpacity>
          </SlideUpView>

          {/* Resend Button */}
          <FadeInView delay={250}>
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResend}
              disabled={countdown > 0 || resending}
            >
              {resending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  style={[
                    styles.resendText,
                    countdown > 0 && styles.resendTextDisabled,
                  ]}
                >
                  {countdown > 0
                    ? `Resend code in ${countdown}s`
                    : 'Resend code'}
                </Text>
              )}
            </TouchableOpacity>
          </FadeInView>

          {/* Cancel Button */}
          <FadeInView delay={300}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </FadeInView>
        </View>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            💡 Didn't receive the code? Check your spam folder or try resending.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 50,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: spacing.xl,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    backgroundColor: colors.white,
    marginBottom: spacing.lg,
    letterSpacing: 8,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.black,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  resendButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  resendText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  resendTextDisabled: {
    color: colors.textSecondary,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  helpContainer: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helpText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

