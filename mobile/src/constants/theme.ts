export const COLORS = {
  // Brand Primary (Indigo)
  primary: '#4338CA',
  primaryDark: '#3730A3',
  primaryLight: '#EEF2FF',
  primaryBorder: '#C7D2FE',

  // Accent Brand (Emerald - Success / Earnings / Online)
  accent: '#059669',
  accentLight: '#ECFDF5',
  accentDark: '#047857',
  accentBorder: '#A7F3D0',

  // Administrative / Special (Violet / Purple)
  purple: '#7C3AED',
  purpleLight: '#F5F3FF',
  purpleDark: '#6D28D9',
  purpleBorder: '#DDD6FE',

  // Neutral Canvas & Surface
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',

  // Text Hierarchy
  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Borders & Dividers
  border: '#E2E8F0',
  borderFocus: '#4338CA',
  borderLight: '#F1F5F9',

  // State & Feedback Colors
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  dangerDark: '#991B1B',
  dangerBorder: '#FECACA',

  warning: '#D97706',
  warningLight: '#FFFBEB',
  warningDark: '#B45309',
  warningBorder: '#FDE68A',

  info: '#2563EB',
  infoLight: '#EFF6FF',
  infoDark: '#1D4ED8',
  infoBorder: '#BFDBFE',
};

export const TYPOGRAPHY = {
  size: {
    xs: 12,
    sm: 13,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    hero: 34,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  },
  lineHeight: {
    tight: 16,
    normal: 20,
    relaxed: 24,
    loose: 30,
  },
};

export const SPACING = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 40,
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const COMMON_STYLES = {
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowCenter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  rowBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  center: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
};
