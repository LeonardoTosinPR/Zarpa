import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';

export type CardVariant = 'default' | 'elevated' | 'outline' | 'accent' | 'purple';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: ViewStyle;
  testID?: string;
}

export function Card({
  children,
  variant = 'default',
  style,
  testID,
}: CardProps) {
  return (
    <View
      style={[
        styles.base,
        styles[variant],
        variant === 'elevated' ? SHADOWS.md : SHADOWS.sm,
        style,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  default: {},
  elevated: {
    borderWidth: 0,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: COLORS.border,
  },
  accent: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.accentBorder,
  },
  purple: {
    backgroundColor: COLORS.purpleLight,
    borderColor: COLORS.purpleBorder,
  },
});

