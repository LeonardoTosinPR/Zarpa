import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { ActionCard } from '../../src/components/ActionCard';

export default function ClientDashboardScreen() {
  const router = useRouter();
  const { user, logout, role } = useAuth();

  const businessName = user?.client?.business_name || user?.name || 'Comércio Parceiro';
  const cnpj = user?.client?.cnpj_cpf || 'Não cadastrado';
  const address = user?.client?.default_address || 'Guarapuava - PR';

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  return (
    <View style={styles.container}>
      {/* Official Zarpa Header */}
      <Header />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Merchant Welcome Banner */}
        <View style={[styles.welcomeCard, SHADOWS.md]}>
          <View style={styles.badgeRow}>
            <Badge
              label="Lojista / Comércio"
              variant="primary"
              iconName="storefront"
              size="sm"
            />
            {user?.role === 'admin' && (
              <Badge
                label="Admin Master"
                variant="purple"
                iconName="shield-checkmark"
                size="sm"
              />
            )}
          </View>

          <Text style={styles.storeName}>{businessName}</Text>
          <Text style={styles.storeDoc}>CNPJ/CPF: {cnpj}</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.storeAddress}>{address}</Text>
          </View>
        </View>

        {/* Section: Sprint 1 Auth Verified Status */}
        <View style={[styles.statusCard, SHADOWS.sm]}>
          <View style={styles.statusHeader}>
            <Ionicons name="shield-checkmark" size={18} color={COLORS.accentDark} />
            <Text style={styles.statusTitle}>Sessão Autenticada com Sucesso</Text>
          </View>
          <Text style={styles.statusDesc}>
            Você está conectado à API do Zarpa via token Sanctum seguro. Seu perfil possui
            permissão total de lojista para postagem e cotação de fretes.
          </Text>
        </View>

        {/* Action Shortcuts Preview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ações Rápidas (Lojista)</Text>
        </View>

        <ActionCard
          iconName="cube-outline"
          title="Novo Pedido de Entrega"
          subtitle="Postagem expressa ou econômica com cubagem e geocodificação."
          testID="client-new-order-preview"
        />

        <ActionCard
          iconName="stats-chart-outline"
          title="Histórico & Extrato 50/50"
          subtitle="Acompanhe a economia gerada pelo rateio compartilhado."
          testID="client-history-preview"
        />

        {/* Admin Switcher (If Admin) */}
        {role === 'admin' && (
          <View style={[styles.adminSwitcherCard, SHADOWS.sm]}>
            <View style={styles.adminHeader}>
              <Ionicons name="shield-outline" size={16} color={COLORS.purpleDark} />
              <Text style={styles.adminSwitcherTitle}>Painel de Alternância Admin</Text>
            </View>
            <Text style={styles.adminSwitcherDesc}>
              Como administrador, você pode inspecionar o dashboard do entregador.
            </Text>
            <Button
              title="Visualizar Dashboard do Entregador"
              variant="secondary"
              onPress={() => router.push('/(courier)/dashboard')}
              style={styles.adminSwitchBtn}
              testID="admin-switch-to-courier"
            />
          </View>
        )}

        {/* Logout Button */}
        <Button
          title="Encerrar Sessão (Sair)"
          variant="outline"
          iconName="log-out-outline"
          onPress={handleLogout}
          style={styles.logoutButton}
          testID="client-logout-button"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  welcomeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    marginBottom: SPACING.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  storeName: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: COLORS.text,
    marginBottom: 4,
  },
  storeDoc: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
  },
  storeAddress: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
  },
  statusCard: {
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    marginBottom: SPACING.xl,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  statusTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.accentDark,
  },
  statusDesc: {
    fontSize: TYPOGRAPHY.size.xs,
    color: '#065F46',
    lineHeight: TYPOGRAPHY.lineHeight.tight,
  },
  sectionHeader: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
  },
  adminSwitcherCard: {
    backgroundColor: COLORS.purpleLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.purpleBorder,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  adminSwitcherTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.purpleDark,
  },
  adminSwitcherDesc: {
    fontSize: TYPOGRAPHY.size.xs,
    color: '#4C1D95',
    marginBottom: SPACING.sm,
  },
  adminSwitchBtn: {
    height: 42,
  },
  logoutButton: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
});
