import React from 'react';
import { Animated, ViewStyle } from 'react-native';
import { useEntranceAnimation } from '../../hooks/useEntranceAnimation';

interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  enabled?: boolean;
  style?: ViewStyle | ViewStyle[];
}

/**
 * FadeInView - Wraps content with a fade-in animation on mount
 * 
 * @param children - Content to animate
 * @param delay - Delay before animation starts (ms)
 * @param duration - Animation duration (ms)
 * @param enabled - Whether animation is enabled (default: true)
 * @param style - Additional styles to apply
 * 
 * @example
 * <FadeInView delay={100}>
 *   <Text>This text fades in</Text>
 * </FadeInView>
 */
export default function FadeInView({
  children,
  delay,
  duration,
  enabled = true,
  style,
}: FadeInViewProps) {
  const animatedStyle = useEntranceAnimation({
    type: 'fade',
    delay,
    duration,
    enabled,
  });

  return (
    <Animated.View style={[style, animatedStyle]} pointerEvents="box-none">
      {children}
    </Animated.View>
  );
}

