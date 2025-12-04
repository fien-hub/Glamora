import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { isAppleAuthAvailable, isGoogleSignInAvailable } from '../../utils/socialAuth';
import { isBiometricAvailable, authenticateWithBiometrics, getBiometricType } from '../../utils/biometricAuth';
import { isBiometricEnabled, isTwoFactorEnabled, getTwoFactorMethod } from '../../utils/twoFactorAuth';
import { supabase } from '../../services/supabase';
import { validateEmail } from '../../utils/validation';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';
import ModernInput from '../../components/ModernInput';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { signIn, signInWithGoogle, signInWithApple, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [googleSignInAvailable, setGoogleSignInAvailable] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [showBiometricButton, setShowBiometricButton] = useState(false);

  // Validation errors
  const [emailError, setEmailError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Check if Apple Auth, Google Sign-In, and Biometric are available
  useEffect(() => {
    isAppleAuthAvailable().then(setAppleAuthAvailable);
    setGoogleSignInAvailable(isGoogleSignInAvailable());
    checkBiometricAvailability();
  }, []);

  // Validate email on change
  useEffect(() => {
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  }, [email]);

  const checkBiometricAvailability = async () => {
    const available = await isBiometricAvailable();
    setBiometricAvailable(available);

    if (available) {
      const type = await getBiometricType();
      setBiometricType(type);

      // Check if user has enabled biometric login
      const enabled = await isBiometricEnabled();
      setShowBiometricButton(enabled);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);

      // Check if 2FA is enabled
      const twoFAEnabled = await isTwoFactorEnabled();
      if (twoFAEnabled) {
        const method = await getTwoFactorMethod();

        // Get user info for phone/email
        const { data: { user } } = await supabase.auth.getUser();

        // Navigate to 2FA verification screen
        navigation.navigate('TwoFactorVerification', {
          email: user?.email,
          phone: user?.phone,
          method,
        });
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      const result = await authenticateWithBiometrics({
        promptMessage: `Sign in with ${biometricType}`,
      });

      if (result.success) {
        // Biometric authentication successful
        // In a real app, you would retrieve stored credentials securely
        // For now, we'll just show a success message
        Alert.alert(
          'Biometric Login',
          'Biometric authentication is enabled but requires stored credentials. Please use email/password login to set up biometric login.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Authentication Failed', result.error || 'Could not authenticate');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Default to customer role for social login
      // User can change role later in settings if needed
      await signInWithGoogle('customer');
    } catch (error: any) {
      Alert.alert('Google Sign-In Failed', error.message || 'Could not sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      // Default to customer role for social login
      await signInWithApple('customer');
    } catch (error: any) {
      Alert.alert('Apple Sign-In Failed', error.message || 'Could not sign in with Apple');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header fades in */}
        <FadeInView delay={0}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>
        </FadeInView>

        {/* Form fields slide up with stagger */}
        <View style={styles.form}>
          <SlideUpView delay={100}>
            <ModernInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              icon="mail-outline"
              error={emailError}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </SlideUpView>

          <SlideUpView delay={150}>
            <View style={styles.forgotPasswordRow}>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <ModernInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              icon="lock-closed-outline"
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
          </SlideUpView>

          <SlideUpView delay={200}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.black} />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </SlideUpView>

          {/* Biometric Login Button */}
          {showBiometricButton && (
            <SlideUpView delay={250}>
              <TouchableOpacity
                style={[styles.biometricButton, loading && styles.buttonDisabled]}
                onPress={handleBiometricLogin}
                disabled={loading}
              >
                <Text style={styles.biometricButtonIcon}>
                  {biometricType.includes('Face') ? '👤' : '👆'}
                </Text>
                <Text style={styles.biometricButtonText}>
                  Sign in with {biometricType}
                </Text>
              </TouchableOpacity>
            </SlideUpView>
          )}

          {/* Social Login Divider - Only show if social auth is available */}
          {(googleSignInAvailable || appleAuthAvailable) && (
            <FadeInView delay={300}>
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>
            </FadeInView>
          )}

          {/* Social Login Buttons */}
          {googleSignInAvailable && (
            <SlideUpView delay={350}>
              <TouchableOpacity
                style={[styles.socialButton, styles.googleButton, loading && styles.buttonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <Text style={styles.socialButtonIcon}>G</Text>
                <Text style={styles.socialButtonText}>Sign in with Google</Text>
              </TouchableOpacity>
            </SlideUpView>
          )}

          {/* Apple Sign-In temporarily disabled - requires Apple Developer account setup */}
          {false && appleAuthAvailable && (
            <SlideUpView delay={400}>
              <TouchableOpacity
                style={[styles.socialButton, styles.appleButton, loading && styles.buttonDisabled]}
                onPress={handleAppleSignIn}
                disabled={loading}
              >
                <Text style={styles.socialButtonIcon}></Text>
                <Text style={[styles.socialButtonText, styles.appleButtonText]}>Sign in with Apple</Text>
              </TouchableOpacity>
            </SlideUpView>
          )}

          <FadeInView delay={450}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Signup')}
              disabled={loading}
            >
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </FadeInView>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxl * 2,
    marginBottom: spacing.xxl,
  },
  logoContainer: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logo: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.xs,
  },
  forgotPasswordText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primaryDarker,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    backgroundColor: colors.white,
    color: colors.text,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: '#EF4444',
    marginTop: spacing.xs,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  eyeIcon: {
    paddingHorizontal: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginTop: spacing.lg,
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
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  biometricButtonIcon: {
    fontSize: fontSize.xl,
    marginRight: spacing.sm,
  },
  biometricButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
  },
  googleButton: {
    borderColor: '#DB4437',
  },
  appleButton: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  socialButtonIcon: {
    fontSize: fontSize.xl,
    marginRight: spacing.sm,
    fontWeight: fontWeight.bold,
  },
  socialButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  appleButtonText: {
    color: colors.white,
  },
  linkButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  linkTextBold: {
    color: colors.primaryDarker,
    fontWeight: fontWeight.bold,
  },
});

