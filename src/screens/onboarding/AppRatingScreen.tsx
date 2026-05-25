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
import { LinearGradient } from '../../utils/linearGradient';
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
  const [fadeAnim] = useState(new Animated.Value(1));

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

  const handleSkip = () => {
    // Skip entirely — don't force users through the confirm step.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markOnboardingComplete();
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markOnboardingComplete();
  };

  if (step === 'prompt') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.bgLayer}>
          <View style={[styles.bgOrb, styles.bgOrbTop]} />
          <View style={[styles.bgOrb, styles.bgOrbBottom]} />
        </View>

        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <View style={styles.card}>
            <View style={styles.kickerWrap}>
              <Text style={styles.kicker}>WE'D LOVE YOUR REVIEW</Text>
            </View>

            <View style={styles.iconWrap}>
              <Text style={styles.appIcon}>✨</Text>
            </View>

            <Text style={styles.heading}>Enjoying Eve Beauty?</Text>
            <Text style={styles.sub}>
              A quick 5-star rating helps more clients discover trusted beauty professionals near them.
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.starChip}>
                  <Ionicons name="star" size={22} color="#000000" style={styles.star} />
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleRateNow} activeOpacity={0.9}>
              <LinearGradient
                colors={[colors.primaryDarker, colors.primary]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.primaryBtnGradient}
              >
                <Ionicons name="star" size={18} color={colors.white} />
                <Text style={styles.primaryBtnText}>Rate Eve Beauty on the App Store</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleSkip} activeOpacity={0.75}>
              <Text style={styles.secondaryBtnText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgLayer}>
        <View style={[styles.bgOrb, styles.bgOrbTop]} />
        <View style={[styles.bgOrb, styles.bgOrbBottom]} />
      </View>

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.card}>
          <View style={styles.kickerWrap}>
            <Text style={styles.kicker}>FINAL STEP</Text>
          </View>

          <View style={styles.iconWrap}>
            <Text style={styles.appIcon}>🙏</Text>
          </View>

          <Text style={styles.heading}>Did you rate Eve Beauty?</Text>
          <Text style={styles.sub}>
            Please confirm before continuing. If not yet, we will take you back to the rating step.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleDone} activeOpacity={0.9}>
            <LinearGradient
              colors={[colors.primaryDarker, colors.primary]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.primaryBtnGradient}
            >
              <Ionicons name="checkmark-circle" size={18} color={colors.white} />
              <Text style={styles.primaryBtnText}>Yes, I rated it</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => transition('prompt')}
            activeOpacity={0.75}
          >
            <Text style={styles.secondaryBtnText}>Not yet, take me back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { marginTop: 4 }]}
            onPress={handleDone}
            activeOpacity={0.75}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Continue without rating</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FBF6F2',
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.36,
  },
  bgOrbTop: {
    width: 260,
    height: 260,
    backgroundColor: '#EFD0C4',
    top: -70,
    right: -80,
  },
  bgOrbBottom: {
    width: 300,
    height: 300,
    backgroundColor: '#E1C1AD',
    bottom: -140,
    left: -120,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  kickerWrap: {
    alignSelf: 'center',
    backgroundColor: '#F4E8E0',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  kicker: {
    color: colors.primaryDarker,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.7,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: '#F8EDE6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    alignSelf: 'center',
  },
  appIcon: {
    fontSize: 50,
  },
  heading: {
    fontSize: 34,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 40,
  },
  sub: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    gap: 8,
  },
  starChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF4ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    marginTop: 1,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.large,
    paddingHorizontal: spacing.xl,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  secondaryBtn: {
    paddingVertical: spacing.medium,
    alignItems: 'center',
    width: '100%',
    borderRadius: borderRadius.full,
    backgroundColor: '#F6F1EC',
  },
  secondaryBtnText: {
    color: colors.primaryDarker,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
});
