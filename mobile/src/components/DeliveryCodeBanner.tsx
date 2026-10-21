import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RADIUS, SPACING } from '../constants/theme';

export interface DeliveryCodeBannerProps {
  code: string;
  hint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function DeliveryCodeBanner({
  code,
  hint = 'Informe este código na entrega para validação pelo condutor',
  testID,
  style,
}: DeliveryCodeBannerProps) {
  return (
    <View style={[styles.banner, style]} testID={testID}>
      <View style={styles.left}>
        <View style={styles.headerRow}>
          <Ionicons name="keypad" size={14} color="#1E40AF" />
          <Text style={styles.title}>CÓDIGO DE ENTREGA (6 DÍGITOS)</Text>
        </View>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <View style={styles.pill}>
        <Text style={styles.value}>{code}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: SPACING.sm,
    gap: 8,
  },
  left: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 0.4,
  },
  hint: {
    fontSize: 11,
    color: '#1D4ED8',
    marginTop: 2,
  },
  pill: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  value: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
});

