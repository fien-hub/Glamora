import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors, spacing, borderRadius, shadows } from '../constants/theme';

export function SkeletonProviderCard() {
  return (
    <View style={styles.providerCard}>
      <SkeletonLoader width={64} height={64} borderRadius={32} style={styles.avatar} />
      <SkeletonLoader width="80%" height={16} style={styles.name} />
      <SkeletonLoader width="60%" height={14} style={styles.rating} />
      <SkeletonLoader width="50%" height={12} />
    </View>
  );
}

export function SkeletonServiceCard() {
  return (
    <View style={styles.serviceCard}>
      <View style={styles.serviceCardContent}>
        <View style={styles.serviceCardLeft}>
          <SkeletonLoader width="70%" height={18} style={styles.serviceName} />
          <SkeletonLoader width="90%" height={14} style={styles.serviceDescription} />
          <SkeletonLoader width="40%" height={12} />
        </View>
        <View style={styles.serviceCardRight}>
          <SkeletonLoader width={60} height={24} style={styles.servicePrice} />
          <SkeletonLoader width={40} height={12} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonBookingCard() {
  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <View style={styles.bookingHeaderLeft}>
          <SkeletonLoader width="60%" height={18} style={styles.bookingTitle} />
          <SkeletonLoader width="80%" height={14} style={styles.bookingSubtitle} />
        </View>
        <SkeletonLoader width={80} height={28} borderRadius={14} />
      </View>
      <View style={styles.bookingDetails}>
        <SkeletonLoader width="50%" height={14} style={styles.bookingDetail} />
        <SkeletonLoader width="40%" height={14} style={styles.bookingDetail} />
        <SkeletonLoader width="70%" height={14} style={styles.bookingDetail} />
        <SkeletonLoader width="30%" height={16} />
      </View>
    </View>
  );
}

export function SkeletonProviderList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonProviderCard key={index} />
      ))}
    </>
  );
}

export function SkeletonServiceList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonServiceCard key={index} />
      ))}
    </>
  );
}

export function SkeletonBookingList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBookingCard key={index} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  providerCard: {
    backgroundColor: colors.white,
    padding: spacing.cardPadding,
    borderRadius: borderRadius.lg,
    marginRight: spacing.cardMargin,
    width: 130,
    alignItems: 'center',
    ...shadows.sm,
  },
  avatar: {
    marginBottom: spacing.md,
  },
  name: {
    marginBottom: spacing.sm,
  },
  rating: {
    marginBottom: spacing.xs,
  },
  serviceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.cardMargin,
    ...shadows.sm,
  },
  serviceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceCardLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  serviceName: {
    marginBottom: spacing.xs,
  },
  serviceDescription: {
    marginBottom: spacing.sm,
  },
  serviceCardRight: {
    alignItems: 'flex-end',
  },
  servicePrice: {
    marginBottom: spacing.xs,
  },
  bookingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.cardMargin,
    ...shadows.sm,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bookingHeaderLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  bookingTitle: {
    marginBottom: spacing.xs,
  },
  bookingSubtitle: {
    marginBottom: spacing.xs,
  },
  bookingDetails: {
    marginBottom: spacing.md,
  },
  bookingDetail: {
    marginBottom: spacing.xs,
  },
});

