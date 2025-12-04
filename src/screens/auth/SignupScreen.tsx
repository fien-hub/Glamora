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
import { useNavigation, useRoute } from '@react-navigation/native';
import PhoneInput from 'react-native-phone-number-input';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { isAppleAuthAvailable, isGoogleSignInAvailable } from '../../utils/socialAuth';
import { validateEmail, getPasswordStrength, validateName } from '../../utils/validation';
import PasswordStrengthIndicator from '../../components/PasswordStrengthIndicator';
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
  const [phone, setPhone] = useState('');
  const [formattedPhone, setFormattedPhone] = useState('');
  const [role, setRole] = useState<UserRole>(preselectedRole || 'customer');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [googleSignInAvailable, setGoogleSignInAvailable] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');

  // Check if Apple Auth and Google Sign-In are available
  useEffect(() => {
    isAppleAuthAvailable().then(setAppleAuthAvailable);
    setGoogleSignInAvailable(isGoogleSignInAvailable());
  }, []);

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

    if (getPasswordStrength(password) === 'weak') {
      Alert.alert('Weak Password', 'Please use a stronger password with a mix of letters, numbers, and special characters');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Terms & Conditions', 'Please accept the terms and conditions to continue');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, role, firstName, lastName, formattedPhone || phone);
      // Success! Auth system will automatically navigate to complete profile
      // No alert needed - navigation happens automatically
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Could not create account');
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      await signInWithGoogle(role);
      // Success! Auth system will automatically navigate to complete profile
      // No alert needed - navigation happens automatically
    } catch (error: any) {
      Alert.alert('Google Sign-Up Failed', error.message || 'Could not sign up with Google');
      setLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    setLoading(true);
    try {
      await signInWithApple(role);
      // Success! Auth system will automatically navigate to complete profile
      // No alert needed - navigation happens automatically
    } catch (error: any) {
      Alert.alert('Apple Sign-Up Failed', error.message || 'Could not sign up with Apple');
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Glamora today</Text>
          </View>
        </FadeInView>

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
                />
              </View>
              <View style={styles.halfWidth}>
                <ModernInput
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  icon="person-outline"
                  error={lastNameError}
                  required
                  editable={!loading}
                  autoCapitalize="words"
                />
              </View>
            </View>
          </SlideUpView>

          {/* Email field slides up */}
          <SlideUpView delay={200}>
            <ModernInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              icon="mail-outline"
              error={emailError}
              required
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </SlideUpView>

          {/* Phone field slides up */}
          <SlideUpView delay={250}>
            <View style={styles.phoneWrapper}>
              <Text style={styles.phoneLabel}>Phone Number <Text style={styles.optionalText}>(optional)</Text></Text>
              <PhoneInput
                defaultCode="US"
                layout="first"
                value={phone}
                onChangeText={setPhone}
                onChangeFormattedText={setFormattedPhone}
                containerStyle={styles.phoneContainer}
                textContainerStyle={styles.phoneTextContainer}
                textInputStyle={styles.phoneInput}
                codeTextStyle={styles.phoneCodeText}
                flagButtonStyle={styles.flagButton}
                disabled={loading}
              />
            </View>
          </SlideUpView>

          {/* Password field slides up */}
          <SlideUpView delay={300}>
            <ModernInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              icon="lock-closed-outline"
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              required
              secureTextEntry={!showPassword}
              editable={!loading}
              hint="Minimum 8 characters"
            />
            <PasswordStrengthIndicator password={password} />
          </SlideUpView>

          {/* Confirm password field slides up */}
          <SlideUpView delay={350}>
            <ModernInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              icon="lock-closed-outline"
              rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
              error={confirmPasswordError}
              required
              secureTextEntry={!showConfirmPassword}
              editable={!loading}
            />
          </SlideUpView>

          {/* Terms checkbox slides up */}
          <SlideUpView delay={400}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              disabled={loading}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms && <Text style={styles.checkboxIcon}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                I agree to the <Text style={styles.linkTextBold}>Terms & Conditions</Text> and <Text style={styles.linkTextBold}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
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

          {/* Social Login Divider - Only show if social auth is available */}
          {(googleSignInAvailable || appleAuthAvailable) && (
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>
          )}

          {/* Social Login Buttons */}
          {googleSignInAvailable && (
            <TouchableOpacity
              style={[styles.socialButton, styles.googleButton, loading && styles.buttonDisabled]}
              onPress={handleGoogleSignUp}
              disabled={loading}
            >
              <Text style={styles.socialButtonIcon}>G</Text>
              <Text style={styles.socialButtonText}>Sign up with Google</Text>
            </TouchableOpacity>
          )}

          {/* Apple Sign-In temporarily disabled - requires Apple Developer account setup */}
          {false && appleAuthAvailable && (
            <TouchableOpacity
              style={[styles.socialButton, styles.appleButton, loading && styles.buttonDisabled]}
              onPress={handleAppleSignUp}
              disabled={loading}
            >
              <Text style={styles.socialButtonIcon}></Text>
              <Text style={[styles.socialButtonText, styles.appleButtonText]}>Sign up with Apple</Text>
            </TouchableOpacity>
          )}

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
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxl * 2,
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
    borderWidth: 1,
    borderColor: colors.border,
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
  phoneWrapper: {
    marginBottom: spacing.lg,
  },
  phoneLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
    fontWeight: fontWeight.medium,
  },
  requiredStar: {
    color: '#EF4444',
    fontWeight: fontWeight.bold,
  },
  optionalText: {
    color: colors.textSecondary,
    fontWeight: fontWeight.regular,
    fontSize: fontSize.xs,
  },
  phoneContainer: {
    width: '100%',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  phoneTextContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xs,
  },
  phoneInput: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  phoneCodeText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  flagButton: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxIcon: {
    color: colors.black,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
});

