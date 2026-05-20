/**
 * Safe lazy wrapper for @expo/vector-icons.
 *
 * Strategy (3-layer defence):
 *  1. Try require('@expo/vector-icons') at module-eval time.
 *  2. Async: try Font.loadAsync() with the TTF files bundled via Metro assets.
 *     After fonts are registered, re-try the require and notify all mounted icons.
 *  3. Each icon component also retries after 1 s on mount (covers edge-cases
 *     where neither step 1 nor step 2 succeeded by first render).
 *
 * The invisible placeholder preserves layout until glyphs are available.
 * Once fonts load, every mounted icon re-renders automatically.
 *
 * NOTE: app.json also configures the expo-font config-plugin to embed the
 * TTF files in UIAppFonts (Info.plist) so iOS registers them natively at
 * startup — this means step 1 will succeed on every subsequent build.
 */
import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';

type IconLib = Record<string, React.ComponentType<any>>;

let _mod: IconLib | null = null;
const _subscribers = new Set<() => void>();

function notifyAll(): void {
  _subscribers.forEach(fn => fn());
  _subscribers.clear();
}

function tryRequire(): boolean {
  if (_mod) return true;
  try {
    const m = require('@expo/vector-icons') as IconLib;
    if (m?.Ionicons) {
      _mod = m;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function tryLoadFonts(): Promise<void> {
  try {
    const Font = require('expo-font') as typeof import('expo-font');
    await Font.loadAsync({
      /* eslint-disable @typescript-eslint/no-var-requires */
      'AntDesign':              require('@expo/vector-icons/fonts/AntDesign.ttf'),
      'Entypo':                 require('@expo/vector-icons/fonts/Entypo.ttf'),
      'EvilIcons':              require('@expo/vector-icons/fonts/EvilIcons.ttf'),
      'Feather':                require('@expo/vector-icons/fonts/Feather.ttf'),
      'FontAwesome':            require('@expo/vector-icons/fonts/FontAwesome.ttf'),
      'FontAwesome5_Regular':   require('@expo/vector-icons/fonts/FontAwesome5_Regular.ttf'),
      'FontAwesome5_Solid':     require('@expo/vector-icons/fonts/FontAwesome5_Solid.ttf'),
      'Foundation':             require('@expo/vector-icons/fonts/Foundation.ttf'),
      'Ionicons':               require('@expo/vector-icons/fonts/Ionicons.ttf'),
      'MaterialCommunityIcons': require('@expo/vector-icons/fonts/MaterialCommunityIcons.ttf'),
      'MaterialIcons':          require('@expo/vector-icons/fonts/MaterialIcons.ttf'),
      'Octicons':               require('@expo/vector-icons/fonts/Octicons.ttf'),
      'SimpleLineIcons':        require('@expo/vector-icons/fonts/SimpleLineIcons.ttf'),
      'Zocial':                 require('@expo/vector-icons/fonts/Zocial.ttf'),
      /* eslint-enable @typescript-eslint/no-var-requires */
    });
    console.log('[icons] Font.loadAsync succeeded');
    if (tryRequire()) notifyAll();
  } catch (e) {
    console.warn('[icons] Font.loadAsync failed, falling back to require-only:', e);
    if (tryRequire()) notifyAll();
  }
}

// Layer 1 — immediate attempt at module eval time
tryRequire();

// Layer 2 — async font loading (resolves before first render in most cases)
tryLoadFonts();

type LazyIconComponent = React.ComponentType<{
  name: string;
  size?: number;
  color?: string;
  style?: any;
}> & { glyphMap: Record<string, unknown> };

function createLazyIcon(iconName: string): LazyIconComponent {
  function LazyIcon({
    name,
    size = 24,
    color = '#000',
    style,
  }: {
    name: string;
    size?: number;
    color?: string;
    style?: any;
  }) {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
      if (_mod) return;

      const refresh = () => forceUpdate(n => n + 1);
      _subscribers.add(refresh);

      // Layer 3 — per-component 1 s retry
      const timer = setTimeout(() => {
        if (tryRequire()) notifyAll();
        else forceUpdate(n => n + 1);
      }, 1000);

      return () => {
        _subscribers.delete(refresh);
        clearTimeout(timer);
      };
    }, []);

    const Comp = _mod?.[iconName];
    if (Comp) {
      return React.createElement(Comp, { name, size, color, style } as any);
    }

    // Invisible fixed-size placeholder — preserves layout, shows nothing
    return React.createElement(Text, {
      style: [{ width: size, height: size, opacity: 0 }, style],
    });
  }

  // Stub so TypeScript callers that use `keyof typeof Ionicons.glyphMap` compile
  (LazyIcon as any).glyphMap = new Proxy({} as Record<string, unknown>, {
    get: () => undefined,
    has: () => true,
  });

  return LazyIcon as unknown as LazyIconComponent;
}

export const Ionicons               = createLazyIcon('Ionicons');
export const MaterialIcons          = createLazyIcon('MaterialIcons');
export const MaterialCommunityIcons = createLazyIcon('MaterialCommunityIcons');
export const FontAwesome            = createLazyIcon('FontAwesome');
export const FontAwesome5           = createLazyIcon('FontAwesome5');
export const Feather                = createLazyIcon('Feather');
export const AntDesign              = createLazyIcon('AntDesign');
export const Entypo                 = createLazyIcon('Entypo');
export const EvilIcons              = createLazyIcon('EvilIcons');
export const Octicons               = createLazyIcon('Octicons');
export const SimpleLineIcons        = createLazyIcon('SimpleLineIcons');
export const Foundation             = createLazyIcon('Foundation');
export const Zocial                 = createLazyIcon('Zocial');
