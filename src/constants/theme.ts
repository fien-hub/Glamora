export const colors = {
  // Primary - Coral/Peach for CTAs, active states, and key accents (NEW BRAND COLOR)
  primary: '#F4B5A4',           // Base coral/peach from image
  primaryDark: '#E89580',        // Darker coral for emphasis
  primaryDarker: '#D97A5F',      // Even darker for high contrast
  primaryLight: '#F8CFC3',       // Light coral for selected backgrounds
  primaryLighter: '#FCE5DF',     // Very light coral for subtle backgrounds
  primarySubtle: '#FEF5F2',      // Almost white coral tint

  // Soft Pink - For tab buttons, pill tabs, and filter buttons
  softPink: '#E8A598',          // Soft pink/salmon for tab buttons (matches Verify Now button)

  // High Contrast Coral - MANDATORY for text, borders, and icons on white backgrounds
  // Solves visibility issues with soft coral being too light
  highContrastCoral: '#D97A5F',  // High contrast coral for text/icons (same as primaryDarker)

  // Secondary Accent - Soft Grey/Teal for utility settings and secondary actions
  secondary: '#9CA3AF',
  secondaryDark: '#6B7280',
  secondaryLight: '#D1D5DB',
  secondarySubtle: '#F3F4F6',

  // Tertiary - Soft Teal for variety and sophistication
  tertiary: '#5EEAD4',
  tertiaryDark: '#2DD4BF',
  tertiaryLight: '#99F6E4',
  tertiarySubtle: '#CCFBF1',

  // Neutral - Enhanced grayscale for better hierarchy
  background: '#FFFFFF',
  backgroundGray: '#F7F7F7',
  backgroundDark: '#F0F0F0',

  surface: '#FFFFFF',
  surfaceElevated: '#FAFAFA',

  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textLight: '#9E9E9E',
  textDisabled: '#BDBDBD',

  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  borderDark: '#D0D0D0',

  // Semantic colors
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  white: '#FFFFFF',
  black: '#000000',

  // Status colors
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  inProgress: '#8B5CF6',
  completed: '#10B981',
  cancelled: '#EF4444',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  xxxxl: 64,

  // Semantic spacing for specific use cases
  cardPadding: 20,
  cardMargin: 16,
  sectionSpacing: 32,
  screenPadding: 20,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  xxxl: 36,
  xxxxl: 48,

  // Semantic font sizes
  caption: 11,
  body: 15,
  bodyLarge: 17,
  subtitle: 13,
  title: 20,
  heading: 28,
  display: 36,
};

export const fontWeight = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
  loose: 2,
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  // Colored shadows for special effects
  primaryGlow: {
    shadowColor: '#F4B5A4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  // Soft shadow for header (lifted feel)
  headerShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
};

// Animation timing constants
export const animation = {
  duration: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
  },
  delay: {
    none: 0,
    short: 50,      // Stagger delay for list items
    medium: 100,    // Stagger delay for sections
    long: 150,      // Stagger delay for major elements
  },
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  // Entrance animation defaults
  entrance: {
    fadeInDuration: 250,
    slideUpDuration: 250,
    slideUpDistance: 30,
    scaleInDuration: 250,
    scaleInInitial: 0.8,
    staggerDelay: 50,
    maxStaggerDelay: 300,
  },
};

// Opacity values for consistent transparency
export const opacity = {
  disabled: 0.4,
  hover: 0.8,
  pressed: 0.6,
  overlay: 0.5,
  subtle: 0.1,
};

export const theme = {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  lineHeight,
  shadows,
  animation,
  opacity,
};

export type Theme = typeof theme;

