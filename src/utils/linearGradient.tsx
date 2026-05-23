/**
 * Drop-in LinearGradient wrapper backed by react-native-linear-gradient.
 *
 * react-native-linear-gradient has full New Architecture (Fabric) support,
 * unlike expo-linear-gradient which crashes the JS thread on RN 0.81 + Hermes
 * before SplashScreen.hideAsync() can fire.
 *
 * API mirrors expo-linear-gradient so all call-sites are unchanged:
 *   colors, start, end, locations, style, children
 *
 * Coordinate mapping: expo uses { x, y } fractions (0–1), same as
 * react-native-linear-gradient's useAngle=false mode — no conversion needed.
 */
import React from 'react';
import RNLinearGradient from 'react-native-linear-gradient';

type ExpoLinearGradientProps = React.ComponentProps<typeof import('expo-linear-gradient').LinearGradient>;

// react-native-linear-gradient accepts string[] not readonly (string|number)[]
function toStringArray(colors: readonly (string | number)[] | undefined): string[] {
  if (!colors || colors.length === 0) return ['transparent', 'transparent'];
  return colors.map((c) => String(c));
}

export const LinearGradient: React.FC<ExpoLinearGradientProps> = ({
  colors,
  start,
  end,
  locations,
  style,
  children,
  ...rest
}) => {
  // Convert expo {x,y} start/end to react-native-linear-gradient angle via
  // x1/y1/x2/y2 props (it accepts them as fractions when useAngle is false)
  return (
    <RNLinearGradient
      colors={toStringArray(colors)}
      start={start ?? { x: 0, y: 0 }}
      end={end ?? { x: 1, y: 0 }}
      locations={locations ? [...locations] : undefined}
      style={style as any}
      {...rest}
    >
      {children}
    </RNLinearGradient>
  );
};
