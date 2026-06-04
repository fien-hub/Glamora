import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from '../../utils/linearGradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '../../utils/icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  // If user is logged in, they shouldn't be on Welcome screen
  // This handles the case where user logged in but didn't complete onboarding
  useEffect(() => {
    if (user) {
      // User is logged in but on Welcome screen - navigation will handle routing to main app
      console.log('User is logged in, navigation should redirect to main app');
    }
  }, [user]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1519415387722-a1c3bbef716c?w=1080&h=1920&fit=crop&q=80' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
          locations={[0, 0.5, 1]}
        >
          <View style={styles.content}>
            {/* Tagline fades in */}
            <FadeInView delay={0}>
              <Text style={styles.tagline}>
                Professional Beauty{'\n'}Delivered to You
              </Text>
            </FadeInView>

            {/* Features slide up with stagger */}
            <View style={styles.features}>
              <SlideUpView delay={200}>
                <FeatureItem icon="checkmark-circle" text="Verified Professionals" />
              </SlideUpView>
              <SlideUpView delay={250}>
                <FeatureItem icon="location" text="At Your Location" />
              </SlideUpView>
              <SlideUpView delay={300}>
                <FeatureItem icon="shield-checkmark" text="Secure & Trusted" />
              </SlideUpView>
            </View>
          </View>

          {/* Buttons slide up with stagger */}
          <View style={styles.buttonContainer}>
            <SlideUpView delay={400}>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate('GuestMain')}
              >
                <Text style={styles.browseButtonText}>Browse Services</Text>
              </TouchableOpacity>
            </SlideUpView>

            <SlideUpView delay={450}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('RoleSelection')}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </TouchableOpacity>
            </SlideUpView>

            <SlideUpView delay={550}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('Login')}
              >
                <BlurView intensity={20} tint="dark" style={styles.secondaryButtonBlur}>
                  <Text style={styles.secondaryButtonText}>Sign In</Text>
                </BlurView>
              </TouchableOpacity>
            </SlideUpView>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const FeatureItem = ({ icon, text }: { icon: string; text: string }) => (
  <View style={styles.featureItem}>
    <Ionicons name={icon} size={20} color={colors.primary} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 2,
  },
  tagline: {
    fontSize: 36,
    fontWeight: fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 44,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  features: {
    width: '100%',
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: fontSize.md,
    color: colors.white,
    fontWeight: fontWeight.semibold,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  buttonContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl + 20,
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    color: colors.black,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  browseButton: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  browseButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  secondaryButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  secondaryButtonBlur: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: borderRadius.xl,
  },
  secondaryButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});

