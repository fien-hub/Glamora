import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { Ionicons } from '../../utils/icons';
import Haptics from '../../utils/haptics';

let StoreReview: typeof import('expo-store-review') | null = null;
try { StoreReview = require('expo-store-review'); } catch (e) { console.warn('[AppRatingScreen] expo-store-review unavailable:', e); }

type Step = 'prompt' | 'confirm';

export default function AppRatingScreen() {
  const { markOnboardingComplete } = useAuth();
  const [step, setStep] = useState<Step>('prompt');
  const [userRated, setUserRated] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));

  const transition = (nextStep: Step, didRate = false) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setUserRated(didRate);
      setStep(nextStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  };

  const handleRateNow = async () => {
    try {
      if (StoreReview && await StoreReview.isAvailableAsync()) {
        await StoreReview.requestReview();
      }
    } catch (e) {
      console.warn('[AppRatingScreen] StoreReview.requestReview failed:', e);
    }
    transition('confirm', true);
  };

  const handleSkip = () => {
    transition('confirm', false);
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markOnboardingComplete();
  };

  if (step === 'prompt') {
    return (
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <View style={styles.iconWrap}>
            <Text style={styles.appIcon}>✨</Text>
          </View>

          <Text style={styles.heading}>Enjoying Glamora?</Text>
          <Text style={styles.sub}>
            Your review helps us reach more people who need beautiful, convenient beauty services.
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons key={i} name="star" size={36} color={colors.primary} style={styles.star} />
            ))}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleRateNow} activeOpacity={0.85}>
            <Ionicons name="star" size={18} color={colors.white} />
            <Text style={styles.primaryBtnText}>Rate Glamora on the App Store</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.secondaryBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.iconWrap}>
          <Text style={styles.appIcon}>{userRated ? '🎉' : '🙏'}</Text>
        </View>

        <Text style={styles.heading}>
          {userRated ? 'Thank you so much!' : 'Did you rate Glamora?'}
        </Text>
        <Text style={styles.sub}>
          {userRated
            ? 'Your support means the world to us. We hope Glamora brings beauty right to your door.'
            : 'No worries! You can always rate us later in the App Store. We appreciate your support either way.'}
        </Text>

        {!userRated && (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleDone} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle" size={18} color={colors.white} />
            <Text style={styles.primaryBtnText}>Yes, I rated it! 🌟</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={userRated ? styles.primaryBtn : styles.secondaryBtn}
          onPress={handleDone}
          activeOpacity={userRated ? 0.85 : 0.7}
        >
          <Text style={userRated ? styles.primaryBtnText : styles.secondaryBtnText}>
            {userRated ? "Let's get started!" : 'Not yet'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: colors.primaryLighter,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  appIcon: {
    fontSize: 52,
  },
  heading: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  sub: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xxxl,
    paddingHorizontal: spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: spacing.xxxl,
  },
  star: {
    marginHorizontal: 4,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.large,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    width: '100%',
    gap: 8,
    marginBottom: spacing.sm,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  secondaryBtn: {
    paddingVertical: spacing.medium,
    alignItems: 'center',
    width: '100%',
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
