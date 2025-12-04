import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import AnimatedPressable from './AnimatedPressable';

interface CategoryChipProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  selected?: boolean;
  onPress?: () => void;
  variant?: 'default' | 'primary' | 'secondary';
}

export default function CategoryChip({
  label,
  icon,
  selected = false,
  onPress,
  variant = 'default',
}: CategoryChipProps) {
  const getBackgroundColor = () => {
    if (selected) return colors.primary;
    if (variant === 'primary') return colors.primarySubtle;
    if (variant === 'secondary') return colors.secondarySubtle;
    return colors.backgroundGray;
  };

  const getTextColor = () => {
    if (selected) return colors.text;
    if (variant === 'primary') return colors.primaryDark;
    if (variant === 'secondary') return colors.secondaryDark;
    return colors.textSecondary;
  };

  return (
    <AnimatedPressable
      style={[styles.chip, { backgroundColor: getBackgroundColor() }]}
      onPress={onPress}
      disabled={!onPress}
      scaleValue={0.92}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={16}
          color={getTextColor()}
          style={styles.icon}
        />
      )}
      <Text style={[styles.label, { color: getTextColor() }]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});

