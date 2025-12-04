import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

interface AnimatedHeartProps {
  isFavorite: boolean;
  onPress: () => void;
  size?: number;
  color?: string;
}

export default function AnimatedHeart({
  isFavorite,
  onPress,
  size = 24,
  color = colors.error,
}: AnimatedHeartProps) {
  // Simplified version without animations to avoid native/JS driver conflicts
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.container}>
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={size}
          color={isFavorite ? color : colors.textSecondary}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

