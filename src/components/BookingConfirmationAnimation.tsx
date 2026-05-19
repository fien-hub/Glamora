import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions, Modal } from 'react-native';
import { Ionicons } from '../utils/icons';
import { colors, spacing } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BookingConfirmationAnimationProps {
  visible: boolean;
  onComplete: () => void;
}

interface Confetti {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  scale: Animated.Value;
  color: string;
}

export default function BookingConfirmationAnimation({
  visible,
  onComplete,
}: BookingConfirmationAnimationProps) {
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const checkmarkRotate = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Create confetti particles
  const confettiParticles = useRef<Confetti[]>(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(SCREEN_WIDTH / 2),
      y: new Animated.Value(SCREEN_HEIGHT / 2),
      rotate: new Animated.Value(0),
      scale: new Animated.Value(1),
      color: [colors.primary, colors.primaryLight, colors.secondary, colors.secondaryLight][
        Math.floor(Math.random() * 4)
      ],
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      // Fade in background
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Confetti burst animation
      const confettiAnimations = confettiParticles.map((particle) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 150 + Math.random() * 200;
        const targetX = SCREEN_WIDTH / 2 + Math.cos(angle) * distance;
        const targetY = SCREEN_HEIGHT / 2 + Math.sin(angle) * distance;

        return Animated.parallel([
          Animated.timing(particle.x, {
            toValue: targetX,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(particle.y, {
            toValue: targetY,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(particle.rotate, {
            toValue: Math.random() * 720,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(particle.scale, {
              toValue: 1.5,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(particle.scale, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]);
      });

      // Checkmark animation with wobble
      const checkmarkAnimation = Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.spring(checkmarkScale, {
            toValue: 1.2,
            useNativeDriver: true,
            friction: 3,
            tension: 40,
          }),
          Animated.sequence([
            Animated.timing(checkmarkRotate, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(checkmarkRotate, {
              toValue: -1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(checkmarkRotate, {
              toValue: 0.5,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(checkmarkRotate, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.spring(checkmarkScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 3,
          tension: 40,
        }),
      ]);

      Animated.parallel([...confettiAnimations, checkmarkAnimation]).start(() => {
        // Wait a bit before closing
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            onComplete();
          });
        }, 1000);
      });
    }
  }, [visible]);

  if (!visible) return null;

  const checkmarkRotation = checkmarkRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Confetti particles */}
        {confettiParticles.map((particle, index) => (
          <Animated.View
            key={index}
            style={[
              styles.confetti,
              {
                backgroundColor: particle.color,
                transform: [
                  { translateX: particle.x },
                  { translateY: particle.y },
                  { rotate: particle.rotate.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    })
                  },
                  { scale: particle.scale },
                ],
              },
            ]}
          />
        ))}

        {/* Checkmark */}
        <Animated.View
          style={[
            styles.checkmarkContainer,
            {
              transform: [{ scale: checkmarkScale }, { rotate: checkmarkRotation }],
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={120} color={colors.success} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkmarkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 100,
    padding: spacing.xl,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
});

