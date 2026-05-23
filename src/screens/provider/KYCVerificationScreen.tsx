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
import { Ionicons } from '../../utils/icons';
import { colors, spacing, fontSize, borderRadius, fontWeight } from '../../constants/theme';
import { supabase } from '../../services/supabase';

type VerificationStep = 'intro' | 'verifying' | 'result';
type VerificationResult = 'approved' | 'rejected' | 'manual_review' | null;

interface RouteParams {
  onSuccess?: () => void;
}

export default function KYCVerificationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { onSuccess } = (route.params as RouteParams) || {};

  const [step, setStep] = useState<VerificationStep>('intro');
  const [verificationResult, setVerificationResult] = useState<VerificationResult>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;

  // Route to manual KYC document verification screen (human-reviewed documents)
  const startVerification = async () => {
    try {
      (navigation as any).navigate('Verification');
    } catch (error: any) {
      console.error('Hosted verification error:', error);
      Alert.alert('Error', error.message || 'Failed to open verification flow');
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
        <Text style={styles.headerTitle}>KYC Verification</Text>
        <Text style={styles.headerDescription}>
          Submit your KYC documents for human review to become a trusted provider on Eve Beauty
        </Text>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
        </View>
        <Text style={styles.cardTitle}>Human-Reviewed Verification</Text>
        <Text style={styles.cardDescription}>
          Our trust & safety team manually reviews your ID and business documents.
        </Text>
      </View>

      <View style={styles.featuresList}>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.featureText}>Manual review by our trust team</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.featureText}>Supports passport, ID card, driver's license, and business license</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.featureText}>Service quality + identity checks</Text>
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
          <Text style={styles.primaryButtonText}>Upload Documents</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.privacyNote}>
        🔒 Documents are reviewed securely and never shared outside verification workflows.
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
          {isApproved ? 'KYC Approved!' : isManualReview ? 'KYC Under Review' : 'KYC Failed'}
        </Text>

        <Text style={styles.resultDescription}>
          {isApproved
            ? "Congratulations! Your KYC has been approved. You're now a trusted provider on Eve Beauty."
            : isManualReview
            ? "Your KYC submission is being reviewed by our team. We'll notify you within 24 hours."
            : rejectionReason || 'Please try again with clearer photos of your documents.'}
        </Text>

        {isApproved && (
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text style={styles.badgeText}>KYC Verified Provider</Text>
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

