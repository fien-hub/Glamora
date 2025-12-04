import React, { useEffect, useRef } from 'react';
import { Animated, RefreshControl, RefreshControlProps } from 'react-native';
import { colors } from '../constants/theme';

interface BrandedRefreshControlProps extends Omit<RefreshControlProps, 'colors' | 'tintColor'> {
  refreshing: boolean;
  onRefresh: () => void;
}

export default function BrandedRefreshControl({
  refreshing,
  onRefresh,
  ...props
}: BrandedRefreshControlProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (refreshing) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [refreshing]);

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary, colors.primaryLight, colors.secondary]}
      progressBackgroundColor={colors.white}
      {...props}
    />
  );
}

