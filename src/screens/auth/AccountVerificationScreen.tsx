import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';
import ScaleInView from '../../components/animations/ScaleInView';

type VerificationStep = 'intro' | 'verify';

export default function AccountVerificationScreen() {
  const { user, refreshVerificationStatus } = useAuth();
  const [step, setStep] = useState<VerificationStep>('intro');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Get user's email from auth
  const userEmail = user?.email || '';

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendVerificationCode = async () => {
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: userEmail,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;

      setStep('verify');
      setCountdown(60);
      Alert.alert('Code Sent', 'A verification code has been sent to your email.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification code');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const result = await supabase.auth.verifyOtp({
        email: userEmail,
        token: code,
        type: 'email',
      });

      if (result.error) throw result.error;

      // Update profile verification status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ email_verified: true })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      Alert.alert('Success', 'Your email has been verified!', [
        { text: 'OK', onPress: () => refreshVerificationStatus?.() },
      ]);
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (countdown > 0) return;
    sendVerificationCode();
  };

  const maskedEmail = userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  if (step === 'verify') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ScaleInView delay={0}>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="mail" size={40} color={colors.primaryDarker} />
              </View>
              <Text style={styles.title}>Enter Verification Code</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to{'\n'}
                {maskedEmail}
              </Text>
            </View>
          </ScaleInView>

          <SlideUpView delay={100}>
            <TextInput
              style={styles.codeInput}
              placeholder="000000"
              placeholderTextColor={colors.textSecondary}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              textAlign="center"
            />
          </SlideUpView>

          <SlideUpView delay={150}>
            <TouchableOpacity
              style={[styles.primaryButton, (loading || code.length !== 6) && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={loading || code.length !== 6}
            >
              {loading ? <ActivityIndicator color={colors.black} /> : <Text style={styles.primaryButtonText}>Verify</Text>}
            </TouchableOpacity>
          </SlideUpView>

          <FadeInView delay={200}>
            <TouchableOpacity style={styles.resendButton} onPress={handleResend} disabled={countdown > 0 || sending}>
              <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
                {sending ? 'Sending...' : countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </FadeInView>

          <FadeInView delay={250}>
            <TouchableOpacity style={styles.backButton} onPress={() => { setStep('intro'); setCode(''); }}>
              <Text style={styles.backButtonText}>← Go back</Text>
            </TouchableOpacity>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Email verification intro screen
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ScaleInView delay={0}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail" size={50} color={colors.primaryDarker} />
          </View>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            For your security, please verify your email address to continue.
          </Text>
        </View>
      </ScaleInView>

      <SlideUpView delay={100}>
        <View style={styles.emailCard}>
          <View style={styles.methodIconContainer}>
            <Ionicons name="mail-outline" size={28} color={colors.primaryDarker} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Your Email</Text>
            <Text style={styles.methodSubtitle}>{maskedEmail}</Text>
          </View>
        </View>
      </SlideUpView>

      <SlideUpView delay={150}>
        <TouchableOpacity
          style={[styles.primaryButton, sending && styles.buttonDisabled]}
          onPress={sendVerificationCode}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color={colors.black} />
          ) : (
            <Text style={styles.primaryButtonText}>Send Verification Code</Text>
          )}
        </TouchableOpacity>
      </SlideUpView>

      <FadeInView delay={200}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={colors.primaryDarker} />
          <Text style={styles.infoText}>
            We'll send a 6-digit code to your email. Enter it on the next screen to verify your account.
          </Text>
        </View>
      </FadeInView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
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
    ...shadows.md,
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
  emailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  methodIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  methodSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  codeInput: {
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
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.black,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  resendButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  resendText: {
    fontSize: fontSize.md,
    color: colors.primaryDarker,
    fontWeight: fontWeight.medium,
  },
  resendTextDisabled: {
    color: colors.textSecondary,
  },
  backButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  loadingOverlay: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primarySubtle,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
});
