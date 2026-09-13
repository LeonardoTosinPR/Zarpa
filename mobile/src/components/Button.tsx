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
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  arrow?: boolean;
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
  icon,
  style,
  textStyle,
  testID,
}: ButtonProps) {
  const isOutline = variant === 'outline';
  const isText = variant === 'text';
  const isAccent = variant === 'accent';
  const isSecondary = variant === 'secondary';

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[size],
        isAccent && styles.accent,
        isSecondary && styles.secondary,
        isOutline && styles.outline,
        isText && styles.textVariant,
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
          {icon ? <Text style={styles.icon}>{icon} </Text> : null}
          <Text
            style={[
              styles.textBase,
              styles[`${size}Text`],
              isOutline && styles.outlineText,
              isText && styles.textVariantText,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {arrow && (
            <Text
              style={[
                styles.arrow,
                isOutline && styles.outlineText,
                isText && styles.textVariantText,
              ]}
            >
              {' →'}
            </Text>
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
    height: 52,
    paddingHorizontal: SPACING.xl,
  },
  lg: {
    height: 58,
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
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
    marginRight: 4,
  },
  textBase: {
    color: COLORS.surface,
    fontWeight: '700',
    textAlign: 'center',
  },
  smText: {
    fontSize: 14,
  },
  mdText: {
    fontSize: 16,
  },
  lgText: {
    fontSize: 18,
  },
  outlineText: {
    color: COLORS.primary,
  },
  textVariantText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  arrow: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
