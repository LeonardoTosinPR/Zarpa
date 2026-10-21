import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RADIUS, SHADOWS } from '../constants/theme';

export interface ExternalGpsButtonProps {
  title: string;
  subtitle?: string;
  variant?: 'card' | 'secondary' | 'compact';
  onPress: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function ExternalGpsButton({
  title,
  subtitle,
  variant = 'card',
  onPress,
  testID,
  style,
}: ExternalGpsButtonProps) {
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.compactBtn, style]}
        onPress={onPress}
        activeOpacity={0.8}
        testID={testID}
      >
        <Ionicons name="navigate" size={13} color="#1E40AF" style={{ marginRight: 4 }} />
        <Text style={styles.compactText}>{title}</Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        style={[styles.secondaryBtn, style]}
        onPress={onPress}
        activeOpacity={0.8}
        testID={testID}
      >
        <Ionicons name="navigate-outline" size={16} color="#1E40AF" style={{ marginRight: 6 }} />
        <Text style={styles.secondaryText}>{title}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.cardBtn, SHADOWS.sm, style]}
      onPress={onPress}
      activeOpacity={0.85}
      testID={testID}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="navigate" size={18} color="#FFFFFF" />
      </View>
      <View style={styles.textBox}>
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="open-outline" size={18} color="#1E40AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBox: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 1,
    lineHeight: 15,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  secondaryText: {
    color: '#1E40AF',
    fontWeight: '700',
    fontSize: 13,
  },
  compactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  compactText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
});

