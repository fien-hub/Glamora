import React from 'react';
import { Animated, ViewStyle } from 'react-native';
import { useEntranceAnimation } from '../../hooks/useEntranceAnimation';

interface ScaleInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  initialScale?: number;
  enabled?: boolean;
  style?: ViewStyle | ViewStyle[];
}

/**
 * ScaleInView - Wraps content with a scale-in animation on mount
 * 
 * @param children - Content to animate
 * @param delay - Delay before animation starts (ms)
 * @param duration - Animation duration (ms)
 * @param initialScale - Starting scale value (0.0 to 1.0, default: 0.8)
 * @param enabled - Whether animation is enabled (default: true)
 * @param style - Additional styles to apply
 * 
 * @example
 * <ScaleInView delay={100} initialScale={0.9}>
 *   <Card />
 * </ScaleInView>
 */
export default function ScaleInView({
  children,
  delay,
  duration,
  initialScale,
  enabled = true,
  style,
}: ScaleInViewProps) {
  const animatedStyle = useEntranceAnimation({
    type: 'scale',
    delay,
    duration,
    initialScale,
    enabled,
  });

  return (
    <Animated.View style={[style, animatedStyle]} pointerEvents="box-none">
      {children}
    </Animated.View>
  );
}

