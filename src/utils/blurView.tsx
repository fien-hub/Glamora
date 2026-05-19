/**
 * Safe replacement for expo-blur's BlurView.
 *
 * In React Native 0.81 + New Architecture (Fabric), expo-blur's native ViewManager
 * renders as "Unimplemented component" with on-screen error text that overlaps
 * children (e.g. "Skip" button shows duplicate text).
 *
 * Fix: always render a semi-transparent View approximating the blur tint.
 */
import React from 'react';
import { View } from 'react-native';

type BlurViewProps = React.ComponentProps<typeof import('expo-blur').BlurView>;

const tintToBackground = (tint?: string): string => {
  switch (tint) {
    case 'dark': return 'rgba(0,0,0,0.55)';
    case 'light': return 'rgba(255,255,255,0.65)';
    case 'extraLight': return 'rgba(255,255,255,0.85)';
    default: return 'rgba(128,128,128,0.4)';
  }
};

export const BlurView: React.FC<BlurViewProps> = ({
  intensity: _intensity,
  tint,
  experimentalBlurMethod: _experimentalBlurMethod,
  style,
  children,
  ...rest
}) => {
  const backgroundColor = tintToBackground(tint);
  return (
    <View style={[{ backgroundColor }, style as any]} {...rest}>
      {children}
    </View>
  );
};
