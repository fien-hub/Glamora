/**
 * Safe lazy wrapper for @expo/vector-icons.
 *
 * expo-font calls requireNativeModule('ExpoFontLoader') at module-evaluation
 * time. In New Architecture (TurboModules) builds the module registry may not
 * be fully populated yet, so the call throws — crashing every file that
 * transitively imports expo-font, including @expo/vector-icons.
 *
 * Strategy:
 *  1. Try to require() at module-eval time (fast path — works once TurboModules
 *     are ready, which is always the case in subsequent renders).
 *  2. If that fails, each exported icon component subscribes on mount and
 *     retries after a short delay (by then the runtime is fully initialised).
 *  3. When the load finally succeeds every mounted icon component is notified
 *     and re-renders with the real glyph.
 *
 * The placeholder renders an invisible fixed-size box so layouts don't shift.
 */
import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  style?: any;
};

// Module-level cache — set once when the real module loads successfully
let _mod: Record<string, React.ComponentType<any>> | null = null;
// Subscribers notified when _mod becomes available
const _subscribers = new Set<() => void>();

function attemptLoad(): void {
  if (_mod) return;
  try {
    const m = require('@expo/vector-icons') as Record<string, React.ComponentType<any>>;
    if (m?.Ionicons) {
      _mod = m;
      _subscribers.forEach(fn => fn());
      _subscribers.clear();
    }
  } catch {
    // ExpoFontLoader not ready yet — components will retry via useEffect
  }
}

// Try immediately; if TurboModules are already registered this succeeds here
attemptLoad();

type LazyIconComponent = React.ComponentType<IconProps> & { glyphMap: Record<string, unknown> };

function createLazyIcon(iconName: string): LazyIconComponent {
  function LazyIcon(props: IconProps) {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
      if (_mod) return; // Already loaded — nothing to do
      const refresh = () => forceUpdate(n => n + 1);
      _subscribers.add(refresh);
      // Give TurboModule registry ~500 ms to finish initialising, then retry
      const timer = setTimeout(attemptLoad, 500);
      return () => {
        _subscribers.delete(refresh);
        clearTimeout(timer);
      };
    }, []);

    const Comp = _mod?.[iconName];
    if (Comp) {
      return React.createElement(Comp, props as any);
    }
    // Invisible placeholder preserves layout until the font loads
    return React.createElement(
      Text,
      {
        style: [
          { fontSize: props.size ?? 24, color: props.color ?? '#000', opacity: 0 },
          props.style,
        ],
      },
      'X',
    );
  }

  // Attach glyphMap stub so TypeScript callers that reference
  // `keyof typeof Ionicons.glyphMap` compile without errors
  (LazyIcon as any).glyphMap = new Proxy({} as Record<string, unknown>, {
    get: () => undefined,
    has: () => true,
  });

  return LazyIcon as LazyIconComponent;
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
