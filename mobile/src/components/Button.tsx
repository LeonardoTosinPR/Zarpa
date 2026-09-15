import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'outline' | 'text' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  arrow?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  arrow = false,
  iconName,
  icon,
  style,
  textStyle,
  testID,
}: ButtonProps) {
  const isOutline = variant === 'outline';
  const isText = variant === 'text';
  const isAccent = variant === 'accent';
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';

  const getIconColor = () => {
    if (isOutline || isText) return COLORS.primary;
    if (isSecondary) return COLORS.primary;
    if (isDanger) return COLORS.surface;
    return COLORS.surface;
  };

  const getArrowColor = () => {
    if (isOutline || isText) return COLORS.primary;
    if (isSecondary) return COLORS.primary;
    return COLORS.surface;
  };

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[size],
        isAccent && styles.accent,
        isSecondary && styles.secondary,
        isOutline && styles.outline,
        isText && styles.textVariant,
        isDanger && styles.danger,
        !isOutline && !isText && SHADOWS.md,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          color={isOutline || isText ? COLORS.primary : COLORS.surface}
          size="small"
        />
      ) : (
        <View style={styles.content}>
          {iconName ? (
            <Ionicons
              name={iconName}
              size={iconSize}
              color={getIconColor()}
              style={styles.iconPrefix}
            />
          ) : icon ? (
            <Text style={styles.icon}>{icon} </Text>
          ) : null}

          <Text
            style={[
              styles.textBase,
              styles[`${size}Text`],
              isSecondary && styles.secondaryText,
              isOutline && styles.outlineText,
              isText && styles.textVariantText,
              textStyle,
            ]}
          >
            {title}
          </Text>

          {arrow && (
            <Ionicons
              name="arrow-forward"
              size={iconSize}
              color={getArrowColor()}
              style={styles.arrowIcon}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sm: {
    height: 40,
    paddingHorizontal: SPACING.md,
  },
  md: {
    height: 50,
    paddingHorizontal: SPACING.xl,
  },
  lg: {
    height: 56,
    paddingHorizontal: SPACING.xxl,
  },
  accent: {
    backgroundColor: COLORS.accent,
  },
  secondary: {
    backgroundColor: COLORS.primaryLight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  textVariant: {
    backgroundColor: 'transparent',
    height: 'auto',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  danger: {
    backgroundColor: COLORS.danger,
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPrefix: {
    marginRight: SPACING.xs,
  },
  icon: {
    fontSize: TYPOGRAPHY.size.md,
    marginRight: 4,
  },
  textBase: {
    color: COLORS.surface,
    fontWeight: TYPOGRAPHY.weight.bold,
    textAlign: 'center',
  },
  smText: {
    fontSize: TYPOGRAPHY.size.sm,
  },
  mdText: {
    fontSize: TYPOGRAPHY.size.md,
  },
  lgText: {
    fontSize: TYPOGRAPHY.size.lg,
  },
  secondaryText: {
    color: COLORS.primary,
  },
  outlineText: {
    color: COLORS.primary,
  },
  textVariantText: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  arrowIcon: {
    marginLeft: SPACING.xs,
  },
});
