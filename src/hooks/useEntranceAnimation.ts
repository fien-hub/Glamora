import { useEffect, useRef } from 'react';
import { Animated, AccessibilityInfo } from 'react-native';
import { animation } from '../constants/theme';

interface EntranceAnimationConfig {
  type: 'fade' | 'slideUp' | 'slideLeft' | 'slideRight' | 'scale';
  duration?: number;
  delay?: number;
  distance?: number; // For slide animations
  initialScale?: number; // For scale
  enabled?: boolean; // Allow disabling animation
}

/**
 * Custom hook for entrance animations
 * Provides fade-in, slide (up/left/right), and scale-in animations with configurable delays and durations
 * Automatically respects reduced motion accessibility preferences
 */
export function useEntranceAnimation(config: EntranceAnimationConfig) {
  const {
    type,
    duration = animation.entrance.fadeInDuration,
    delay = animation.delay.none,
    distance = animation.entrance.slideUpDistance,
    initialScale = animation.entrance.scaleInInitial,
    enabled = true,
  } = config;

  const animatedValue = useRef(new Animated.Value(0)).current;
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    // Check for reduced motion preference
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      reduceMotionRef.current = reduceMotion;

      // If animations are disabled or reduced motion is enabled, skip animation
      if (!enabled || reduceMotion) {
        animatedValue.setValue(1);
        return;
      }

      // Start the animation
      const animationInstance = Animated.timing(animatedValue, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      });

      animationInstance.start();

      // Cleanup on unmount
      return () => {
        animationInstance.stop();
        animatedValue.setValue(0);
      };
    });
  }, [enabled]);

  // If reduced motion or disabled, return no animation styles
  if (!enabled || reduceMotionRef.current) {
    return {
      opacity: 1,
      transform: [],
    };
  }

  // Return animation styles based on type
  if (type === 'fade') {
    return {
      opacity: animatedValue,
    };
  }

  if (type === 'slideUp') {
    return {
      opacity: animatedValue,
      transform: [
        {
          translateY: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [distance, 0],
          }),
        },
      ],
    };
  }

  if (type === 'slideLeft') {
    return {
      opacity: animatedValue,
      transform: [
        {
          translateX: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [distance, 0],
          }),
        },
      ],
    };
  }

  if (type === 'slideRight') {
    return {
      opacity: animatedValue,
      transform: [
        {
          translateX: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-distance, 0],
          }),
        },
      ],
    };
  }

  if (type === 'scale') {
    return {
      opacity: animatedValue,
      transform: [
        {
          scale: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [initialScale, 1],
          }),
        },
      ],
    };
  }

  // Fallback
  return {
    opacity: 1,
    transform: [],
  };
}

