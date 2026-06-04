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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { Ionicons } from '../../utils/icons';
import Haptics from '../../utils/haptics';

let StoreReview: typeof import('expo-store-review') | null = null;
try { StoreReview = require('expo-store-review'); } catch (e) { console.warn('[AppRatingScreen] expo-store-review unavailable:', e); }

type Step = 'prompt' | 'confirm';

export default function AppRatingScreen() {
  const { markOnboardingComplete, userRole } = useAuth();
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<Step>('prompt');
  const [fadeAnim] = useState(new Animated.Value(1));
  const [selectedRating, setSelectedRating] = useState(0);

  // Explicit navigation to main app — more reliable than relying solely on
  // the navigator branch switching after markOnboardingComplete().
  const finishOnboarding = () => {
    markOnboardingComplete();
    const dest = userRole === 'provider' ? 'ProviderMain' : 'CustomerMain';
    navigation.reset({ index: 0, routes: [{ name: dest }] });
  };

  const transition = (nextStep: Step) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
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
    transition('confirm');
  };

  const triggerRateFlow = async (rating?: number) => {
    if (typeof rating === 'number') {
      setSelectedRating(rating);
    }
    await handleRateNow();
  };

  const handleSkip = () => {
    // Skip entirely — don't force users through the confirm step.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    finishOnboarding();
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    finishOnboarding();
  };

  if (step === 'prompt') {
    return (
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <View style={styles.iconWrap}>
            <Text style={styles.appIcon}>✨</Text>
          </View>

          <Text style={styles.heading}>Enjoying Eve Beauty?</Text>
          <Text style={styles.sub}>
            Your review helps us reach more people who need beautiful, convenient beauty services.
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.starChip,
                  selectedRating >= i && styles.starChipSelected,
                ]}
                onPress={() => triggerRateFlow(i)}
                activeOpacity={0.75}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={selectedRating >= i ? 'star' : 'star-outline'}
                  size={24}
                  color={selectedRating >= i ? colors.primary : '#000000'}
                  style={styles.star}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => triggerRateFlow()} activeOpacity={0.85}>
            <Ionicons name="star" size={18} color={colors.white} />
            <Text style={styles.primaryBtnText}>Rate Eve Beauty on the App Store</Text>
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
          <Text style={styles.appIcon}>🙏</Text>
        </View>

        <Text style={styles.heading}>Did you rate Eve Beauty?</Text>
        <Text style={styles.sub}>
          Please confirm before continuing. If you have not rated yet, we will take you back to the rating step.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleDone} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={18} color={colors.white} />
          <Text style={styles.primaryBtnText}>Yes, I rated it! 🌟</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => transition('prompt')}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryBtnText}>Not yet, take me back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { marginTop: 4 }]}
          onPress={handleDone}
          activeOpacity={0.7}
        >
          <Text style={[styles.secondaryBtnText, { opacity: 0.6 }]}>Continue without rating</Text>
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
    justifyContent: 'center',
    position: 'relative',
    zIndex: 2,
    marginBottom: spacing.xxxl,
  },
  starChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF4ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  starChipSelected: {
    backgroundColor: '#FDEEE4',
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  star: {
    marginTop: 1,
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
