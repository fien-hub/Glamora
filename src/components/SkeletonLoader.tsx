import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing } from '../constants/theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius: customBorderRadius = borderRadius.md,
  style,
}: SkeletonLoaderProps) {
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1300,
        useNativeDriver: true,
      })
    );
    shimmer.start();

    return () => shimmer.stop();
  }, []);

  const shimmerTravel = typeof width === 'number' ? width + 140 : 420;

  const translateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-shimmerTravel, shimmerTravel],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius: customBorderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

export function SkeletonFeedCard() {
  return (
    <View style={styles.feedCard}>
      {/* Image with 3:4 aspect ratio - using a calculated height based on typical grid width */}
      <View style={styles.feedCardImageContainer}>
        <SkeletonLoader width="100%" height="100%" borderRadius={borderRadius.lg} />
      </View>

      {/* Content */}
      <View style={styles.feedCardContent}>
        {/* Provider info */}
        <View style={styles.feedCardHeader}>
          <SkeletonLoader width={24} height={24} borderRadius={borderRadius.round} />
          <View style={styles.feedCardHeaderText}>
            <SkeletonLoader width="70%" height={12} />
          </View>
        </View>

        {/* Caption */}
        <SkeletonLoader width="90%" height={10} style={{ marginTop: spacing.xs }} />
        <SkeletonLoader width="60%" height={10} style={{ marginTop: 4 }} />

        {/* Service info */}
        <View style={styles.feedCardFooter}>
          <SkeletonLoader width="50%" height={10} />
          <SkeletonLoader width="30%" height={12} />
        </View>

        {/* Book button */}
        <SkeletonLoader width="100%" height={32} borderRadius={borderRadius.round} style={{ marginTop: spacing.xs }} />
      </View>
    </View>
  );
}

export function SkeletonProviderCard() {
  return (
    <View style={styles.providerCard}>
      <SkeletonLoader width={80} height={80} borderRadius={borderRadius.lg} />
      <View style={styles.providerCardContent}>
        <SkeletonLoader width="70%" height={18} />
        <SkeletonLoader width="50%" height={14} style={{ marginTop: spacing.xs }} />
        <SkeletonLoader width="60%" height={14} style={{ marginTop: spacing.xs }} />
      </View>
    </View>
  );
}

export function SkeletonServiceCard() {
  return (
    <View style={styles.serviceCard}>
      <SkeletonLoader width={60} height={60} borderRadius={borderRadius.md} />
      <View style={styles.serviceCardContent}>
        <SkeletonLoader width="60%" height={16} />
        <SkeletonLoader width="40%" height={12} style={{ marginTop: spacing.xs }} />
        <SkeletonLoader width="30%" height={14} style={{ marginTop: spacing.sm }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.backgroundGray,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '55%',
    backgroundColor: colors.primaryLighter,
    opacity: 0.55,
  },
  feedCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  feedCardImageContainer: {
    width: '100%',
    aspectRatio: 3 / 4, // Portrait aspect ratio to match FeedPostCard
    backgroundColor: colors.backgroundGray,
  },
  feedCardContent: {
    padding: spacing.sm,
  },
  feedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  feedCardHeaderText: {
    marginLeft: spacing.xs,
    flex: 1,
  },
  feedCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  providerCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  providerCardContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  serviceCardContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
});

