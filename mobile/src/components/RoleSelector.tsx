import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../constants/theme';

interface RoleOption {
  role: 'client' | 'courier';
  title: string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
  badgeText: string;
}

interface RoleSelectorProps {
  selectedRole: 'client' | 'courier';
  onSelect: (role: 'client' | 'courier') => void;
}

const OPTIONS: RoleOption[] = [
  {
    role: 'client',
    title: 'Lojista / Estabelecimento',
    subtitle: 'Envie pacotes e encomendas com rastreamento e frete inteligente.',
    iconName: 'storefront-outline',
    badgeText: 'Lojista',
  },
  {
    role: 'courier',
    title: 'Entregador / Condutor',
    subtitle: 'Receba chamados expressos e rotas otimizadas com rateio 50/50.',
    iconName: 'bicycle-outline',
    badgeText: 'Entregador',
  },
];

export function RoleSelector({ selectedRole, onSelect }: RoleSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Selecione seu Perfil de Atuação</Text>
      <Text style={styles.sectionSubtitle}>
        Como você deseja utilizar a plataforma Zarpa?
      </Text>

      <View style={styles.optionsList}>
        {OPTIONS.map((opt) => {
          const isSelected = selectedRole === opt.role;

          return (
            <TouchableOpacity
              key={opt.role}
              style={[
                styles.card,
                isSelected && styles.cardSelected,
                isSelected ? SHADOWS.md : SHADOWS.sm,
              ]}
              onPress={() => onSelect(opt.role)}
              activeOpacity={0.8}
              testID={`role-option-${opt.role}`}
            >
              {/* Header inside Card: Vector Icon + Radio indicator */}
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconBox,
                    isSelected ? styles.iconBoxSelected : styles.iconBoxUnselected,
                  ]}
                >
                  <Ionicons
                    name={opt.iconName}
                    size={22}
                    color={isSelected ? COLORS.primary : COLORS.textSecondary}
                  />
                </View>

                <View
                  style={[
                    styles.radioOuter,
                    isSelected && styles.radioOuterSelected,
                  ]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </View>

              {/* Title & Description */}
              <Text style={[styles.title, isSelected && styles.titleSelected]}>
                {opt.title}
              </Text>
              <Text style={styles.subtitle}>{opt.subtitle}</Text>

              {/* Badge */}
              <View style={[styles.badge, isSelected && styles.badgeSelected]}>
                <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>
                  ✓ {opt.badgeText}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  optionsList: {
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxUnselected: {
    backgroundColor: COLORS.background,
  },
  iconBoxSelected: {
    backgroundColor: '#FFFFFF',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  radioOuterSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  titleSelected: {
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
    marginBottom: SPACING.md,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  badgeSelected: {
    backgroundColor: COLORS.accentLight,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textMuted,
  },
  badgeTextSelected: {
    color: COLORS.accentDark,
  },
});
