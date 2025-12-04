import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BookingConfirmationModalProps {
  visible: boolean;
  providerName: string;
  onViewBookings: () => void;
  onMessageProvider?: () => void;
  onClose: () => void;
  viewBookingsLabel?: string;
  bookingsHint?: string;
}

export default function BookingConfirmationModal({
  visible,
  providerName,
  onViewBookings,
  onMessageProvider,
  onClose,
  viewBookingsLabel = 'View Bookings',
  bookingsHint,
}: BookingConfirmationModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const burstScale = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(1)).current;
  const wobbleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      checkmarkScale.setValue(0);
      burstScale.setValue(0);
      burstOpacity.setValue(1);
      wobbleAnim.setValue(0);

      // Sequence of animations
      Animated.sequence([
        // Modal appears
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          stiffness: 200,
        }),
        // Burst effect
        Animated.parallel([
          Animated.timing(burstScale, {
            toValue: 1.5,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(burstOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        // Checkmark appears with wobble
        Animated.parallel([
          Animated.spring(checkmarkScale, {
            toValue: 1,
            useNativeDriver: true,
            damping: 8,
            stiffness: 200,
          }),
          Animated.sequence([
            Animated.timing(wobbleAnim, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(wobbleAnim, {
              toValue: -1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(wobbleAnim, {
              toValue: 0.5,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(wobbleAnim, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    }
  }, [visible]);

  const wobbleRotation = wobbleAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-10deg', '10deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Burst effect */}
          <Animated.View
            style={[
              styles.burst,
              {
                transform: [{ scale: burstScale }],
                opacity: burstOpacity,
              },
            ]}
          />

          {/* Checkmark */}
          <Animated.View
            style={[
              styles.checkmarkContainer,
              {
                transform: [
                  { scale: checkmarkScale },
                  { rotate: wobbleRotation },
                ],
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          </Animated.View>

          <Text style={styles.title}>Booking Requested!</Text>
          <Text style={styles.message}>
            Your booking request has been sent to {providerName}. You'll receive a confirmation soon.
          </Text>
          {bookingsHint && (
            <Text style={styles.hint}>{bookingsHint}</Text>
          )}

          <View style={styles.buttonContainer}>
            {onMessageProvider && (
              <TouchableOpacity style={styles.primaryButton} onPress={onMessageProvider}>
                <Ionicons name="chatbubble-outline" size={18} color={colors.text} style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>Message Provider</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={onMessageProvider ? styles.secondaryButton : styles.primaryButton} onPress={onViewBookings}>
              <Text style={onMessageProvider ? styles.secondaryButtonText : styles.primaryButtonText}>{viewBookingsLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: SCREEN_WIDTH - spacing.xl * 2,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  burst: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primary,
    top: '20%',
  },
  checkmarkContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  buttonIcon: {
    marginRight: spacing.xs,
  },
  secondaryButton: {
    backgroundColor: colors.backgroundGray,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.round,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
});

