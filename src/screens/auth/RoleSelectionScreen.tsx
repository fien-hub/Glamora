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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserRole } from '../../types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
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
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleRoleSelect = (role: UserRole) => {
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

  const handleContinue = () => {
    if (selectedRole) {
      navigation.navigate('Signup', { preselectedRole: selectedRole });
    }
  };

  const handleSignIn = () => {
    navigation.navigate('Login');
  };

  const handleResetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem('hasSeenOnboarding');
      Alert.alert('Success', 'Onboarding reset! The app will now restart.', [
        {
          text: 'OK',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Splash' }],
            });
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to reset onboarding');
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
          {/* Debug button - remove in production */}
          <TouchableOpacity
            style={styles.debugButton}
            onPress={handleResetOnboarding}
          >
            <Text style={styles.debugButtonText}>🔄 Reset Onboarding</Text>
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header fades in */}
            <FadeInView delay={0}>
              <View style={styles.header}>
                <Text style={styles.title}>Join Glamora</Text>
                <Text style={styles.subtitle}>Choose how you want to use Glamora</Text>
              </View>
            </FadeInView>

        {/* Role cards scale in with stagger */}
        <View style={styles.rolesContainer}>
          {roleOptions.map((option, index) => (
            <ScaleInView key={option.role} delay={100 + index * 100}>
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  selectedRole === option.role && styles.roleCardSelected,
                ]}
                onPress={() => handleRoleSelect(option.role)}
                activeOpacity={0.7}
              >
                <View style={styles.roleHeader}>
                  <View style={styles.roleIconContainer}>
                    <Ionicons name={option.icon} size={40} color={colors.primary} />
                  </View>
                  <View style={styles.radioButton}>
                    {selectedRole === option.role && <View style={styles.radioButtonInner} />}
                  </View>
                </View>

                <Text style={styles.roleTitle}>{option.title}</Text>
                <Text style={styles.roleDescription}>{option.description}</Text>

                <View style={styles.featuresContainer}>
                  {option.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureItem}>
                      <Text style={styles.featureIcon}>✓</Text>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            </ScaleInView>
          ))}
        </View>

        {/* Footer buttons slide up */}
        <View style={styles.footer}>
          <SlideUpView delay={300}>
            <TouchableOpacity
              style={[styles.continueButton, !selectedRole && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={!selectedRole}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </SlideUpView>

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
    paddingBottom: spacing.xl,
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
    gap: spacing.lg,
  },
  roleCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  roleDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  featuresContainer: {
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: fontSize.md,
    color: colors.black,
    marginRight: spacing.sm,
    fontWeight: fontWeight.bold,
  },
  featureText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    marginTop: spacing.xxl,
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
  debugButton: {
    position: 'absolute',
    top: 50,
    right: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  debugButtonText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
});

