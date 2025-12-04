import React from 'react';
import { Animated, TouchableOpacity, ViewStyle } from 'react-native';
import { useEntranceAnimation } from '../hooks/useEntranceAnimation';

interface AnimatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
  // Entrance animation props
  entranceAnimation?: 'fade' | 'slideUp' | 'scale' | 'none';
  entranceDelay?: number;
  entranceDuration?: number;
  entranceEnabled?: boolean;
}

/**
 * AnimatedCard - A card component with optional entrance animations and press interactions
 *
 * @param children - Card content
 * @param onPress - Optional press handler (makes card touchable)
 * @param style - Card styles
 * @param disabled - Whether card is disabled
 * @param entranceAnimation - Type of entrance animation (default: 'scale')
 * @param entranceDelay - Delay before entrance animation (ms)
 * @param entranceDuration - Duration of entrance animation (ms)
 * @param entranceEnabled - Whether entrance animation is enabled (default: true)
 */
export default function AnimatedCard({
  children,
  onPress,
  style,
  disabled = false,
  entranceAnimation = 'scale',
  entranceDelay,
  entranceDuration,
  entranceEnabled = true,
}: AnimatedCardProps) {
  // Get entrance animation styles
  const entranceStyle = useEntranceAnimation({
    type: entranceAnimation === 'none' ? 'fade' : entranceAnimation,
    delay: entranceDelay,
    duration: entranceDuration,
    enabled: entranceEnabled && entranceAnimation !== 'none',
  });

  // If no press handler or disabled, render as static view
  if (!onPress || disabled) {
    return (
      <Animated.View style={[style, entranceAnimation !== 'none' && entranceStyle]}>
        {children}
      </Animated.View>
    );
  }

  // Render as touchable card
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={[style, entranceAnimation !== 'none' && entranceStyle]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

