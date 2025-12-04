import React from 'react';
import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { colors, spacing, fontSize, fontWeight, shadows } from '../constants/theme';
import NotificationBell from './NotificationBell';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
const HEADER_HEIGHT = 60; // Smaller, cleaner header
export const TOTAL_HEADER_HEIGHT = STATUS_BAR_HEIGHT + HEADER_HEIGHT; // Export for screen padding

interface CurvedHeaderProps {
  title: string;
  subtitle?: string;
  showNotifications?: boolean;
}

export default function CurvedHeader({ title, subtitle, showNotifications = true }: CurvedHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.leftSpacer} />
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.rightActions}>
          {showNotifications && <NotificationBell />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: TOTAL_HEADER_HEIGHT,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 1000,
    ...shadows.sm,
  },
  content: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  leftSpacer: {
    width: 40, // Same width as notification bell for centering
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  rightActions: {
    width: 40,
    alignItems: 'flex-end',
  },
});

