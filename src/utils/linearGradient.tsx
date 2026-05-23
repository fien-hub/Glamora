/**
 * Safe replacement for expo-linear-gradient.
 *
 * In React Native 0.81 + New Architecture (Fabric), expo-linear-gradient's
 * native ViewManager is registered via the Old Architecture interop adapter:
 *   "ViewManagerAdapter_ExpoLinearGradient_<hash>"
 * React Native renders it as visible error text on screen:
 *   "Unimplemented component: <ViewManagerAdapter_ExpoLinearGradient_...>"
 *
 * The JS require() succeeds so try/catch around require() does NOT help —
 * the error only surfaces at native render time, crashing the JS thread on
 * Hermes before SplashScreen.hideAsync() can be called.
 *
 * Fix: render a View whose background is derived from the gradient's most
 * prominent (last) color, preserving layouts while eliminating the crash.
 */
import React from 'react';
import { View } from 'react-native';

type LinearGradientProps = React.ComponentProps<typeof import('expo-linear-gradient').LinearGradient>;

const pickBackgroundColor = (colors?: readonly (string | number)[]): string => {
  if (!colors || colors.length === 0) return 'rgba(0,0,0,0.4)';
  for (let i = colors.length - 1; i >= 0; i--) {
    const c = colors[i];
    if (typeof c === 'string' && c !== 'transparent' && !c.startsWith('rgba(0,0,0,0)')) {
      return c;
    }
  }
  return typeof colors[0] === 'string' ? (colors[0] as string) : 'rgba(0,0,0,0.4)';
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
