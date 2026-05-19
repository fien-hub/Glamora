import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '../utils/icons';
import { colors, spacing } from '../constants/theme';

interface AnimatedStarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
  animated?: boolean;
}

export default function AnimatedStarRating({
  rating,
  onRatingChange,
  size = 32,
  readonly = false,
  animated = true,
}: AnimatedStarRatingProps) {
  const starAnims = useRef(
    Array.from({ length: 5 }, () => ({
      scale: new Animated.Value(1),
      opacity: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    if (animated && rating > 0) {
      // Sequential animation for each star
      const animations = Array.from({ length: Math.floor(rating) }, (_, index) =>
        Animated.sequence([
          Animated.delay(index * 100),
          Animated.parallel([
            Animated.spring(starAnims[index].scale, {
              toValue: 1.3,
              useNativeDriver: true,
              friction: 3,
              tension: 100,
            }),
            Animated.timing(starAnims[index].opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          Animated.spring(starAnims[index].scale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 3,
            tension: 100,
          }),
        ])
      );

      Animated.parallel(animations).start();
    }
  }, [rating, animated]);

  const handleStarPress = (starIndex: number) => {
    if (readonly || !onRatingChange) return;

    const newRating = starIndex + 1;
    onRatingChange(newRating);

    // Animate the pressed star
    Animated.sequence([
      Animated.spring(starAnims[starIndex].scale, {
        toValue: 1.4,
        useNativeDriver: true,
        friction: 3,
      }),
      Animated.spring(starAnims[starIndex].scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
      }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: 5 }, (_, index) => {
        const isFilled = index < Math.floor(rating);
        const isHalfFilled = index === Math.floor(rating) && rating % 1 !== 0;

        return (
          <TouchableOpacity
            key={index}
            onPress={() => handleStarPress(index)}
            disabled={readonly}
            activeOpacity={0.7}
          >
            <Animated.View
              style={[
                styles.starContainer,
                {
                  transform: [{ scale: starAnims[index].scale }],
                  opacity: starAnims[index].opacity,
                },
              ]}
            >
              <Ionicons
                name={isFilled ? 'star' : isHalfFilled ? 'star-half' : 'star-outline'}
                size={size}
                color={isFilled || isHalfFilled ? colors.secondary : colors.textSecondary}
                style={
                  isFilled || isHalfFilled
                    ? {
                        shadowColor: colors.secondary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4,
                        shadowRadius: 4,
                      }
                    : undefined
                }
              />
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  starContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

