import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';

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
      <Header onProfilePress={() => router.push('/(client)/profile')} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Merchant Welcome Banner */}
        <View style={[styles.welcomeCard, SHADOWS.md]}>
          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>🏪 Lojista / Comércio</Text>
            </View>
            {user?.role === 'admin' && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>👑 Admin Master</Text>
              </View>
            )}
          </View>

          <Text style={styles.storeName}>{businessName}</Text>
          <Text style={styles.storeDoc}>CNPJ/CPF: {cnpj}</Text>
          <Text style={styles.storeAddress}>📍 {address}</Text>
        </View>

        {/* Section: Sprint 1 Auth Verified Status */}
        <View style={[styles.statusCard, SHADOWS.sm]}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusIcon}>🛡️</Text>
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

        <TouchableOpacity
          style={[styles.actionCard, SHADOWS.sm]}
          activeOpacity={0.8}
          onPress={() => router.push('/(client)/create-order')}
          testID="client-new-order-preview"
        >
          <View style={styles.actionIconBox}>
            <Text style={styles.actionIcon}>📦</Text>
          </View>
          <View style={styles.actionTextBox}>
            <Text style={styles.actionTitle}>Novo Pedido de Entrega</Text>
            <Text style={styles.actionSubtitle}>
              Postagem expressa ou econômica com cubagem e geocodificação.
            </Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, SHADOWS.sm]}
          activeOpacity={0.8}
          onPress={() => router.push('/(client)/orders')}
          testID="client-history-preview"
        >
          <View style={styles.actionIconBox}>
            <Text style={styles.actionIcon}>📊</Text>
          </View>
          <View style={styles.actionTextBox}>
            <Text style={styles.actionTitle}>Histórico & Extrato 50/50</Text>
            <Text style={styles.actionSubtitle}>
              Acompanhe a economia gerada pelo rateio compartilhado.
            </Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        {/* Admin Switcher (If Admin) */}
        {role === 'admin' && (
          <View style={[styles.adminSwitcherCard, SHADOWS.sm]}>
            <Text style={styles.adminSwitcherTitle}>👑 Painel de Alternância Admin</Text>
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
  roleBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  adminBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  storeName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  storeDoc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  storeAddress: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statusCard: {
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: SPACING.xl,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  statusIcon: {
    fontSize: 18,
    marginRight: SPACING.xs,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  statusDesc: {
    fontSize: 12,
    color: '#065F46',
    lineHeight: 16,
  },
  sectionHeader: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionTextBox: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionArrow: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  adminSwitcherCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#C4B5FD',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  adminSwitcherTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6D28D9',
    marginBottom: 2,
  },
  adminSwitcherDesc: {
    fontSize: 12,
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
