import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  ScrollView,
  ImageBackground,
  StatusBar,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserRole } from '../../types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { soundService } from '../../services/soundService';
import { useAuth } from '../../contexts/AuthContext';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';
import ScaleInView from '../../components/animations/ScaleInView';



interface RoleOption {
  role: UserRole;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  features: string[];
}

const roleOptions: RoleOption[] = [
  {
    role: 'customer',
    icon: 'person',
    title: "I'm a Customer",
    description: 'Book beauty services at your convenience',
    features: [
      'Browse verified professionals',
      'Book services at your location',
      'Secure payments',
      'Rate and review services',
    ],
  },
  {
    role: 'provider',
    icon: 'briefcase',
    title: "I'm a Provider",
    description: 'Offer your beauty services to customers',
    features: [
      'Create your professional profile',
      'Manage your bookings',
      'Set your own prices',
      'Grow your business',
    ],
  },
];

export default function RoleSelectionScreen() {
  const navigation = useNavigation<any>();
  const { height } = useWindowDimensions();
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const isSmallPhone = height <= 780;

  const handleRoleSelect = async (role: UserRole) => {
    await soundService.playClick();
    setSelectedRole(role);
    
    // Animate selection
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleContinue = async () => {
    await soundService.playClick();
    if (selectedRole) {
      navigation.navigate('Signup', { preselectedRole: selectedRole });
    }
  };

  const handleSignIn = async () => {
    await soundService.playClick();
    navigation.navigate('Login');
  };

  const handleGoogleSignIn = async () => {
    if (!selectedRole) return;
    setLoading(true);
    try {
      await signInWithGoogle(selectedRole);
    } catch (error: any) {
      Alert.alert('Google Sign-In Failed', error.message || 'Could not sign in with Google');
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (!selectedRole) return;
    setLoading(true);
    try {
      await signInWithApple(selectedRole);
    } catch (error: any) {
      Alert.alert('Apple Sign-In Failed', error.message || 'Could not sign in with Apple');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1080&h=1920&fit=crop&q=80' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0.85)']}
          style={styles.gradient}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header fades in */}
            <FadeInView delay={0}>
              <View style={[styles.header, isSmallPhone && styles.headerCompact]}>
                <Text style={styles.title}>Join Glamora</Text>
                <Text style={styles.subtitle}>Choose how you want to use Glamora</Text>
              </View>
            </FadeInView>

        {/* Role cards scale in with stagger */}
        <View style={[styles.rolesContainer, isSmallPhone && styles.rolesContainerCompact]}>
          {roleOptions.map((option, index) => (
            <ScaleInView key={option.role} delay={100 + index * 100}>
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  isSmallPhone && styles.roleCardCompact,
                  selectedRole === option.role && styles.roleCardSelected,
                ]}
                onPress={() => handleRoleSelect(option.role)}
                activeOpacity={0.7}
              >
                <View style={styles.roleHeader}>
                  <View style={[styles.roleIconContainer, isSmallPhone && styles.roleIconContainerCompact]}>
                    <Ionicons name={option.icon} size={isSmallPhone ? 24 : 28} color={colors.primary} />
                  </View>
                  <View style={styles.radioButton}>
                    {selectedRole === option.role && <View style={styles.radioButtonInner} />}
                  </View>
                </View>

                <Text style={[styles.roleTitle, isSmallPhone && styles.roleTitleCompact]}>{option.title}</Text>
                <Text
                  style={[styles.roleDescription, isSmallPhone && styles.roleDescriptionCompact]}
                  numberOfLines={2}
                >
                  {option.description}
                </Text>

                <View style={styles.featuresContainer}>
                  {option.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureItem}>
                      <Text style={styles.featureIcon}>✓</Text>
                      <Text style={[styles.featureText, isSmallPhone && styles.featureTextCompact]} numberOfLines={1}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            </ScaleInView>
          ))}
        </View>

        {/* Footer buttons slide up */}
        <View style={[styles.footer, isSmallPhone && styles.footerCompact]}>
          <SlideUpView delay={300}>
            <TouchableOpacity
              style={[styles.continueButton, !selectedRole && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={!selectedRole}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </SlideUpView>

          {selectedRole && (
            <SlideUpView delay={350}>
              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity
                  style={[styles.socialButton, loading && styles.continueButtonDisabled]}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={22} color={colors.error} />
                      <Text style={styles.socialButtonText}>Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.socialButton, loading && styles.continueButtonDisabled]}
                  onPress={handleAppleSignIn}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <>
                      <Ionicons name="logo-apple" size={22} color={colors.text} />
                      <Text style={styles.socialButtonText}>Apple</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </SlideUpView>
          )}

          <SlideUpView delay={400}>
            <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
              <Text style={styles.signInText}>
                Already have an account? <Text style={styles.signInTextBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </SlideUpView>
        </View>
      </ScrollView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.lg,
  },
  headerCompact: {
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  rolesContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  rolesContainerCompact: {
    gap: spacing.sm,
  },
  roleCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    minHeight: 212,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  roleCardCompact: {
    padding: spacing.md,
    minHeight: 196,
  },
  roleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    borderWidth: 3,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  roleIconContainer: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleIconContainerCompact: {
    width: 44,
    height: 44,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  roleTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  roleTitleCompact: {
    fontSize: fontSize.md,
  },
  roleDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  roleDescriptionCompact: {
    marginBottom: spacing.sm,
  },
  featuresContainer: {
    gap: spacing.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: fontSize.sm,
    color: colors.black,
    marginRight: spacing.sm,
    fontWeight: fontWeight.bold,
  },
  featureText: {
    fontSize: fontSize.xs,
    color: colors.text,
    flex: 1,
  },
  featureTextCompact: {
    fontSize: fontSize.xs,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    marginTop: spacing.lg,
  },
  footerCompact: {
    marginTop: spacing.md,
  },
  continueButton: {
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
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: colors.black,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    minHeight: 56,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  socialButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  signInButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  signInText: {
    fontSize: fontSize.md,
    color: colors.white,
    opacity: 0.8,
  },
  signInTextBold: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
    opacity: 1,
  },
});

