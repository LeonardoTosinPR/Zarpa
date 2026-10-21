import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS } from '../constants/theme';

export interface OrderStatusBadgeProps {
  status: string;
  style?: StyleProp<ViewStyle>;
}

export interface OrderModalityBadgeProps {
  shippingType: string;
  gender?: 'feminine' | 'masculine';
  showIcon?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function getOrderStatusConfig(status: string) {
  switch (status) {
    case 'pending':
      return { label: 'Pendente', bg: '#FEF3C7', color: '#92400E' };
    case 'assigned':
      return { label: 'Atribuído', bg: '#DBEAFE', color: '#1E40AF' };
    case 'picked_up':
    case 'in_progress':
      return { label: 'Em Rota', bg: '#EDE9FE', color: '#5B21B6' };
    case 'delivered':
    case 'completed':
      return { label: status === 'completed' ? 'Concluído' : 'Entregue', bg: '#D1FAE5', color: '#065F46' };
    case 'canceled':
      return { label: 'Cancelado', bg: '#FEE2E2', color: '#991B1B' };
    default:
      return { label: status, bg: '#F1F5F9', color: '#475569' };
  }
}

export function OrderStatusBadge({ status, style }: OrderStatusBadgeProps) {
  const info = getOrderStatusConfig(status);
  return (
    <View style={[styles.statusBadge, { backgroundColor: info.bg }, style]}>
      <Text style={[styles.statusText, { color: info.color }]}>{info.label}</Text>
    </View>
  );
}

export function OrderModalityBadge({
  shippingType,
  gender = 'feminine',
  showIcon = false,
  style,
}: OrderModalityBadgeProps) {
  const isEconomic = shippingType === 'economic';
  const label = isEconomic
    ? gender === 'masculine'
      ? 'Econômico'
      : 'Econômica'
    : gender === 'masculine'
    ? 'Expresso'
    : 'Expressa';

  return (
    <View
      style={[
        styles.modalityBadge,
        isEconomic ? styles.economicBadge : styles.expressBadge,
        style,
      ]}
    >
      {showIcon && (
        <Ionicons
          name={isEconomic ? 'leaf' : 'flash'}
          size={11}
          color={isEconomic ? COLORS.primary : COLORS.warning}
          style={{ marginRight: 3 }}
        />
      )}
      <Text
        style={[
          styles.modalityText,
          isEconomic ? styles.economicText : styles.expressText,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    flexShrink: 0,
  },
  modalityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  economicBadge: {
    backgroundColor: '#ECFDF5',
  },
  economicText: {
    color: '#065F46',
  },
  expressBadge: {
    backgroundColor: '#FEF3C7',
  },
  expressText: {
    color: '#92400E',
  },
});

