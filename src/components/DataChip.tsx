import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../constants/theme';
import AnimatedPressable from './AnimatedPressable';

interface DataChipProps {
  label: string;
  value: string | number;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

export default function DataChip({
  label,
  value,
  icon,
  onPress,
  variant = 'default',
}: DataChipProps) {
  const getIconColor = () => {
    switch (variant) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'info':
        return colors.info;
      default:
        return colors.primary;
    }
  };

  if (onPress) {
    return (
      <AnimatedPressable
        style={[styles.chip, shadows.sm]}
        onPress={onPress}
        scaleValue={0.96}
      >
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: `${getIconColor()}15` }]}>
            <Ionicons name={icon} size={20} color={getIconColor()} />
          </View>
        )}
        <View style={styles.content}>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <View style={[styles.chip, shadows.sm]}>
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: `${getIconColor()}15` }]}>
          <Ionicons name={icon} size={20} color={getIconColor()} />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 100,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  content: {
    flex: 1,
  },
  value: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
});

