/**
 * Runtime-aware LinearGradient wrapper.
 *
 * - Expo Go (store client): use expo-linear-gradient to avoid missing native
 *   registration for BVLinearGradient.
 * - Development/production native builds: use react-native-linear-gradient,
 *   which supports New Architecture (Fabric) on RN 0.81.
 *
 * API mirrors expo-linear-gradient so all call-sites are unchanged:
 *   colors, start, end, locations, style, children
 *
 * Coordinate mapping: expo uses { x, y } fractions (0–1), same as
 * react-native-linear-gradient's useAngle=false mode — no conversion needed.
 */
import React from 'react';
import Constants from 'expo-constants';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import RNLinearGradient from 'react-native-linear-gradient';

type ExpoLinearGradientProps = React.ComponentProps<typeof import('expo-linear-gradient').LinearGradient>;
const isExpoGo = Constants.executionEnvironment === 'storeClient';

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
  if (isExpoGo) {
    return (
      <ExpoLinearGradient
        colors={toStringArray(colors)}
        start={start ?? { x: 0, y: 0 }}
        end={end ?? { x: 1, y: 0 }}
        locations={locations ? [...locations] : undefined}
        style={style as any}
        {...rest}
      >
        {children}
      </ExpoLinearGradient>
    );
  }

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
