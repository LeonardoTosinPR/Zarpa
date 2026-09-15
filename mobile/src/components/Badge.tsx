import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';

export type BadgeVariant = 'primary' | 'accent' | 'purple' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  iconName?: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export function Badge({
  label,
  variant = 'primary',
  iconName,
  size = 'md',
  style,
  textStyle,
  testID,
}: BadgeProps) {
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.base,
        isSm ? styles.sm : styles.md,
        styles[variant],
        style,
      ]}
      testID={testID}
    >
      {iconName && (
        <Ionicons
          name={iconName}
          size={isSm ? 12 : 14}
          color={styles[`${variant}Text`].color}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.text,
          isSm ? styles.textSm : styles.textMd,
          styles[`${variant}Text`],
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  textSm: {
    fontSize: TYPOGRAPHY.size.xs,
  },
  textMd: {
    fontSize: TYPOGRAPHY.size.sm,
  },
  // Variant styles
  primary: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },
  primaryText: {
    color: COLORS.primary,
  },
  accent: {
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accentBorder,
  },
  accentText: {
    color: COLORS.accentDark,
  },
  purple: {
    backgroundColor: COLORS.purpleLight,
    borderColor: COLORS.purpleBorder,
  },
  purpleText: {
    color: COLORS.purpleDark,
  },
  warning: {
    backgroundColor: COLORS.warningLight,
    borderColor: COLORS.warningBorder,
  },
  warningText: {
    color: COLORS.warningDark,
  },
  danger: {
    backgroundColor: COLORS.dangerLight,
    borderColor: COLORS.dangerBorder,
  },
  dangerText: {
    color: COLORS.dangerDark,
  },
  neutral: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
  },
  neutralText: {
    color: COLORS.textSecondary,
  },
});

