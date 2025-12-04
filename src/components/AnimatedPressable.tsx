import React from 'react';
import { TouchableOpacity, View, TouchableOpacityProps } from 'react-native';

interface AnimatedPressableProps extends TouchableOpacityProps {
  scaleValue?: number;
  children: React.ReactNode;
}

export default function AnimatedPressable({
  scaleValue = 0.95,
  children,
  ...props
}: AnimatedPressableProps) {
  // Simplified version without animations to avoid native/JS driver conflicts

  return (
    <TouchableOpacity
      {...props}
      activeOpacity={0.7}
    >
      <View>
        {children}
      </View>
    </TouchableOpacity>
  );
}

