/**
 * Safe replacement for expo-linear-gradient.
 *
 * In React Native 0.81 + New Architecture (Fabric), expo-linear-gradient's native
 * ViewManager is registered under the Old Architecture interop adapter name
 * "ViewManagerAdapter_ExpoLinearGradient_<hash>". When rendered, React Native shows:
 *   "Unimplemented component: <ViewManagerAdapter_ExpoLinearGradient_...>"
 * and covers the entire view with a red/pink error tint.
 *
 * The try/catch around require() does NOT help because the JS module loads
 * successfully — the failure only happens at native render time.
 *
 * Fix: never render the native LinearGradient. Instead, render a View whose
 * background color is derived from the darkest color in the `colors` array.
 */
import React from 'react';
import { View } from 'react-native';

type LinearGradientProps = React.ComponentProps<typeof import('expo-linear-gradient').LinearGradient>;

const pickBackgroundColor = (colors?: readonly (string | number)[]): string => {
  if (!colors || colors.length === 0) return 'rgba(0,0,0,0.4)';
  const mid = colors[Math.floor(colors.length / 2)];
  return typeof mid === 'string' ? mid : 'rgba(0,0,0,0.4)';
};

export const LinearGradient: React.FC<LinearGradientProps> = ({
  colors,
  start: _start,
  end: _end,
  locations: _locations,
  style,
  children,
  ...rest
}) => {
  const backgroundColor = pickBackgroundColor(colors);
  return (
    <View style={[{ backgroundColor }, style as any]} {...rest}>
      {children}
    </View>
  );
};
