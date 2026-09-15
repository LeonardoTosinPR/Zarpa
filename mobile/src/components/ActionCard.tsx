import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../constants/theme';

interface ActionCardProps {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress?: () => void;
  accentIcon?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function ActionCard({
  iconName,
  title,
  subtitle,
  onPress,
  accentIcon = false,
  style,
  testID,
}: ActionCardProps) {
  return (
    <TouchableOpacity
      style={[styles.container, SHADOWS.sm, style]}
      onPress={onPress}
      activeOpacity={0.75}
      testID={testID}
      disabled={!onPress}
    >
      <View
        style={[
          styles.iconBox,
          accentIcon ? styles.iconBoxAccent : styles.iconBoxPrimary,
        ]}
      >
        <Ionicons
          name={iconName}
          size={22}
          color={accentIcon ? COLORS.accentDark : COLORS.primary}
        />
      </View>

      <View style={styles.textBox}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={COLORS.textMuted}
        style={styles.arrow}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  iconBoxPrimary: {
    backgroundColor: COLORS.primaryLight,
  },
  iconBoxAccent: {
    backgroundColor: COLORS.accentLight,
  },
  textBox: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    lineHeight: TYPOGRAPHY.lineHeight.tight,
  },
  arrow: {
    marginLeft: SPACING.sm,
  },
});

