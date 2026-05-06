import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Animated, Image, Dimensions, ScrollView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight } from '../../constants/theme';
import {
  getStartupTimeline,
  recordStartupCheckpoint,
  subscribeToStartupTimeline,
} from '../../utils/startupDiagnostics';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const navigation = useNavigation();
  const { user, loading } = useAuth();
  const [startupTimeline, setStartupTimeline] = useState(getStartupTimeline);
  const animationDoneRef = useRef(false);
  const hasNavigatedRef = useRef(false);

  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;

  // Sparkle animations
  const sparkle1Scale = useRef(new Animated.Value(0)).current;
  const sparkle2Scale = useRef(new Animated.Value(0)).current;
  const sparkle3Scale = useRef(new Animated.Value(0)).current;
  const sparkle1Opacity = useRef(new Animated.Value(0)).current;
  const sparkle2Opacity = useRef(new Animated.Value(0)).current;
  const sparkle3Opacity = useRef(new Animated.Value(0)).current;

  // Shimmer animation
  const shimmerPosition = useRef(new Animated.Value(-width)).current;

  // Called whenever both animation is done AND auth has finished loading.
  // useCallback keeps identity stable so it can be used as a dep below.
  const maybeNavigate = useCallback(async () => {
    if (!animationDoneRef.current) return;
    if (hasNavigatedRef.current) return;

    // If a user session exists, wait for auth hydration. If not signed in,
    // proceed without waiting so token refresh noise can't trap splash.
    if (loading && user) return;

    recordStartupCheckpoint('SplashScreen.maybeNavigate', 'ok', {
      hasUser: !!user,
      loading,
    });

    hasNavigatedRef.current = true;

    // If the user is logged in, the navigator's conditional rendering will
    // automatically move them to the authenticated stack. We don't need to
    // call replace() here — doing so would target a route that no longer
    // exists in the current stack and cause a navigation error.
    if (user) return;

    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      if (hasSeenOnboarding === 'true') {
        (navigation as any).replace('RoleSelection');
      } else {
        (navigation as any).replace('Onboarding');
      }
    } catch {
      (navigation as any).replace('Onboarding');
    }
  }, [loading, user, navigation]);

  // Trigger navigation check whenever auth state settles (loading/user changes).
  useEffect(() => {
    maybeNavigate();
  }, [maybeNavigate]);

  // Absolute deadline: if auth hasn't resolved within 8 seconds of mounting,
  // force navigation so the user is never permanently stuck on the splash screen.
  useEffect(() => {
    const deadline = setTimeout(() => {
      if (hasNavigatedRef.current) return;
      recordStartupCheckpoint('SplashScreen.absoluteDeadline', 'warn', {
        animationDone: animationDoneRef.current,
      });
      hasNavigatedRef.current = true;
      // Navigate using a direct call — bypass the loading gate entirely.
      AsyncStorage.getItem('hasSeenOnboarding')
        .then((val) => {
          if (val === 'true') {
            (navigation as any).navigate('RoleSelection');
          } else {
            (navigation as any).navigate('Onboarding');
          }
        })
        .catch(() => (navigation as any).navigate('Onboarding'));
    }, 8000);

    return () => clearTimeout(deadline);
  // navigation is stable; intentionally omit loading/user so this never resets.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    recordStartupCheckpoint('SplashScreen.mounted', 'ok');
    const unsubscribe = subscribeToStartupTimeline(setStartupTimeline);

    // Main animation sequence - navigate only after animation completes
    Animated.sequence([
      // Logo appears with bounce
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Sparkles appear
      Animated.stagger(150, [
        Animated.parallel([
          Animated.spring(sparkle1Scale, { toValue: 1, friction: 3, useNativeDriver: true }),
          Animated.timing(sparkle1Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(sparkle2Scale, { toValue: 1, friction: 3, useNativeDriver: true }),
          Animated.timing(sparkle2Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(sparkle3Scale, { toValue: 1, friction: 3, useNativeDriver: true }),
          Animated.timing(sparkle3Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
      ]),
      // Text slides up
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
      // Shimmer effect
      Animated.timing(shimmerPosition, {
        toValue: width,
        duration: 800,
        useNativeDriver: true,
      }),
      // Hold for a moment so user can see the full splash
      Animated.delay(800),
    ]).start(() => {
      animationDoneRef.current = true;
      recordStartupCheckpoint('SplashScreen.animationCompleted', 'ok');
      maybeNavigate();
    });

    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      {/* Main logo container */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Shimmer overlay */}
        <Animated.View
          style={[
            styles.shimmer,
            { transform: [{ translateX: shimmerPosition }] },
          ]}
        />
      </Animated.View>

      {/* Sparkles */}
      <Animated.View
        style={[
          styles.sparkle,
          styles.sparkle1,
          {
            opacity: sparkle1Opacity,
            transform: [{ scale: sparkle1Scale }],
          },
        ]}
      >
        <SparkleIcon size={24} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sparkle,
          styles.sparkle2,
          {
            opacity: sparkle2Opacity,
            transform: [{ scale: sparkle2Scale }],
          },
        ]}
      >
        <SparkleIcon size={18} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sparkle,
          styles.sparkle3,
          {
            opacity: sparkle3Opacity,
            transform: [{ scale: sparkle3Scale }],
          },
        ]}
      >
        <SparkleIcon size={20} />
      </Animated.View>

      {/* App name */}
      <Animated.Text
        style={[
          styles.appName,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        Glamora
      </Animated.Text>

      <Animated.Text
        style={[
          styles.tagline,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        Beauty at your doorstep
      </Animated.Text>

      <View style={styles.tracePanel}>
        <Text style={styles.traceTitle}>Startup trace</Text>
        <ScrollView
          style={styles.traceScroll}
          contentContainerStyle={styles.traceContent}
          showsVerticalScrollIndicator={false}
        >
          {startupTimeline.slice(-12).map((entry, index) => {
            const details = entry.details ? ` ${JSON.stringify(entry.details)}` : '';

            return (
              <Text key={`${entry.atMs}-${entry.step}-${index}`} style={styles.traceLine}>
                {`+${entry.atMs}ms ${entry.step} :: ${entry.status}${details}`}
              </Text>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

// Sparkle component
function SparkleIcon({ size = 24 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.sparkleShape, { width: size * 0.15, height: size, backgroundColor: colors.primary }]} />
      <View style={[styles.sparkleShape, { width: size, height: size * 0.15, backgroundColor: colors.primary, position: 'absolute' }]} />
      <View style={[styles.sparkleShape, {
        width: size * 0.1,
        height: size * 0.7,
        backgroundColor: colors.primary,
        position: 'absolute',
        transform: [{ rotate: '45deg' }]
      }]} />
      <View style={[styles.sparkleShape, {
        width: size * 0.7,
        height: size * 0.1,
        backgroundColor: colors.primary,
        position: 'absolute',
        transform: [{ rotate: '45deg' }]
      }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 220,
    height: 220,
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ skewX: '-20deg' }],
  },
  sparkle: {
    position: 'absolute',
  },
  sparkle1: {
    top: '28%',
    left: '20%',
  },
  sparkle2: {
    top: '35%',
    right: '18%',
  },
  sparkle3: {
    top: '55%',
    left: '25%',
  },
  sparkleShape: {
    borderRadius: 2,
  },
  appName: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 30,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
    letterSpacing: 1,
  },
  tracePanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    maxHeight: 220,
    borderRadius: 12,
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  traceTitle: {
    color: '#F9FAFB',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  traceScroll: {
    maxHeight: 180,
  },
  traceContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  traceLine: {
    color: '#D1D5DB',
    fontSize: 11,
    marginBottom: 6,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
});

