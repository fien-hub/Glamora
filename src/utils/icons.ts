/**
 * Re-exports from @expo/vector-icons.
 *
 * Fonts are loaded explicitly in AppRuntime (Font.loadAsync) before any
 * navigation or screen renders, so glyphs are available from first paint.
 * The expo-font config plugin in app.json also registers them in UIAppFonts
 * for every native build, making Font.loadAsync a no-op once that build is
 * installed.
 *
 * A module-level try/catch guards against an unlikely import failure in a
 * future build without replacing every caller.
 */
import React from 'react';
import { Text } from 'react-native';
import type { ComponentType } from 'react';

function makePlaceholder(): ComponentType<{ size?: number; style?: any }> {
  return function IconPlaceholder({ size = 24, style }: { size?: number; style?: any }) {
    return React.createElement(Text, {
      style: [{ width: size, height: size, opacity: 0 }, style],
    });
  };
}

let _icons: Record<string, ComponentType<any>> = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _icons = require('@expo/vector-icons') as Record<string, ComponentType<any>>;
} catch (e) {
  console.warn('[icons] @expo/vector-icons failed to load:', e);
}

const get = (name: string): ComponentType<any> =>
  _icons[name] ?? makePlaceholder();

export const Ionicons               = get('Ionicons');
export const MaterialIcons          = get('MaterialIcons');
export const MaterialCommunityIcons = get('MaterialCommunityIcons');
export const FontAwesome            = get('FontAwesome');
export const FontAwesome5           = get('FontAwesome5');
export const Feather                = get('Feather');
export const AntDesign              = get('AntDesign');
export const Entypo                 = get('Entypo');
export const EvilIcons              = get('EvilIcons');
export const Octicons               = get('Octicons');
export const SimpleLineIcons        = get('SimpleLineIcons');
export const Foundation             = get('Foundation');
export const Zocial                 = get('Zocial');
