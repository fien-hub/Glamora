/**
 * icons.ts — Native icon renderer that bypasses expo-font's loading mechanism.
 *
 * Root cause: @expo/vector-icons v15 gates every render on Font.isLoaded().
 * That check only returns true after Font.loadAsync() succeeds. In this project
 * (bare workflow, New Architecture / Hermes), Font.loadAsync() fails silently
 * inside each icon's componentDidMount — leaving fontIsLoaded=false and every
 * icon rendering as a blank <Text /> permanently.
 *
 * Fix: Ionicons is reimplemented here as a plain <Text> that uses the TTF's
 * PostScript name 'Ionicons' directly. iOS registers that name at app startup
 * via UIAppFonts in Info.plist (added alongside the TTF files in the Xcode
 * project). No async loading, no Font.isLoaded gate, glyphs on first paint.
 */
import React from 'react';
import { Text } from 'react-native';

const GLYPH_MAP: Record<string, number> =
  require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');

const FONT_FAMILY = 'Ionicons';

interface IoniconsProps {
  name: string;
  size?: number;
  color?: string;
  style?: object;
  [key: string]: any;
}

function NativeIonicons({ name, size = 12, color = 'black', style, ...rest }: IoniconsProps) {
  const code = GLYPH_MAP[name];
  const glyph = typeof code === 'number' ? String.fromCodePoint(code) : '';
  return (
    <Text
      selectable={false}
      {...rest}
      style={[
        { fontSize: size, color },
        style,
        { fontFamily: FONT_FAMILY, fontWeight: 'normal', fontStyle: 'normal' },
      ]}
    >
      {glyph}
    </Text>
  );
}

export const Ionicons: React.ComponentType<IoniconsProps> = NativeIonicons;

let _icons: Record<string, any> = {};
try {
  _icons = require('@expo/vector-icons') as Record<string, any>;
} catch (e) {
  console.warn('[icons] @expo/vector-icons load failed:', e);
}

const passthrough = () => null;

export const MaterialIcons          = (_icons.MaterialIcons          ?? passthrough) as React.ComponentType<any>;
export const MaterialCommunityIcons = (_icons.MaterialCommunityIcons ?? passthrough) as React.ComponentType<any>;
export const FontAwesome            = (_icons.FontAwesome            ?? passthrough) as React.ComponentType<any>;
export const FontAwesome5           = (_icons.FontAwesome5           ?? passthrough) as React.ComponentType<any>;
export const Feather                = (_icons.Feather                ?? passthrough) as React.ComponentType<any>;
export const AntDesign              = (_icons.AntDesign              ?? passthrough) as React.ComponentType<any>;
export const Entypo                 = (_icons.Entypo                 ?? passthrough) as React.ComponentType<any>;
export const EvilIcons              = (_icons.EvilIcons              ?? passthrough) as React.ComponentType<any>;
export const Octicons               = (_icons.Octicons               ?? passthrough) as React.ComponentType<any>;
export const SimpleLineIcons        = (_icons.SimpleLineIcons        ?? passthrough) as React.ComponentType<any>;
export const Foundation             = (_icons.Foundation             ?? passthrough) as React.ComponentType<any>;
export const Zocial                 = (_icons.Zocial                 ?? passthrough) as React.ComponentType<any>;
