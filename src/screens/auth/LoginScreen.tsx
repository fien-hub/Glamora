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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { isBiometricAvailable, authenticateWithBiometrics, getBiometricType } from '../../utils/biometricAuth';
import { isBiometricEnabled, isTwoFactorEnabled, getTwoFactorMethod } from '../../utils/twoFactorAuth';
import { supabase } from '../../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserRole } from '../../types';
import { validateEmail } from '../../utils/validation';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';
import ModernInput from '../../components/ModernInput';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { signIn, signInWithGoogle, signInWithApple, user } = useAuth();
  const selectedRole = (route.params?.preselectedRole as UserRole | undefined) || 'customer';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [showBiometricButton, setShowBiometricButton] = useState(false);

  // Validation errors
  const [emailError, setEmailError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Check if Biometric is available
  useEffect(() => {
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
      await signInWithGoogle(selectedRole);
    } catch (error: any) {
      Alert.alert('Google Sign-In Failed', error.message || 'Could not sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithApple(selectedRole);
    } catch (error: any) {
      Alert.alert('Apple Sign-In Failed', error.message || 'Could not sign in with Apple');
    } finally {
      setLoading(false);
    }
  };

  const handleDevResetIntro = async () => {
    try {
      await AsyncStorage.removeItem('hasSeenOnboarding');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Splash' }],
      });
    } catch (error: any) {
      Alert.alert('Reset Failed', error.message || 'Could not reset intro flow');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.backButtonTop}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Welcome'))}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Header fades in */}
        <FadeInView delay={0}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>
        </FadeInView>

        {/* Form fields slide up with stagger */}
        <View style={styles.formWrapper}>
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

          <FadeInView delay={280}>
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity
                style={[styles.socialButton, loading && styles.buttonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <Ionicons name="logo-google" size={20} color={colors.error} />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, loading && styles.buttonDisabled]}
                onPress={handleAppleSignIn}
                disabled={loading}
              >
                <Ionicons name="logo-apple" size={20} color={colors.text} />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            </View>
          </FadeInView>

          <FadeInView delay={300}>
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

          {__DEV__ && (
            <FadeInView delay={320}>
              <TouchableOpacity
                style={styles.devResetButton}
                onPress={handleDevResetIntro}
                disabled={loading}
              >
                <Text style={styles.devResetText}>DEV: Reset intro flow</Text>
              </TouchableOpacity>
            </FadeInView>
          )}
        </View>
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  backButtonTop: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  formWrapper: {
    width: '86%',
    maxWidth: 300,
    alignSelf: 'center',
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
  socialButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    gap: spacing.xs,
  },
  socialButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  linkButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  devResetButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  devResetText: {
    fontSize: fontSize.sm,
    color: colors.primaryDarker,
    fontWeight: fontWeight.medium,
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

