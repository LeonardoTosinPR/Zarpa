import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Header } from '../../src/components/Header';
import { orderService, OrderItem, OrderTrackingResponse } from '../../src/services/orderService';
import { courierService } from '../../src/services/courierService';

export default function ClientOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [trackingModalVisible, setTrackingModalVisible] = useState<boolean>(false);
  const [trackingData, setTrackingData] = useState<OrderTrackingResponse | null>(null);
  const [trackingLoading, setTrackingLoading] = useState<boolean>(false);

  const handleOpenTracking = async (orderId: number) => {
    try {
      setTrackingLoading(true);
      setTrackingModalVisible(true);
      const data = await orderService.getTracking(orderId);
      setTrackingData(data);
    } catch (err: any) {
      Alert.alert('Rastreamento', 'Não foi possível carregar os detalhes de rastreamento deste pedido.');
      setTrackingModalVisible(false);
    } finally {
      setTrackingLoading(false);
    }
  };

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
        return { label: 'Pendente', bg: '#FEF3C7', color: '#92400E' };
      case 'assigned':
        return { label: 'Atribuído', bg: '#DBEAFE', color: '#1E40AF' };
      case 'picked_up':
        return { label: 'Em Rota', bg: '#EDE9FE', color: '#5B21B6' };
      case 'delivered':
        return { label: 'Entregue', bg: '#D1FAE5', color: '#065F46' };
      case 'canceled':
        return { label: 'Cancelado', bg: '#FEE2E2', color: '#991B1B' };
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
                {isEconomic ? 'Econômica' : 'Expressa'}
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

        {/* Badge do Lote Econômico (Sprint 4) */}
        {isEconomic && (
          <View style={styles.batchNoticeContainer}>
            {item.status === 'pending' ? (
              <View style={styles.batchPendingBadge}>
                <Ionicons name="moon" size={13} color="#D97706" style={{ marginRight: 4 }} />
                <Text style={styles.batchPendingText}>
                  Aguardando processamento do lote noturno (02:00)
                </Text>
              </View>
            ) : (
              <View style={styles.batchScheduledBadge}>
                <Ionicons name="cash" size={13} color="#059669" style={{ marginRight: 4 }} />
                <Text style={styles.batchScheduledText}>
                  Lote Gerado: Entrega Agendada
                </Text>
              </View>
            )}
          </View>
        )}

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
            <Text style={styles.statDetail}>{item.distance_km} km</Text>
            <Text style={styles.statSeparator}>·</Text>
            <Text style={styles.statDetail}>{item.package_weight_kg} kg</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Valor do Frete</Text>
            {item.final_freight_price && Number(item.final_freight_price) < Number(item.individual_freight_price) ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.priceOriginalCrossed}>
                  R$ {Number(item.individual_freight_price).toFixed(2)}
                </Text>
                <Text style={styles.priceValueDiscounted}>
                  R$ {Number(item.final_freight_price).toFixed(2)}
                </Text>
              </View>
            ) : (
              <Text style={styles.priceValue}>
                R$ {Number(item.individual_freight_price).toFixed(2)}
              </Text>
            )}
          </View>
        </View>

        {/* Botão de Rastreamento (Timeline) */}
        <TouchableOpacity
          style={styles.trackOrderBtn}
          onPress={() => handleOpenTracking(item.id)}
          activeOpacity={0.8}
          testID={`track-order-btn-${item.id}`}
        >
          <Ionicons name="analytics-outline" size={15} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.trackOrderBtnText}>Rastrear Pedido (Linha do Tempo)</Text>
        </TouchableOpacity>
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
          <Ionicons name="receipt-outline" size={44} color={COLORS.textMuted} style={{ marginBottom: SPACING.sm }} />
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

      {/* Modal de Rastreamento (Timeline) */}
      <Modal
        visible={trackingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTrackingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, SHADOWS.lg]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  Rastreamento {trackingData ? `#${trackingData.order_id}` : ''}
                </Text>
                {trackingData && (
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {trackingData.package_description}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setTrackingModalVisible(false)}
                style={styles.modalCloseBtn}
                testID="close-tracking-modal-btn"
              >
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {trackingLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 8, fontSize: 13, color: COLORS.textMuted }}>
                  Carregando linha do tempo...
                </Text>
              </View>
            ) : trackingData ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {/* Dados do Condutor */}
                {trackingData.courier && (
                  <View style={styles.courierCard}>
                    <Ionicons name="bicycle" size={20} color="#1E40AF" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.courierName}>{trackingData.courier.name}</Text>
                      <Text style={styles.courierVehicle}>
                        {trackingData.courier.vehicle_type === 'motorcycle' ? 'Motocicleta' : 'Veículo'} • Placa: {trackingData.courier.vehicle_plate || 'N/A'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Timeline de Eventos */}
                <View style={styles.timelineWrap}>
                  {trackingData.timeline.map((step, idx) => {
                    const isLast = idx === trackingData.timeline.length - 1;
                    return (
                      <View key={step.step || idx} style={styles.timelineRow}>
                        <View style={styles.timelineAxis}>
                          <View
                            style={[
                              styles.timelineDot,
                              step.completed ? styles.timelineDotCompleted : styles.timelineDotPending,
                            ]}
                          >
                            {step.completed && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
                          </View>
                          {!isLast && (
                            <View
                              style={[
                                styles.timelineLine,
                                step.completed ? styles.timelineLineCompleted : styles.timelineLinePending,
                              ]}
                            />
                          )}
                        </View>
                        <View style={styles.timelineContent}>
                          <Text
                            style={[
                              styles.timelineStepTitle,
                              step.completed && styles.timelineStepTitleCompleted,
                            ]}
                          >
                            {step.title}
                          </Text>
                          <Text style={styles.timelineStepDesc}>{step.description}</Text>
                          {step.timestamp && (
                            <Text style={styles.timelineStepTime}>
                              {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Comprovante de Entrega se disponível */}
                {trackingData.proof_photo_url && (
                  <View style={styles.proofBox}>
                    <Ionicons name="image-outline" size={18} color="#059669" style={{ marginRight: 6 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.proofBoxTitle}>Comprovante de Entrega Registrado</Text>
                      <Text style={styles.proofBoxUrl} numberOfLines={1}>
                        {trackingData.proof_photo_url}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
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
    flexWrap: 'wrap',
    gap: 6,
  },
  idAndModality: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexShrink: 0,
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
    flexShrink: 0,
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
    flexShrink: 1,
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
    flexShrink: 1,
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
    flexWrap: 'wrap',
    gap: 8,
  },
  statsGroup: {
    flexDirection: 'row',
    gap: SPACING.md,
    flex: 1,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  statDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statSeparator: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  priceContainer: {
    alignItems: 'flex-end',
    flexShrink: 0,
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
  batchBanner: {
    backgroundColor: '#EEF2FF',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  batchBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  batchBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3730A3',
  },
  batchBannerSubtitle: {
    fontSize: 11,
    color: '#4F46E5',
    marginTop: 2,
  },
  batchTriggerBtn: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    alignSelf: 'flex-start',
  },
  batchTriggerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  batchNoticeContainer: {
    marginBottom: SPACING.sm,
  },
  batchPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  batchPendingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  batchScheduledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  batchScheduledText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  priceOriginalCrossed: {
    fontSize: 11,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  priceValueDiscounted: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669', // Verde de economia
  },
  trackOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    marginTop: 10,
  },
  trackOrderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  courierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: RADIUS.md,
    padding: 10,
    marginBottom: 16,
  },
  courierName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },
  courierVehicle: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 1,
  },
  timelineWrap: {
    paddingLeft: 4,
    marginBottom: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 56,
  },
  timelineAxis: {
    alignItems: 'center',
    width: 24,
    marginRight: 10,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: '#059669',
  },
  timelineDotPending: {
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  timelineLineCompleted: {
    backgroundColor: '#059669',
  },
  timelineLinePending: {
    backgroundColor: '#E2E8F0',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 14,
  },
  timelineStepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  timelineStepTitleCompleted: {
    color: COLORS.text,
  },
  timelineStepDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  timelineStepTime: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  proofBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: RADIUS.sm,
    padding: 10,
    marginTop: 8,
  },
  proofBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  proofBoxUrl: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
});
