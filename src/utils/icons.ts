/**
 * Safe lazy wrapper for @expo/vector-icons.
 *
 * expo-font/build/ExpoFontLoader.js calls requireNativeModule('ExpoFontLoader')
 * at module level. In React Native New Architecture (TurboModules) builds,
 * if the native module initialises before the TurboModule registry is ready
 * the call throws and crashes every file that transitively imports expo-font —
 * including every file that imports from @expo/vector-icons.
 *
 * Wrapping require() in try/catch means this module always evaluates
 * successfully and exports a usable (possibly stub) component, so a single
 * native-module timing issue never silently freezes the splash screen.
 */
import React from 'react';
import { Text } from 'react-native';

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  style?: any;
};

const FallbackIcon: React.FC<IconProps> = ({ size = 24, color = '#000', style }) =>
  React.createElement(Text, { style: [{ fontSize: size, color }, style] }, '•');

let _Ionicons: React.ComponentType<IconProps> = FallbackIcon;
let _MaterialIcons: React.ComponentType<IconProps> = FallbackIcon;
let _MaterialCommunityIcons: React.ComponentType<IconProps> = FallbackIcon;
let _FontAwesome: React.ComponentType<IconProps> = FallbackIcon;
let _FontAwesome5: React.ComponentType<IconProps> = FallbackIcon;
let _Feather: React.ComponentType<IconProps> = FallbackIcon;
let _AntDesign: React.ComponentType<IconProps> = FallbackIcon;
let _Entypo: React.ComponentType<IconProps> = FallbackIcon;
let _EvilIcons: React.ComponentType<IconProps> = FallbackIcon;
let _Octicons: React.ComponentType<IconProps> = FallbackIcon;
let _SimpleLineIcons: React.ComponentType<IconProps> = FallbackIcon;
let _Foundation: React.ComponentType<IconProps> = FallbackIcon;
let _Zocial: React.ComponentType<IconProps> = FallbackIcon;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@expo/vector-icons') as Record<string, React.ComponentType<IconProps>>;
  if (mod?.Ionicons) _Ionicons = mod.Ionicons;
  if (mod?.MaterialIcons) _MaterialIcons = mod.MaterialIcons;
  if (mod?.MaterialCommunityIcons) _MaterialCommunityIcons = mod.MaterialCommunityIcons;
  if (mod?.FontAwesome) _FontAwesome = mod.FontAwesome;
  if (mod?.FontAwesome5) _FontAwesome5 = mod.FontAwesome5;
  if (mod?.Feather) _Feather = mod.Feather;
  if (mod?.AntDesign) _AntDesign = mod.AntDesign;
  if (mod?.Entypo) _Entypo = mod.Entypo;
  if (mod?.EvilIcons) _EvilIcons = mod.EvilIcons;
  if (mod?.Octicons) _Octicons = mod.Octicons;
  if (mod?.SimpleLineIcons) _SimpleLineIcons = mod.SimpleLineIcons;
  if (mod?.Foundation) _Foundation = mod.Foundation;
  if (mod?.Zocial) _Zocial = mod.Zocial;
} catch (e) {
  console.warn('[icons] @expo/vector-icons failed to load:', e);
}

export const Ionicons = _Ionicons;
export const MaterialIcons = _MaterialIcons;
export const MaterialCommunityIcons = _MaterialCommunityIcons;
export const FontAwesome = _FontAwesome;
export const FontAwesome5 = _FontAwesome5;
export const Feather = _Feather;
export const AntDesign = _AntDesign;
export const Entypo = _Entypo;
export const EvilIcons = _EvilIcons;
export const Octicons = _Octicons;
export const SimpleLineIcons = _SimpleLineIcons;
export const Foundation = _Foundation;
export const Zocial = _Zocial;
