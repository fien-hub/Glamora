import React, { useState, useEffect, useRef } from 'react';
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
  Linking,
  TextInput,
} from 'react-native';
import { Ionicons } from '../../utils/icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { validateEmail, validateName } from '../../utils/validation';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';
import ModernInput from '../../components/ModernInput';

export default function SignupScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { signUp, signInWithGoogle, signInWithApple } = useAuth();

  // Get preselected role from navigation params
  const preselectedRole = route.params?.preselectedRole as UserRole | undefined;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>(preselectedRole || 'customer');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');

  // Validate email on change
  useEffect(() => {
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  }, [email]);

  // Validate first name on change
  useEffect(() => {
    if (firstName && !validateName(firstName)) {
      setFirstNameError('Please enter a valid first name');
    } else {
      setFirstNameError('');
    }
  }, [firstName]);

  // Validate last name on change
  useEffect(() => {
    if (lastName && !validateName(lastName)) {
      setLastNameError('Please enter a valid last name');
    } else {
      setLastNameError('');
    }
  }, [lastName]);

  // Validate password match on change
  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
    } else {
      setConfirmPasswordError('');
    }
  }, [password, confirmPassword]);

  const handleSignup = async () => {
    // Validate all fields
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!validateName(firstName)) {
      Alert.alert('Error', 'Please enter a valid first name');
      return;
    }

    if (!validateName(lastName)) {
      Alert.alert('Error', 'Please enter a valid last name');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, role, firstName, lastName);
      // Explicitly navigate to onboarding to avoid the brief RoleSelection flash
      // that occurs while auth state propagates through context.
      if (role === 'provider') {
        navigation.navigate('ProviderOnboarding');
      } else {
        navigation.navigate('Personalization');
      }
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Could not create account');
      setLoading(false);
    }
  };

  const handleOpenTerms = () => {
    const termsUrl = 'https://www.termsfeed.com/live/6bfa6e5e-f1d2-4c95-a306-7e4f4e3b3cc5';
    Linking.openURL(termsUrl).catch(err => 
      Alert.alert('Error', 'Unable to open Terms & Conditions')
    );
  };

  const handleOpenPrivacy = () => {
    const privacyUrl = 'https://www.freeprivacypolicy.com/live/b955f068-3a35-49fa-a6de-46a938bf6b71';
    Linking.openURL(privacyUrl).catch(err => 
      Alert.alert('Error', 'Unable to open Privacy Policy')
    );
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle(role);
    } catch (error: any) {
      Alert.alert('Google Sign-In Failed', error.message || 'Could not sign in with Google');
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithApple(role);
    } catch (error: any) {
      Alert.alert('Apple Sign-In Failed', error.message || 'Could not sign in with Apple');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back button to change role */}
        <TouchableOpacity
          style={styles.backButtonTop}
          onPress={() => navigation.navigate('RoleSelection')}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Header fades in */}
        <FadeInView delay={0}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Glamora today</Text>
          </View>
        </FadeInView>

        <View style={styles.formWrapper}>
        <View style={styles.form}>
          {/* Role indicator slides up */}
          <SlideUpView delay={100}>
            <View style={styles.roleIndicator}>
              <Text style={styles.roleIndicatorText}>
                Signing up as: <Text style={styles.roleIndicatorBold}>{role === 'customer' ? 'Customer' : 'Provider'}</Text>
              </Text>
            </View>
          </SlideUpView>

          {/* Name fields slide up */}
          <SlideUpView delay={150}>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <ModernInput
                  label="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  icon="person-outline"
                  error={firstNameError}
                  required
                  editable={!loading}
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="givenName"
                  autoComplete="name-given"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                />
              </View>
              <View style={styles.halfWidth}>
                <ModernInput
                  ref={lastNameRef}
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  icon="person-outline"
                  error={lastNameError}
                  required
                  editable={!loading}
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="familyName"
                  autoComplete="name-family"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
            </View>
          </SlideUpView>

          {/* Email field slides up */}
          <SlideUpView delay={200}>
            <ModernInput
              ref={emailRef}
              label="Email"
              value={email}
              onChangeText={setEmail}
              icon="mail-outline"
              error={emailError}
              required
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              editable={!loading}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </SlideUpView>

          {/* Password field slides up */}
          <SlideUpView delay={250}>
            <ModernInput
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={setPassword}
              icon="lock-closed-outline"
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              required
              secureTextEntry={!showPassword}
              textContentType="newPassword"
              autoComplete="new-password"
              passwordRules="minlength: 8;"
              editable={!loading}
              hint="Minimum 8 characters"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            />
          </SlideUpView>

          {/* Confirm password field slides up */}
          <SlideUpView delay={350}>
            <ModernInput
              ref={confirmPasswordRef}
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              icon="lock-closed-outline"
              rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
              error={confirmPasswordError}
              required
              secureTextEntry={!showConfirmPassword}
              textContentType="none"
              autoComplete="off"
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleSignup}
            />
          </SlideUpView>

          <SlideUpView delay={400}>
            <Text style={styles.termsNotice}>
              By creating an account, you agree to the{' '}
              <Text style={styles.linkTextBold} onPress={handleOpenTerms}>
                Terms & Conditions
              </Text>
              {' '}and{' '}
              <Text style={styles.linkTextBold} onPress={handleOpenPrivacy}>
                Privacy Policy
              </Text>
              .
            </Text>
          </SlideUpView>

          {/* Create account button slides up */}
          <SlideUpView delay={450}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </SlideUpView>

          <FadeInView delay={500}>
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

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
          >
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkTextBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
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
    marginBottom: spacing.xl,
  },
  formWrapper: {
    width: '90%',
    maxWidth: 328,
    alignSelf: 'center',
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
  form: {
    flex: 1,
  },
  roleSelector: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  roleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: colors.primaryDarker,
    backgroundColor: colors.primaryDarker,
  },
  roleButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  roleButtonTextActive: {
    color: colors.white,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    backgroundColor: colors.white,
    color: colors.text,
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
    marginTop: spacing.md,
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
    marginTop: spacing.md,
    alignItems: 'center',
  },
  linkText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  linkTextBold: {
    color: colors.primaryDarker,
    fontWeight: fontWeight.bold,
  },
  roleIndicator: {
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  roleIndicatorText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  roleIndicatorBold: {
    fontWeight: fontWeight.bold,
    color: colors.primaryDarker,
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
  termsNotice: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: fontSize.sm * 1.5,
    textAlign: 'center',
  },
});

