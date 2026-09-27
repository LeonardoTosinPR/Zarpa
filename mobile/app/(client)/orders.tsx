import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { Header } from '../../src/components/Header';
import { orderService, OrderItem } from '../../src/services/orderService';

export default function ClientOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const loadOrders = useCallback(async (filter?: string) => {
    try {
      const statusParam = filter && filter !== 'all' ? filter : undefined;
      const response = await orderService.getMyOrders(statusParam);
      setOrders(response.data || []);
    } catch (err) {
      console.warn('Erro ao carregar pedidos:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadOrders(activeFilter);
  }, [activeFilter, loadOrders]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadOrders(activeFilter);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: '⏳ Pendente', bg: '#FEF3C7', color: '#92400E' };
      case 'assigned':
        return { label: '🛵 Atribuído', bg: '#DBEAFE', color: '#1E40AF' };
      case 'picked_up':
        return { label: '📦 Em Rota', bg: '#EDE9FE', color: '#5B21B6' };
      case 'delivered':
        return { label: '✅ Entregue', bg: '#D1FAE5', color: '#065F46' };
      case 'canceled':
        return { label: '❌ Cancelado', bg: '#FEE2E2', color: '#991B1B' };
      default:
        return { label: status, bg: '#F1F5F9', color: '#475569' };
    }
  };

  const renderOrderItem = ({ item }: { item: OrderItem }) => {
    const statusInfo = getStatusBadge(item.status);
    const isEconomic = item.shipping_type === 'economic';

    return (
      <View style={[styles.orderCard, SHADOWS.sm]} testID={`order-card-${item.id}`}>
        {/* Top: ID, Modality & Status */}
        <View style={styles.orderTopRow}>
          <View style={styles.idAndModality}>
            <Text style={styles.orderId}>Pedido #{item.id}</Text>
            <View
              style={[
                styles.modalityBadge,
                isEconomic ? styles.economicBadge : styles.expressBadge,
              ]}
            >
              <Text
                style={[
                  styles.modalityBadgeText,
                  isEconomic ? styles.economicBadgeText : styles.expressBadgeText,
                ]}
              >
                {isEconomic ? '🌱 Econômica' : '⚡ Expressa'}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Item Description */}
        <Text style={styles.packageDescription}>{item.package_description}</Text>

        {/* Addresses */}
        <View style={styles.routeContainer}>
          <View style={styles.routeStep}>
            <Text style={styles.routeDotGreen}>●</Text>
            <Text style={styles.routeAddress} numberOfLines={1}>
              {item.origin_address}
            </Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeStep}>
            <Text style={styles.routeDotRed}>●</Text>
            <Text style={styles.routeAddress} numberOfLines={1}>
              {item.dest_address}
            </Text>
          </View>
        </View>

        {/* Footer: Distance, Duration, Price */}
        <View style={styles.orderFooter}>
          <View style={styles.statsGroup}>
            <Text style={styles.statDetail}>📏 {item.distance_km} km</Text>
            <Text style={styles.statDetail}>⚖️ {item.package_weight_kg} kg</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Valor do Frete</Text>
            <Text style={styles.priceValue}>
              R$ {Number(item.individual_freight_price).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header />

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {[
          { key: 'all', label: 'Todos' },
          { key: 'pending', label: 'Pendentes' },
          { key: 'assigned', label: 'Em Andamento' },
          { key: 'delivered', label: 'Entregues' },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterTab,
              activeFilter === filter.key && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter(filter.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter.key && styles.filterTabTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Orders List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando seus pedidos...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>Nenhum pedido encontrado</Text>
          <Text style={styles.emptySubtitle}>
            Você ainda não possui pedidos com este filtro. Que tal criar um novo envio?
          </Text>
          <TouchableOpacity
            style={[styles.newOrderBtn, SHADOWS.sm]}
            onPress={() => router.push('/(client)/create-order')}
          >
            <Text style={styles.newOrderBtnText}>+ Criar Novo Pedido</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
  },
  filterTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  idAndModality: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  modalityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  economicBadge: {
    backgroundColor: '#ECFDF5',
  },
  economicBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  expressBadge: {
    backgroundColor: '#FEF3C7',
  },
  expressBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  packageDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2,
    marginBottom: SPACING.sm,
  },
  routeContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  routeStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  routeDotGreen: {
    color: '#059669',
    fontSize: 14,
  },
  routeDotRed: {
    color: '#DC2626',
    fontSize: 14,
  },
  routeAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  routeLine: {
    width: 2,
    height: 8,
    backgroundColor: COLORS.border,
    marginLeft: 4,
    marginVertical: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  statsGroup: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 260,
  },
  newOrderBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  newOrderBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
