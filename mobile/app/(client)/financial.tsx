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
  ClientFinancialResponse,
  ClientFinancialOrder,
} from '../../src/services/financialService';

export default function ClientFinancialScreen() {
  const [data, setData] = useState<ClientFinancialResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'discounted' | 'express'>('all');

  const loadFinancialData = useCallback(async () => {
    try {
      const response = await financialService.getClientStatement();
      setData(response);
    } catch (error) {
      console.warn('Erro ao carregar extrato financeiro do lojista:', error);
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

  const filteredOrders = (data?.orders || []).filter((order) => {
    if (filter === 'discounted') return order.has_batch_discount;
    if (filter === 'express') return order.shipping_type === 'express';
    return true;
  });

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando extrato financeiro...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const summary = data?.summary;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Extrato Financeiro</Text>
          <Text style={styles.headerSubtitle}>
            Transparência do Modelo Cooperativo de Rateio 50/50
          </Text>
        </View>

        {/* Card Hero: Economia Acumulada */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconBadge}>
              <Ionicons name="sparkles" size={20} color="#059669" />
            </View>
            <Text style={styles.heroLabel}>Economia Total com o Zarpa</Text>
          </View>
          <Text style={styles.heroValue}>{formatBRL(summary?.total_savings)}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroSavingsBadge}>
              <Ionicons name="trending-down" size={14} color="#047857" />
              <Text style={styles.heroBadgeText}>
                {summary?.average_savings_percent ? `${summary.average_savings_percent}%` : '0%'} de economia média
              </Text>
            </View>
            <Text style={styles.heroOrdersCount}>
              {summary?.total_orders_count || 0} entregas no histórico
            </Text>
          </View>
        </View>

        {/* Grid de Resumo Comparativo */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Valor Sem Rateio</Text>
            <Text style={styles.statValueOld}>{formatBRL(summary?.total_original_freight)}</Text>
            <Text style={styles.statHint}>Preço de tabela</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Efetivo Pago</Text>
            <Text style={styles.statValue}>{formatBRL(summary?.total_final_freight)}</Text>
            <Text style={styles.statHint}>Com descontos Zarpa</Text>
          </View>
        </View>

        {/* Bloco Informativo de Como Funciona o Rateio */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} style={styles.infoIcon} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Como funciona o Rateio 50/50?</Text>
            <Text style={styles.infoDescription}>
              Nos pedidos econômicos agrupados em rota contínua, a economia viária gerada é dividida: 50% retorna como desconto direto para os lojistas e 50% recompensa o entregador.
            </Text>
          </View>
        </View>

        {/* Filtros de Histórico */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Histórico de Pedidos</Text>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
              Todos ({data?.orders.length || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'discounted' && styles.filterChipActive]}
            onPress={() => setFilter('discounted')}
          >
            <Ionicons
              name="leaf"
              size={13}
              color={filter === 'discounted' ? COLORS.primary : COLORS.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterChipText, filter === 'discounted' && styles.filterChipTextActive]}>
              Com Rateio ({summary?.economic_orders_count || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'express' && styles.filterChipActive]}
            onPress={() => setFilter('express')}
          >
            <Ionicons
              name="flash"
              size={13}
              color={filter === 'express' ? COLORS.primary : COLORS.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterChipText, filter === 'express' && styles.filterChipTextActive]}>
              Expressos ({summary?.express_orders_count || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Transações */}
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Nenhum pedido encontrado</Text>
            <Text style={styles.emptySubtitle}>
              Seus fretes e economias detalhadas aparecerão aqui conforme suas postagens forem atendidas.
            </Text>
          </View>
        ) : (
          filteredOrders.map((order: ClientFinancialOrder) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderCardHeader}>
                <View style={styles.orderBadgeRow}>
                  <View
                    style={[
                      styles.typeBadge,
                      order.shipping_type === 'express' ? styles.typeBadgeExpress : styles.typeBadgeEconomic,
                    ]}
                  >
                    <Ionicons
                      name={order.shipping_type === 'express' ? 'flash' : 'leaf'}
                      size={12}
                      color={order.shipping_type === 'express' ? '#B45309' : '#047857'}
                    />
                    <Text
                      style={[
                        styles.typeBadgeText,
                        order.shipping_type === 'express' ? styles.typeBadgeTextExpress : styles.typeBadgeTextEconomic,
                      ]}
                    >
                      {order.shipping_type === 'express' ? 'Expressa' : 'Econômica'}
                    </Text>
                  </View>
                  <Text style={styles.orderIdText}>Pedido #{order.id}</Text>
                </View>

                {order.has_batch_discount && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>
                      -{formatBRL(order.discount_amount)} ({order.discount_percent}%)
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.orderDescription}>{order.package_description}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                <Ionicons name="location-outline" size={13} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.orderAddress} numberOfLines={1}>
                  Destino: {order.dest_address}
                </Text>
              </View>

              <View style={styles.orderFooter}>
                <View>
                  <Text style={styles.orderMetaText}>{order.distance_km} km</Text>
                </View>

                <View style={styles.orderPriceContainer}>
                  {order.has_batch_discount && (
                    <Text style={styles.orderPriceOriginal}>
                      {formatBRL(order.individual_freight_price)}
                    </Text>
                  )}
                  <Text style={styles.orderPriceFinal}>
                    {formatBRL(order.final_freight_price)}
                  </Text>
                </View>
              </View>
            </View>
          ))
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
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
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
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#047857',
    marginVertical: SPACING.xs,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  heroSavingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  heroOrdersCount: {
    fontSize: 12,
    color: '#065F46',
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
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statValueOld: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
    marginTop: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  statHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
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
    color: COLORS.primaryDark,
    marginBottom: 2,
  },
  infoDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  sectionHeader: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  orderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    gap: 3,
  },
  typeBadgeExpress: {
    backgroundColor: '#FEF3C7',
  },
  typeBadgeEconomic: {
    backgroundColor: '#D1FAE5',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  typeBadgeTextExpress: {
    color: '#B45309',
  },
  typeBadgeTextEconomic: {
    color: '#047857',
  },
  orderIdText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  discountBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
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
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: SPACING.xs,
  },
  orderMetaText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  orderPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  orderPriceOriginal: {
    fontSize: 13,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  orderPriceFinal: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
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
