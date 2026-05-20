/**
 * Safe wrapper for expo-linear-gradient.
 *
 * expo-linear-gradient is fully supported in Expo SDK 54 with New Architecture.
 * We keep a try/catch at module level in case the native module is somehow
 * unavailable, falling back to a solid View using the gradient's first color.
 */
import React from 'react';
import { View } from 'react-native';

type LinearGradientProps = React.ComponentProps<typeof import('expo-linear-gradient').LinearGradient>;

let NativeLinearGradient: React.ComponentType<any> | null = null;
try {
  NativeLinearGradient = require('expo-linear-gradient').LinearGradient;
} catch {
  // fall through to View fallback
}

const pickFallbackColor = (colors?: readonly (string | number)[]): string => {
  if (!colors || colors.length === 0) return 'rgba(0,0,0,0.4)';
  const last = colors[colors.length - 1];
  return typeof last === 'string' ? last : 'rgba(0,0,0,0.4)';
};

export const LinearGradient: React.FC<LinearGradientProps> = ({
  colors,
  start,
  end,
  locations,
  style,
  children,
  ...rest
}) => {
  if (NativeLinearGradient) {
    return (
      <NativeLinearGradient
        colors={colors}
        start={start}
        end={end}
        locations={locations}
        style={style}
        {...rest}
      >
        {children}
      </NativeLinearGradient>
    );
  }
  const backgroundColor = pickFallbackColor(colors);
  return (
    <View style={[{ backgroundColor }, style as any]} {...rest}>
      {children}
    </View>
  );
};
