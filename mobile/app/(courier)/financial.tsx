import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../src/constants/theme';
import {
  financialService,
  CourierFinancialResponse,
  CourierBatchItem,
  CourierExpressItem,
} from '../../src/services/financialService';

export default function CourierFinancialScreen() {
  const [data, setData] = useState<CourierFinancialResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'batches' | 'express'>('batches');

  const loadFinancialData = useCallback(async () => {
    try {
      const response = await financialService.getCourierStatement();
      setData(response);
    } catch (error) {
      console.warn('Erro ao carregar extrato financeiro do entregador:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFinancialData();
  };

  const formatBRL = (val: number | undefined | null) => {
    const num = Number(val || 0);
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando extrato de ganhos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const summary = data?.summary;
  const batches = data?.batches || [];
  const expressOrders = data?.express_orders || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Extrato de Ganhos</Text>
          <Text style={styles.headerSubtitle}>
            Faturamento, Bônus de Lotes e Rendimento por Km
          </Text>
        </View>

        {/* Card Hero: Faturamento Consolidado */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconBadge}>
              <Ionicons name="cash" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.heroLabel}>Faturamento Total Acumulado</Text>
          </View>
          <Text style={styles.heroValue}>{formatBRL(summary?.total_earnings)}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroRpmBadge}>
              <Ionicons name="speedometer" size={14} color="#1D4ED8" />
              <Text style={styles.heroBadgeText}>
                {formatBRL(summary?.earnings_per_km)} / km rodado
              </Text>
            </View>
            <Text style={styles.heroKmCount}>
              {summary?.total_distance_km ? `${summary.total_distance_km} km percorridos` : '0 km'}
            </Text>
          </View>
        </View>

        {/* Grid de Resumo de Fontes de Ganho */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Fretes Base</Text>
            <Text style={styles.statValue}>{formatBRL(summary?.total_base_earnings)}</Text>
            <Text style={styles.statHint}>Remuneração padrão</Text>
          </View>
          <View style={[styles.statCard, styles.statCardBonus]}>
            <Text style={[styles.statLabel, styles.statLabelBonus]}>Bônus de Lotes (50%)</Text>
            <Text style={[styles.statValue, styles.statValueBonus]}>+{formatBRL(summary?.total_batch_bonus)}</Text>
            <Text style={styles.statHintBonus}>Rateio colaborativo</Text>
          </View>
        </View>

        {/* Dica Informativa de Rentabilidade */}
        <View style={styles.infoBox}>
          <Ionicons name="flame" size={20} color="#F59E0B" style={styles.infoIcon} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Mais ganhos por quilômetro rodado</Text>
            <Text style={styles.infoDescription}>
              Com o agrupamento noturno de Lotes Econômicos, você ganha a tarifa base da rota mais 50% de toda a economia gerada como bônus direto de produtividade.
            </Text>
          </View>
        </View>

        {/* Seletor de Abas de Histórico */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, tab === 'batches' && styles.tabButtonActive]}
            onPress={() => setTab('batches')}
          >
            <Ionicons
              name="layers-outline"
              size={16}
              color={tab === 'batches' ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={[styles.tabButtonText, tab === 'batches' && styles.tabButtonTextActive]}>
              Lotes Econômicos ({batches.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, tab === 'express' && styles.tabButtonActive]}
            onPress={() => setTab('express')}
          >
            <Ionicons
              name="flash-outline"
              size={16}
              color={tab === 'express' ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={[styles.tabButtonText, tab === 'express' && styles.tabButtonTextActive]}>
              Entregas Expressas ({expressOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conteúdo da Aba: Lotes Econômicos */}
        {tab === 'batches' && (
          batches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="layers-outline" size={44} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Nenhum lote econômico registrado</Text>
              <Text style={styles.emptySubtitle}>
                Seus lotes atribuídos e executados aparecerão aqui com os bônus de produtividade correspondentes.
              </Text>
            </View>
          ) : (
            batches.map((batch: CourierBatchItem) => (
              <View key={batch.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.badgeRow}>
                    <View style={styles.batchBadge}>
                      <Ionicons name="cash" size={12} color="#047857" />
                      <Text style={styles.batchBadgeText}>Lote #{batch.id}</Text>
                    </View>
                    <Text style={styles.itemDateText}>{batch.scheduled_date}</Text>
                  </View>
                  <View style={styles.bonusPill}>
                    <Text style={styles.bonusPillText}>+{formatBRL(batch.courier_bonus)} Bônus</Text>
                  </View>
                </View>

                <View style={styles.itemMetricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Distância</Text>
                    <Text style={styles.metricValue}>{batch.total_distance_km} km</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Duração</Text>
                    <Text style={styles.metricValue}>{batch.total_duration_minutes} min</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Pedidos</Text>
                    <Text style={styles.metricValue}>{batch.orders_count} paradas</Text>
                  </View>
                </View>

                <View style={styles.itemFooter}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemBaseFare}>
                      Rota: {formatBRL(batch.route_fare ?? (batch.total_distance_km * 2.50))}
                      {batch.orders_count > 0 && ` + Paradas: ${formatBRL(batch.stop_fee_total ?? (batch.orders_count * 3.00))}`}
                    </Text>
                  </View>
                  <Text style={styles.itemTotalEarnings}>Total: {formatBRL(batch.total_earnings)}</Text>
                </View>
              </View>
            ))
          )

        )}

        {/* Conteúdo da Aba: Entregas Expressas */}
        {tab === 'express' && (
          expressOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="flash-outline" size={44} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Nenhuma entrega expressa registrada</Text>
              <Text style={styles.emptySubtitle}>
                Corridas aceitas no radar aparecerão aqui após a conclusão.
              </Text>
            </View>
          ) : (
            expressOrders.map((order: CourierExpressItem) => (
              <View key={order.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.badgeRow}>
                    <View style={styles.expressBadge}>
                      <Ionicons name="flash" size={12} color="#B45309" />
                      <Text style={styles.expressBadgeText}>Expressa #{order.id}</Text>
                    </View>
                  </View>
                  <Text style={styles.itemTotalEarnings}>{formatBRL(order.freight_price)}</Text>
                </View>

                <Text style={styles.orderDescription}>{order.package_description}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  <Ionicons name="location-outline" size={13} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                  <Text style={styles.orderAddress} numberOfLines={1}>
                    Destino: {order.dest_address}
                  </Text>
                </View>

                <View style={styles.itemFooter}>
                  <Text style={styles.itemBaseFare}>{order.distance_km} km percorrido</Text>
                  <Text style={styles.itemStatusText}>Status: {order.status}</Text>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  heroIconBadge: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1D4ED8',
    marginVertical: SPACING.xs,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  heroRpmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  heroKmCount: {
    fontSize: 12,
    color: '#1E40AF',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  statCardBonus: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statLabelBonus: {
    color: '#166534',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  statValueBonus: {
    color: '#15803D',
  },
  statHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statHintBonus: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  infoIcon: {
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 2,
  },
  infoDescription: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 17,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabButtonTextActive: {
    color: COLORS.primary,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  batchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  batchBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  expressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  expressBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  itemDateText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  bonusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  bonusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  itemMetricsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  orderDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  orderAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: SPACING.xs,
  },
  itemBaseFare: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  itemTotalEarnings: {
    fontSize: 15,
    fontWeight: '700',
    color: '#047857',
  },
  itemStatusText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    padding: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
