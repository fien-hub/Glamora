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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';
import ScaleInView from '../../components/animations/ScaleInView';

type VerificationStep = 'intro' | 'verify';

export default function AccountVerificationScreen() {
  const navigation = useNavigation<any>();
  const { user, userRole, needsOnboarding, refreshVerificationStatus, signOut } = useAuth();
  const [step, setStep] = useState<VerificationStep>('intro');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const userEmail = user?.email || '';

  const isEmailNotFoundError = (message: string) => {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('user not found') ||
      normalized.includes('email not found') ||
      normalized.includes('no user found') ||
      normalized.includes('does not exist') ||
      normalized.includes('invalid login credentials')
    );
  };

  const getVerificationSendErrorMessage = (errorMessage?: string) => {
    if (!errorMessage) {
      return 'Failed to send verification code';
    }

    if (isEmailNotFoundError(errorMessage)) {
      return 'This email address does not exist. Please check your email or create an account first.';
    }

    return errorMessage;
  };

  const promptSignOutToChangeEmail = () => {
    Alert.alert(
      'Use a Different Email?',
      'Sign out and go back to login so you can sign in or create an account with a different email address.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch {
              Alert.alert('Error', 'Unable to sign out right now. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getVerificationCheckErrorMessage = (errorMessage?: string) => {
    if (!errorMessage) {
      return 'Invalid code';
    }

    if (isEmailNotFoundError(errorMessage)) {
      return 'This email address does not exist. Please check your email or create an account first.';
    }

    return errorMessage;
  };

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const navigateToNextStep = () => {
    if (userRole === 'customer' && needsOnboarding) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Personalization' }],
      });
      return;
    }

    if (userRole === 'provider' && needsOnboarding) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'ProviderOnboarding' }],
      });
      return;
    }

    if (userRole === 'customer') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'CustomerMain' }],
      });
      return;
    }

    if (userRole === 'provider') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'ProviderMain' }],
      });
      return;
    }

    navigation.navigate('RoleSelection');
  };

  const sendVerificationCode = async () => {
    if (sending) return;

    if (!userEmail) {
      Alert.alert('Email Required', 'No email address was found for this account. Please sign in again.');
      return;
    }

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
      const friendlyMessage = getVerificationSendErrorMessage(error?.message);
      if (isEmailNotFoundError(error?.message || '')) {
        Alert.alert('Email Not Found', friendlyMessage, [
          { text: 'OK', style: 'cancel' },
          { text: 'Use Different Email', onPress: promptSignOutToChangeEmail },
        ]);
      } else {
        Alert.alert('Error', friendlyMessage);
      }
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

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ email_verified: true })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      Alert.alert('Success', 'Your email has been verified!', [
        {
          text: 'OK',
          onPress: async () => {
            await refreshVerificationStatus?.();
            navigateToNextStep();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Verification Failed', getVerificationCheckErrorMessage(error?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDevVerifyWithoutEmail = async () => {
    if (!__DEV__) return;

    if (!user?.id) {
      Alert.alert('Error', 'No active user found. Please sign in again.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ email_verified: true })
        .eq('user_id', user.id);

      if (error) throw error;

      Alert.alert('Dev Success', 'Email verification was marked as complete for this account.', [
        {
          text: 'Continue',
          onPress: async () => {
            await refreshVerificationStatus?.();
            navigateToNextStep();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to mark email as verified.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (countdown > 0 || sending) return;
    sendVerificationCode();
  };

  const handleGoBack = () => {
    promptSignOutToChangeEmail();
  };

  const maskedEmail = userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  if (step === 'verify') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backButtonTop}
            onPress={() => {
              setStep('intro');
              setCode('');
            }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ScaleInView delay={0}>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="mail" size={40} color={colors.primaryDarker} />
              </View>
              <Text style={styles.title}>Enter Verification Code</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to{`\n`}
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
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Verify</Text>}
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setStep('intro');
                setCode('');
              }}
            >
              <Text style={styles.backButtonText}>← Go back</Text>
            </TouchableOpacity>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity style={styles.backButtonTop} onPress={handleGoBack}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <ScaleInView delay={0}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail" size={50} color={colors.primaryDarker} />
          </View>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>For your security, please verify your email address to continue.</Text>
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
          {sending ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Send Verification Code</Text>}
        </TouchableOpacity>
      </SlideUpView>

      {__DEV__ && (
        <FadeInView delay={170}>
          <TouchableOpacity
            style={[styles.devBypassButton, loading && styles.buttonDisabled]}
            onPress={handleDevVerifyWithoutEmail}
            disabled={loading}
          >
            <Text style={styles.devBypassButtonText}>{loading ? 'Processing...' : 'Dev: Verify Without Email'}</Text>
          </TouchableOpacity>
        </FadeInView>
      )}

      <FadeInView delay={200}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={colors.primaryDarker} />
          <Text style={styles.infoText}>
            We&apos;ll send a 6-digit code to your email. Enter it on the next screen to verify your account.
          </Text>
        </View>
      </FadeInView>

      <FadeInView delay={220}>
        <TouchableOpacity style={styles.changeEmailButton} onPress={promptSignOutToChangeEmail}>
          <Text style={styles.changeEmailText}>Use a different email</Text>
        </TouchableOpacity>
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
  backButtonTop: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
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
    backgroundColor: colors.primaryDarker,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  skipButton: {
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.white,
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
  changeEmailButton: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  changeEmailText: {
    color: colors.primaryDarker,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  devBypassButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primaryDarker,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  devBypassButtonText: {
    color: colors.primaryDarker,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
