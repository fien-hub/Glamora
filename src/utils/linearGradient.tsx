/**
 * Crash-safe faux LinearGradient.
 *
 * This component intentionally avoids rendering native gradient modules,
 * which have caused release-build crashes / "Unimplemented component" issues
 * on some architectures. Instead, it draws a visual gradient using multiple
 * absolutely-positioned color strips.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

type LinearGradientProps = React.ComponentProps<typeof import('expo-linear-gradient').LinearGradient>;

type RGBA = {
  r: number;
  g: number;
  b: number;
  a: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const normalizePoint = (point: unknown, fallbackX: number, fallbackY: number) => {
  if (Array.isArray(point)) {
    return {
      x: Number(point[0] ?? fallbackX),
      y: Number(point[1] ?? fallbackY),
    };
  }

  if (point && typeof point === 'object') {
    const maybePoint = point as { x?: number; y?: number };
    return {
      x: Number(maybePoint.x ?? fallbackX),
      y: Number(maybePoint.y ?? fallbackY),
    };
  }

  return { x: fallbackX, y: fallbackY };
};

const parseColor = (value: string): RGBA | null => {
  const color = value.trim().toLowerCase();

  if (color === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const rgbaMatch = color.match(/^rgba?\(([^)]+)\)$/);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(',').map((part) => part.trim());
    if (parts.length >= 3) {
      const r = Number(parts[0]);
      const g = Number(parts[1]);
      const b = Number(parts[2]);
      const a = parts.length >= 4 ? Number(parts[3]) : 1;
      if ([r, g, b, a].every((num) => Number.isFinite(num))) {
        return { r, g, b, a: clamp01(a) };
      }
    }
  }

  const hex = color.replace('#', '');
  if (/^[0-9a-f]{3,8}$/i.test(hex)) {
    const normalized = hex.length === 3 || hex.length === 4
      ? hex.split('').map((char) => char + char).join('')
      : hex;

    if (normalized.length === 6 || normalized.length === 8) {
      const r = Number.parseInt(normalized.slice(0, 2), 16);
      const g = Number.parseInt(normalized.slice(2, 4), 16);
      const b = Number.parseInt(normalized.slice(4, 6), 16);
      const a = normalized.length === 8
        ? Number.parseInt(normalized.slice(6, 8), 16) / 255
        : 1;
      return { r, g, b, a };
    }
  }

  return null;
};

const toRgbaString = (color: RGBA): string => {
  const r = Math.round(color.r);
  const g = Math.round(color.g);
  const b = Math.round(color.b);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(color.a)})`;
};

const resolveStops = (colors: string[], locations?: readonly number[]) => {
  if (colors.length === 1) {
    return [{ position: 0, color: colors[0] }, { position: 1, color: colors[0] }];
  }

  const fallback = colors.map((color, index) => ({
    position: index / (colors.length - 1),
    color,
  }));

  if (!locations || locations.length !== colors.length) {
    return fallback;
  }

  return colors.map((color, index) => ({
    position: clamp01(Number(locations[index])),
    color,
  }));
};

const interpolateColor = (colors: string[], locations: readonly number[] | undefined, t: number): string => {
  const stops = resolveStops(colors, locations);
  const clampedT = clamp01(t);

  for (let i = 0; i < stops.length - 1; i += 1) {
    const left = stops[i];
    const right = stops[i + 1];

    if (clampedT < left.position || clampedT > right.position) {
      continue;
    }

    const leftColor = parseColor(left.color);
    const rightColor = parseColor(right.color);
    if (!leftColor || !rightColor) {
      return left.color;
    }

    const span = Math.max(0.0001, right.position - left.position);
    const ratio = clamp01((clampedT - left.position) / span);

    return toRgbaString({
      r: leftColor.r + (rightColor.r - leftColor.r) * ratio,
      g: leftColor.g + (rightColor.g - leftColor.g) * ratio,
      b: leftColor.b + (rightColor.b - leftColor.b) * ratio,
      a: leftColor.a + (rightColor.a - leftColor.a) * ratio,
    });
  }

  return stops[stops.length - 1]?.color ?? colors[colors.length - 1] ?? 'transparent';
};

export const LinearGradient: React.FC<LinearGradientProps> = ({
  colors,
  start,
  end,
  locations,
  style,
  children,
  ...rest
}) => {
  const colorStops = (colors ?? []).map((c) => String(c));
  const normalizedLocations = Array.isArray(locations) ? Array.from(locations) : undefined;

  if (colorStops.length === 0) {
    return (
      <View style={style as any} {...rest}>
        {children}
      </View>
    );
  }

  if (colorStops.length === 1) {
    return (
      <View style={[{ backgroundColor: colorStops[0] }, style as any]} {...rest}>
        {children}
      </View>
    );
  }

  const startPoint = normalizePoint(start, 0, 0);
  const endPoint = normalizePoint(end, 1, 0);
  const isHorizontal = Math.abs(endPoint.x - startPoint.x) >= Math.abs(endPoint.y - startPoint.y);

  const segmentCount = 18;
  const segments = Array.from({ length: segmentCount }, (_, index) => {
    const t = index / (segmentCount - 1);
    return {
      key: index,
      color: interpolateColor(colorStops, normalizedLocations, t),
    };
  });

  return (
    <View style={[styles.container, style as any]} {...rest}>
      <View
        pointerEvents="none"
        style={[
          styles.gradientLayer,
          isHorizontal ? styles.rowDirection : styles.columnDirection,
        ]}
      >
        {segments.map((segment) => (
          <View
            key={segment.key}
            style={[
              isHorizontal ? styles.horizontalStrip : styles.verticalStrip,
              { backgroundColor: segment.color },
            ]}
          />
        ))}
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  rowDirection: {
    flexDirection: 'row',
  },
  columnDirection: {
    flexDirection: 'column',
  },
  horizontalStrip: {
    flex: 1,
  },
  verticalStrip: {
    flex: 1,
  },
});
