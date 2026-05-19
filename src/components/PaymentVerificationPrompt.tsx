import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

interface PaymentVerificationPromptProps {
  onPress: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function PaymentVerificationPrompt({ onPress, containerStyle }: PaymentVerificationPromptProps) {
  return (
    <View style={[styles.card, containerStyle]}>
      <View style={styles.header}>
        <Ionicons name="card-outline" size={20} color={colors.primaryDarker} />
        <Text style={styles.title}>Payment method not verified</Text>
      </View>
      <Text style={styles.text}>
        You can still book and pay now. Verifying your payment method helps speed up future checkouts.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>Verify Payment Method</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primarySubtle,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryDarker,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
