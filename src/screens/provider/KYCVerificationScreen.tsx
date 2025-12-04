import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { colors, spacing, fontSize, borderRadius, fontWeight } from '../../constants/theme';
import { supabase } from '../../services/supabase';

type VerificationStep = 'intro' | 'verifying' | 'result';
type VerificationResult = 'approved' | 'rejected' | 'manual_review' | null;

interface RouteParams {
  onSuccess?: () => void;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function KYCVerificationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { onSuccess } = (route.params as RouteParams) || {};

  const [step, setStep] = useState<VerificationStep>('intro');
  const [verificationResult, setVerificationResult] = useState<VerificationResult>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;

  // Start Stripe Identity verification
  const startVerification = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();

      const response = await fetch(`${API_URL}/api/verification/kyc/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`,
        },
      });

      const result = await response.json() as { url?: string; kycId?: string; error?: string };

      if (!response.ok) throw new Error(result.error || 'Failed to create verification session');

      // Open Stripe's hosted verification page
      if (result.url && result.kycId) {
        const browserResult = await WebBrowser.openBrowserAsync(result.url, {
          dismissButtonStyle: 'close',
          showTitle: true,
        });

        // After browser closes, start polling for result
        if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
          setStep('verifying');
          pollForResult(result.kycId);
        }
      }
    } catch (error: any) {
      console.error('Stripe verification error:', error);
      Alert.alert('Error', error.message || 'Failed to start verification');
      setLoading(false);
    }
  };

  const pollForResult = async (kycId: string) => {
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 15000,
      useNativeDriver: false,
    }).start();

    let attempts = 0;
    const maxAttempts = 30;

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('kyc_verifications')
          .select('status, rejection_reason')
          .eq('id', kycId)
          .single();

        if (error) throw error;

        if (data.status === 'approved') {
          setVerificationResult('approved');
          setStep('result');
          setLoading(false);
          onSuccess?.();
        } else if (data.status === 'rejected') {
          setVerificationResult('rejected');
          setRejectionReason(data.rejection_reason || 'Verification failed');
          setStep('result');
          setLoading(false);
        } else if (data.status === 'manual_review') {
          setVerificationResult('manual_review');
          setStep('result');
          setLoading(false);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 2000);
        } else {
          setVerificationResult('manual_review');
          setStep('result');
          setLoading(false);
        }
      } catch (error) {
        console.error('Poll error:', error);
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 2000);
        }
      }
    };

    checkStatus();
  };

  const handleRetry = () => {
    setStep('intro');
    setVerificationResult(null);
    setRejectionReason('');
    setLoading(false);
    progressAnim.setValue(0);
  };

  // Render intro screen
  const renderIntro = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🛡️</Text>
        <Text style={styles.headerTitle}>Identity Verification</Text>
        <Text style={styles.headerDescription}>
          Verify your identity to become a trusted provider on Glamora
        </Text>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
        </View>
        <Text style={styles.cardTitle}>Secure Identity Check</Text>
        <Text style={styles.cardDescription}>
          We use Stripe Identity for fast and secure verification. You'll scan your ID and take a selfie.
        </Text>
      </View>

      <View style={styles.featuresList}>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.featureText}>Instant verification (3-20 seconds)</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.featureText}>Supports passport, ID card, driver's license</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.featureText}>Advanced fraud detection</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="lock-closed" size={20} color={colors.success} />
          <Text style={styles.featureText}>Your data is encrypted and secure</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={startVerification}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.black} />
        ) : (
          <Text style={styles.primaryButtonText}>Start Verification</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.privacyNote}>
        🔒 Your documents are processed securely by Stripe and never shared with third parties.
      </Text>
    </ScrollView>
  );

  // Render verifying screen
  const renderVerifying = () => (
    <View style={[styles.container, styles.centerContent]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.verifyingTitle}>Verifying Your Identity</Text>
      <Text style={styles.verifyingDescription}>
        This usually takes 10-60 seconds. Please wait...
      </Text>
      <View style={styles.progressContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <View style={styles.checksList}>
        <Text style={styles.checkItem}>✓ Document authenticity</Text>
        <Text style={styles.checkItem}>✓ Face matching</Text>
        <Text style={styles.checkItem}>✓ Liveness detection</Text>
      </View>
    </View>
  );

  // Render result screen
  const renderResult = () => {
    const isApproved = verificationResult === 'approved';
    const isManualReview = verificationResult === 'manual_review';

    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={[styles.resultIconContainer, {
          backgroundColor: isApproved ? colors.successLight : isManualReview ? colors.warningLight : colors.errorLight
        }]}>
          <Text style={styles.resultIcon}>
            {isApproved ? '✅' : isManualReview ? '⏳' : '❌'}
          </Text>
        </View>

        <Text style={styles.resultTitle}>
          {isApproved ? 'Verification Approved!' : isManualReview ? 'Under Review' : 'Verification Failed'}
        </Text>

        <Text style={styles.resultDescription}>
          {isApproved
            ? "Congratulations! Your identity has been verified. You're now a trusted provider on Glamora."
            : isManualReview
            ? "Your verification is being reviewed by our team. We'll notify you within 24 hours."
            : rejectionReason || 'Please try again with clearer photos of your documents.'}
        </Text>

        {isApproved && (
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text style={styles.badgeText}>Verified Provider</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.primaryButtonText}>
            {isApproved ? 'Continue' : 'Go Back'}
          </Text>
        </TouchableOpacity>

        {!isApproved && !isManualReview && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleRetry}>
            <Text style={styles.secondaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Main render
  if (step === 'verifying') return renderVerifying();
  if (step === 'result') return renderResult();
  return renderIntro();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  headerDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  cardDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresList: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  privacyNote: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  verifyingTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  verifyingDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  checksList: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkItem: {
    fontSize: fontSize.md,
    color: colors.success,
  },
  resultIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  resultIcon: {
    fontSize: 56,
  },
  resultTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  resultDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.round,
    marginBottom: spacing.xl,
  },
  badgeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});

