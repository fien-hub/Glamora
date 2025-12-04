import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getPasswordStrength } from '../utils/validation';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export default function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const strength = getPasswordStrength(password);

  const getStrengthColor = () => {
    switch (strength) {
      case 'weak':
        return '#EF4444'; // Red
      case 'medium':
        return '#F59E0B'; // Orange
      case 'strong':
        return '#10B981'; // Green
      default:
        return colors.border;
    }
  };

  const getStrengthWidth = () => {
    switch (strength) {
      case 'weak':
        return '33%';
      case 'medium':
        return '66%';
      case 'strong':
        return '100%';
      default:
        return '0%';
    }
  };

  const getStrengthText = () => {
    switch (strength) {
      case 'weak':
        return 'Weak password';
      case 'medium':
        return 'Medium strength';
      case 'strong':
        return 'Strong password';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        <View
          style={[
            styles.bar,
            {
              width: getStrengthWidth(),
              backgroundColor: getStrengthColor(),
            },
          ]}
        />
      </View>
      <Text style={[styles.text, { color: getStrengthColor() }]}>
        {getStrengthText()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
  },
  barContainer: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  bar: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});

