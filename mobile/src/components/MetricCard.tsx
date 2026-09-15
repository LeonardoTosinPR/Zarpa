import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../constants/theme';

export interface MetricItemData {
  label: string;
  value: string;
  isPrimary?: boolean;
}

interface MetricCardProps {
  title?: string;
  metrics: MetricItemData[];
  style?: ViewStyle;
  testID?: string;
}

export function MetricCard({
  title,
  metrics,
  style,
  testID,
}: MetricCardProps) {
  return (
    <View style={[styles.container, SHADOWS.sm, style]} testID={testID}>
      {title && <Text style={styles.header}>{title}</Text>}

      <View style={styles.metricsRow}>
        {metrics.map((item, index) => (
          <React.Fragment key={item.label}>
            {index > 0 && <View style={styles.divider} />}
            <View style={styles.metricItem}>
              <Text style={styles.label}>{item.label}</Text>
              <Text
                style={[
                  styles.value,
                  item.isPrimary ? styles.valuePrimary : styles.valueDefault,
                ]}
              >
                {item.value}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
  },
  header: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  value: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.extrabold,
  },
  valuePrimary: {
    color: COLORS.accentDark,
  },
  valueDefault: {
    color: COLORS.text,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },
});

