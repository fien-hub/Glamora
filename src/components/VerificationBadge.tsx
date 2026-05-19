import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '../utils/icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

interface VerificationBadgeProps {
  isVerified: boolean;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  onPress?: () => void;
}

export default function VerificationBadge({
  isVerified,
  size = 'medium',
  showLabel = false,
  onPress,
}: VerificationBadgeProps) {
  const iconSize = size === 'small' ? 14 : size === 'medium' ? 18 : 22;
  
  const badge = (
    <View style={[styles.container, styles[`container_${size}`]]}>
      <Ionicons
        name={isVerified ? 'checkmark-circle' : 'alert-circle'}
        size={iconSize}
        color={isVerified ? colors.success : colors.warning}
      />
      {showLabel && (
        <Text style={[styles.label, styles[`label_${size}`], !isVerified && styles.labelUnverified]}>
          {isVerified ? 'Verified' : 'Unverified'}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {badge}
      </TouchableOpacity>
    );
  }

  return badge;
}

interface VerificationStatusCardProps {
  emailVerified: boolean;
  paymentVerified?: boolean;
  onVerifyEmail?: () => void;
  onVerifyPayment?: () => void;
}

export function VerificationStatusCard({
  emailVerified,
  paymentVerified,
  onVerifyEmail,
  onVerifyPayment,
}: VerificationStatusCardProps) {
  const allVerified = emailVerified && (paymentVerified !== false);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons
          name={allVerified ? 'shield-checkmark' : 'shield-outline'}
          size={24}
          color={allVerified ? colors.success : colors.warning}
        />
        <Text style={styles.cardTitle}>Account Verification</Text>
      </View>

      <View style={styles.itemsContainer}>
        <VerificationItem
          icon="mail-outline"
          label="Email"
          verified={emailVerified}
          onVerify={!emailVerified ? onVerifyEmail : undefined}
        />
        {paymentVerified !== undefined && (
          <VerificationItem
            icon="card-outline"
            label="Payment Method"
            verified={paymentVerified}
            onVerify={!paymentVerified ? onVerifyPayment : undefined}
          />
        )}
      </View>

      {!allVerified && (
        <Text style={styles.helperText}>
          Complete verification to unlock all features
        </Text>
      )}
    </View>
  );
}

interface VerificationItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  verified: boolean;
  onVerify?: () => void;
}

function VerificationItem({ icon, label, verified, onVerify }: VerificationItemProps) {
  return (
    <View style={styles.item}>
      <View style={styles.itemLeft}>
        <Ionicons name={icon} size={20} color={colors.textSecondary} />
        <Text style={styles.itemLabel}>{label}</Text>
      </View>
      {verified ? (
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.verifiedText}>Verified</Text>
        </View>
      ) : onVerify ? (
        <TouchableOpacity style={styles.verifyButton} onPress={onVerify}>
          <Text style={styles.verifyButtonText}>Verify</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.pendingBadge}>
          <Ionicons name="time-outline" size={18} color={colors.warning} />
          <Text style={styles.pendingText}>Pending</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  container_small: { gap: 2 },
  container_medium: { gap: 4 },
  container_large: { gap: 6 },
  label: {
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  label_small: { fontSize: fontSize.xs },
  label_medium: { fontSize: fontSize.sm },
  label_large: { fontSize: fontSize.md },
  labelUnverified: {
    color: colors.warning,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  itemsContainer: {
    gap: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pendingText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: fontWeight.medium,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  verifyButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.black,
  },
  helperText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

