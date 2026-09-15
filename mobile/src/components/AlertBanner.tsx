import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';

export type AlertType = 'error' | 'warning' | 'success' | 'info';

interface AlertBannerProps {
  message: string;
  type?: AlertType;
  style?: ViewStyle;
  testID?: string;
}

const TYPE_CONFIG = {
  error: {
    icon: 'alert-circle' as const,
    bg: COLORS.dangerLight,
    border: COLORS.dangerBorder,
    color: COLORS.danger,
  },
  warning: {
    icon: 'warning' as const,
    bg: COLORS.warningLight,
    border: COLORS.warningBorder,
    color: COLORS.warningDark,
  },
  success: {
    icon: 'checkmark-circle' as const,
    bg: COLORS.accentLight,
    border: COLORS.accentBorder,
    color: COLORS.accentDark,
  },
  info: {
    icon: 'information-circle' as const,
    bg: COLORS.infoLight,
    border: COLORS.infoBorder,
    color: COLORS.infoDark,
  },
};

export function AlertBanner({
  message,
  type = 'error',
  style,
  testID,
}: AlertBannerProps) {
  const config = TYPE_CONFIG[type];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bg, borderColor: config.border },
        style,
      ]}
      testID={testID}
    >
      <Ionicons
        name={config.icon}
        size={20}
        color={config.color}
        style={styles.icon}
      />
      <Text style={[styles.message, { color: config.color }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  message: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
});

