import { Platform } from 'react-native';

/**
 * Snap It — organic "barely-there" design tokens.
 * Earth tones, serif headings, soft edges, and calm motion.
 */

export const colors = {
  primary: '#5B7C4F',
  primaryDark: '#4A6640',
  primarySoft: '#E8F0E4',
  secondary: '#C47A5A',
  secondaryLight: '#D4956A',
  secondarySoft: '#F7E9E1',

  bg: '#F5F0E8',
  surface: '#FDFBF7',
  white: '#FFFFFF',

  text: '#3E3229',
  textBody: '#5A4D42',
  muted: '#B5A188',

  success: '#8AAF6E',
  successDark: '#5E7D4A',
  successSoft: '#EDF4E7',
  danger: '#C45B5B',
  dangerSoft: '#FBEAEA',
  dangerBorder: '#E9C6C6',
  warning: '#C47A5A',
  warningSoft: '#F9EEE6',

  border: '#E6DED3',
  borderStrong: '#D8CDBE',
  overlay: 'rgba(62, 50, 41, 0.38)',
  row: '#F8F4EC',
};

export const fonts = {
  display: 'PlayfairDisplay_600SemiBold',
  heading: 'Merriweather_700Bold',
  headingRegular: 'Merriweather_400Regular',
  body: 'Lato_400Regular',
  bodySemibold: 'Lato_600SemiBold',
  bodyBold: 'Lato_700Bold',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 999,
};

function nativeShadow(opacity, radius, offsetY, elevation) {
  return {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}

export const shadows = {
  soft:
    Platform.OS === 'web'
      ? { boxShadow: '0 2px 8px rgba(62, 50, 41, 0.06)' }
      : nativeShadow(0.06, 8, 2, 2),
  medium:
    Platform.OS === 'web'
      ? { boxShadow: '0 4px 16px rgba(62, 50, 41, 0.10)' }
      : nativeShadow(0.1, 16, 4, 4),
  deep:
    Platform.OS === 'web'
      ? { boxShadow: '0 8px 24px rgba(62, 50, 41, 0.12)' }
      : nativeShadow(0.12, 24, 8, 8),
};

/** Web-only CSS transitions; safe no-op on native. */
export const transition = Platform.OS === 'web'
  ? {
      transitionProperty: 'all',
      transitionDuration: '0.2s',
      transitionTimingFunction: 'ease',
    }
  : {};

export const transitionSlow = Platform.OS === 'web'
  ? {
      transitionProperty: 'all',
      transitionDuration: '0.3s',
      transitionTimingFunction: 'ease',
    }
  : {};

export const type = {
  display: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 43,
    color: colors.text,
  },
  h1: {
    fontFamily: fonts.heading,
    fontSize: 28,
    lineHeight: 36,
    color: colors.text,
  },
  h2: {
    fontFamily: fonts.heading,
    fontSize: 22,
    lineHeight: 30,
    color: colors.text,
  },
  h3: {
    fontFamily: fonts.heading,
    fontSize: 18,
    lineHeight: 25,
    color: colors.text,
  },
  h4: {
    fontFamily: fonts.heading,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.textBody,
  },
  small: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.88,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  number: {
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.primary,
  },
  button: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    lineHeight: 20,
  },
};

/** Responsive breakpoints used by the Home grid. */
export const breakpoints = {
  tablet: 768,
  desktop: 1024,
};

export function deviceColumns(width) {
  if (width >= breakpoints.desktop) return 3;
  if (width >= breakpoints.tablet) return 2;
  return 1;
}

export const contentMaxWidth = 1200;
