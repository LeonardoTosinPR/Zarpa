import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { financialService, ClientFinancialSummary } from '../../src/services/financialService';
import { orderService, OrderItem } from '../../src/services/orderService';
import { adminService } from '../../src/services/adminService';

export default function ClientDashboardScreen() {
  const router = useRouter();
  const { user, role } = useAuth();

  const [financialSummary, setFinancialSummary] = useState<ClientFinancialSummary | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);

  const handleTriggerBatchNow = async () => {
    try {
      setIsProcessingBatch(true);
      const res = await adminService.processEconomicBatch({ dry_run: false });
      Alert.alert(
        'Distribuição Concluída!',
        `Processamento noturno executado com sucesso!\n\n• Pedidos Organizados: ${res.orders_processed}\n• Lotes Criados: ${res.groups_created}\n• Economia Gerada: R$ ${Number(res.total_savings_generated).toFixed(2)}`,
        [{ text: 'OK', onPress: () => loadClientOverview() }]
      );
    } catch (err: any) {
      Alert.alert(
        'Erro ao Processar Lote',
        err?.response?.data?.message || 'Falha ao executar distribuição.'
      );
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const loadClientOverview = useCallback(async () => {
    try {
      if (typeof financialService.getClientStatement === 'function') {
        const finRes = await financialService.getClientStatement();
        if (finRes?.summary) {
          setFinancialSummary(finRes.summary);
        }
      }
    } catch (_) {}

    try {
      if (typeof orderService.getMyOrders === 'function') {
        const ordersRes = await orderService.getMyOrders();
        if (ordersRes?.data) {
          setOrders(ordersRes.data);
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadClientOverview();
  }, [loadClientOverview]);

  const onPullRefresh = async () => {
    setIsRefreshing(true);
    await loadClientOverview();
    setIsRefreshing(false);
  };

  const businessName = user?.client?.business_name || user?.name || 'Comércio Parceiro';
  const cnpj = user?.client?.cnpj_cpf || 'Não cadastrado';
  const address = user?.client?.default_address || 'Guarapuava - PR';

  const totalOrdersCount = financialSummary?.total_orders_count ?? orders.length;
  const activeOrdersCount = orders.filter(
    (o) => o.status === 'pending' || o.status === 'assigned' || o.status === 'picked_up'
  ).length;
  const deliveredOrdersCount = orders.filter((o) => o.status === 'delivered').length;

  return (
    <View style={styles.container}>
      {/* Official Zarpa Header */}
      <Header onProfilePress={() => router.push('/(client)/profile')} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onPullRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* 1. Dados Principais do Estabelecimento */}
        <View style={[styles.welcomeCard, SHADOWS.md]}>
          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Lojista / Comércio</Text>
            </View>
            {user?.role === 'admin' && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Admin Master</Text>
              </View>
            )}
          </View>

          <Text style={styles.storeName}>{businessName}</Text>
          <Text style={styles.storeDoc}>CNPJ/CPF: {cnpj}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.storeAddress}>{address}</Text>
          </View>
        </View>

        {/* 2. Resumo Simplificado de Economia (Rateio 50/50) */}
        <View style={[styles.summaryCard, SHADOWS.sm]}>
          <Text style={styles.summaryCardHeader}>Resumo de Economia (Rateio 50/50)</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Economia Acumulada</Text>
              <Text style={[styles.metricValuePrimary, { color: '#059669' }]}>
                R$ {Number(financialSummary?.total_savings ?? 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Desconto Médio</Text>
              <Text style={styles.metricValue}>
                {Number(financialSummary?.average_savings_percent ?? 0).toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* 3. Resumo de Pedidos (Apenas Informativo) */}
        <View style={[styles.summaryCard, SHADOWS.sm]}>
          <Text style={styles.summaryCardHeader}>Resumo de Entregas</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Postados</Text>
              <Text style={styles.metricValuePrimary}>{totalOrdersCount}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Em Andamento</Text>
              <Text style={styles.metricValue}>{activeOrdersCount}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Concluídos</Text>
              <Text style={styles.metricValue}>{deliveredOrdersCount}</Text>
            </View>
          </View>
        </View>

        {/* 4. Painel do Administrador Master (Acesso ao Dashboard Admin & Lote Manual) */}
        {(role === 'admin' || user?.role === 'admin') && (
          <View style={[styles.adminSwitcherCard, SHADOWS.sm]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }}>
              <Ionicons name="shield-checkmark" size={16} color="#A78BFA" />
              <Text style={styles.adminSwitcherTitle}>Painel do Administrador Master</Text>
            </View>
            <Text style={styles.adminSwitcherDesc}>
              Acesse o Dashboard de Admin para auditar pedidos/usuários ou execute manualmente o lote noturno (Rateio 50/50).
            </Text>

            <Button
              title="Acessar Dashboard de Admin"
              variant="primary"
              onPress={() => router.push('/(client)/admin')}
              style={{ marginBottom: SPACING.sm }}
              testID="admin-open-panel-btn"
            />

            <Button
              title={isProcessingBatch ? 'Executando Distribuição...' : 'Executar Lote Noturno Agora'}
              variant="secondary"
              onPress={handleTriggerBatchNow}
              disabled={isProcessingBatch}
              style={{ ...styles.adminSwitchBtn, marginBottom: SPACING.sm }}
              textStyle={{ color: '#FFFFFF', fontWeight: '700' }}
              testID="admin-trigger-batch-dashboard-btn"
            />

            <Button
              title="Alternar para Visão do Entregador"
              variant="secondary"
              onPress={() => router.push('/(courier)/dashboard')}
              style={styles.adminSwitchBtn}
              textStyle={{ color: '#FFFFFF', fontWeight: '700' }}
              testID="admin-switch-to-courier"
            />
          </View>
        )}
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
    paddingBottom: SPACING.xxl * 2,
  },
  welcomeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    marginBottom: SPACING.md,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryCardHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  metricValuePrimary: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },
  newOrderHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  newOrderHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  newOrderIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newOrderHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  newOrderHeroSubtitle: {
    fontSize: 11,
    color: '#DBEAFE',
    marginTop: 2,
  },
  savingsOverviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: SPACING.md,
  },
  savingsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  savingsCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  savingsCardSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  savingsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  savingsLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  savingsMetricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  savingsMetricBox: {
    flex: 1,
    alignItems: 'center',
  },
  savingsMetricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  savingsMetricValueHighlight: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  savingsMetricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  savingsMetricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  recentOrdersSection: {
    marginBottom: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  seeAllLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyRecentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyRecentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 6,
  },
  emptyRecentSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 16,
  },
  recentOrderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  recentOrderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recentOrderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  recentOrderPkg: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  recentStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recentStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  recentOrderAddress: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  recentOrderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  recentOrderType: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  recentOrderPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
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
    flexShrink: 1,
  },
  storeDoc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
    flexShrink: 1,
  },
  storeAddress: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    flexShrink: 1,
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
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  adminSwitcherTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A78BFA',
    marginBottom: 2,
  },
  adminSwitcherDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: SPACING.sm,
  },
  adminSwitchBtn: {
    height: 44,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
  },
});
