import React from 'react';
import { Animated, ViewStyle } from 'react-native';
import { useEntranceAnimation } from '../../hooks/useEntranceAnimation';

interface SlideUpViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  enabled?: boolean;
  style?: ViewStyle | ViewStyle[];
}

/**
 * SlideUpView - Wraps content with a slide-up animation on mount
 * 
 * @param children - Content to animate
 * @param delay - Delay before animation starts (ms)
 * @param duration - Animation duration (ms)
 * @param distance - Distance to slide up from (px, default: 30)
 * @param enabled - Whether animation is enabled (default: true)
 * @param style - Additional styles to apply
 * 
 * @example
 * <SlideUpView delay={100} distance={40}>
 *   <Button title="Click me" />
 * </SlideUpView>
 */
export default function SlideUpView({
  children,
  delay,
  duration,
  distance,
  enabled = true,
  style,
}: SlideUpViewProps) {
  const animatedStyle = useEntranceAnimation({
    type: 'slideUp',
    delay,
    duration,
    distance,
    enabled,
  });

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

