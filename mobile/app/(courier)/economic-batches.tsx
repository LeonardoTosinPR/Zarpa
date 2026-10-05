import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { Header } from '../../src/components/Header';
import { courierService } from '../../src/services/courierService';

export default function EconomicBatchesScreen() {
  const router = useRouter();
  const { user, role } = useAuth();

  const [deliveryGroups, setDeliveryGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);

  const loadDeliveryGroups = useCallback(async () => {
    try {
      const res = await courierService.getDeliveryGroups();
      setDeliveryGroups(res.groups || []);
      // Se houver pelo menos um lote, expande o primeiro por padrão
      if (res.groups && res.groups.length > 0 && expandedGroupId === null) {
        setExpandedGroupId(res.groups[0].id);
      }
    } catch (err) {
      console.warn('Erro ao carregar lotes do condutor:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [expandedGroupId]);

  useEffect(() => {
    loadDeliveryGroups();
  }, [loadDeliveryGroups]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadDeliveryGroups();
  };

  // Disparo exclusivo do Administrador
  const handleAdminTriggerBatch = async () => {
    if (role !== 'admin') {
      Alert.alert('Acesso Restrito', 'Apenas administradores podem simular a distribuição do batch noturno.');
      return;
    }

    try {
      setIsProcessingBatch(true);
      const res = await courierService.processEconomicBatch({ dry_run: false });
      Alert.alert(
        'Distribuição Concluída!',
        `Processamento noturno executado com sucesso!\n\n• Pedidos Organizados: ${res.orders_processed}\n• Lotes Criados: ${res.groups_created}\n• Economia Gerada: R$ ${Number(res.total_savings_generated).toFixed(2)}`,
        [{ text: 'OK', onPress: () => loadDeliveryGroups() }]
      );
    } catch (err: any) {
      Alert.alert(
        'Erro na Distribuição',
        err?.response?.data?.message || 'Falha ao processar distribuição do batch.'
      );
    } finally {
      setIsProcessingBatch(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header />

      {/* Navigation Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          testID="economic-batches-back-btn"
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          <Text style={styles.backButtonText}>Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Lotes Econômicos</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Painel Exclusivo de Simulação para Administrador */}
        {role === 'admin' && (
          <View style={[styles.adminBanner, SHADOWS.sm]}>
            <View style={styles.adminBannerHeader}>
              <View style={styles.adminShieldBox}>
                <Ionicons name="shield-checkmark" size={18} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.adminBannerTitle}>Painel Admin: Simulação de Lote</Text>
                <Text style={styles.adminBannerDesc}>
                  Como administrador master, você pode disparar a rotina noturna de distribuição a qualquer momento para testes.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.adminTriggerBtn}
              onPress={handleAdminTriggerBatch}
              disabled={isProcessingBatch}
              activeOpacity={0.8}
              testID="admin-trigger-batch-btn"
            >
              {isProcessingBatch ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="flash" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.adminTriggerBtnText}>Executar Distribuição do Batch Agora</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Header Informativo */}
        <View style={styles.sectionHeader}>
          <Text style={styles.pageTitle}>Itinerários Agendados</Text>
          <Text style={styles.pageSubtitle}>
            Rotas inteligentes com múltiplas coletas e entregas sequenciadas pelo lote noturno.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Carregando seus lotes econômicos...</Text>
          </View>
        ) : deliveryGroups.length === 0 ? (
          <View style={[styles.emptyBox, SHADOWS.sm]} testID="economic-batches-empty">
            <Ionicons name="cash-outline" size={48} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Nenhum lote atribuído no momento</Text>
            <Text style={styles.emptyDesc}>
              Os pedidos econômicos pendentes são agrupados automaticamente pelo motor de batch todas as noites às 02:00.
            </Text>
          </View>
        ) : (
          <View style={styles.groupsList}>
            {deliveryGroups.map((group) => {
              const stopsCount = group.group_orders
                ? group.group_orders.length
                : group.orders
                ? group.orders.length * 2
                : 0;
              const isExpanded = expandedGroupId === group.id;

              return (
                <View
                  key={group.id}
                  style={[styles.groupCard, SHADOWS.sm]}
                  testID={`economic-group-card-${group.id}`}
                >
                  {/* Card Header */}
                  <TouchableOpacity
                    style={styles.groupCardHeader}
                    onPress={() => setExpandedGroupId(isExpanded ? null : group.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.groupCardHeaderLeft}>
                      <View style={styles.groupNumberBadge}>
                        <Ionicons name="cash" size={14} color="#059669" style={{ marginRight: 4 }} />
                        <Text style={styles.groupNumberText}>Lote #{group.id}</Text>
                      </View>
                      <View style={styles.groupDateRow}>
                        <Ionicons name="calendar-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.groupDateText}>{group.scheduled_date}</Text>
                      </View>
                    </View>

                    <View style={styles.groupCardHeaderRight}>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>
                          {group.status === 'assigned' ? 'Atribuído' : group.status === 'in_progress' ? 'Em Rota' : 'Agendado'}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={COLORS.textMuted}
                        style={{ marginLeft: 8 }}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Metrics Banner */}
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>PARADAS</Text>
                      <Text style={styles.metricValue}>{stopsCount} paradas</Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>DISTÂNCIA</Text>
                      <Text style={styles.metricValue}>{group.total_distance_km} km</Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>BÔNUS CONDUTOR</Text>
                      <Text style={styles.metricBonusValue}>
                        R$ {Number(group.courier_bonus || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Detalhes Expansíveis de Paradas Sequenciadas */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <View style={styles.bonusNotice}>
                        <Ionicons name="gift-outline" size={18} color="#059669" style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.bonusNoticeTitle}>
                            Bônus de Produtividade: R$ {Number(group.courier_bonus || 0).toFixed(2)}
                          </Text>
                          <Text style={styles.bonusNoticeDesc}>
                            50% da economia bruta de frete gerada pelo compartilhamento da rota!
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.stopsHeaderTitle}>Itinerário de Paradas Sequenciadas:</Text>

                      {group.group_orders && group.group_orders.length > 0 ? (
                        group.group_orders.map((go: any, idx: number) => {
                          const isPickup = go.stop_type === 'pickup';
                          const orderItem = go.order || (group.orders || []).find((o: any) => o.id === go.order_id);

                          return (
                            <View key={go.id || idx} style={styles.stopItem}>
                              <View style={[styles.stopSeqCircle, isPickup ? styles.pickupSeqCircle : styles.deliverySeqCircle]}>
                                <Text style={styles.stopSeqNumber}>{go.stop_sequence || idx + 1}</Text>
                              </View>
                              <View style={styles.stopInfoBox}>
                                <View style={styles.stopTopLine}>
                                  <View
                                    style={[
                                      styles.stopTypePill,
                                      isPickup ? styles.pickupPill : styles.deliveryPill,
                                    ]}
                                  >
                                    <Ionicons
                                      name={isPickup ? 'arrow-up-circle' : 'arrow-down-circle'}
                                      size={12}
                                      color={isPickup ? '#92400E' : '#1E40AF'}
                                      style={{ marginRight: 3 }}
                                    />
                                    <Text
                                      style={[
                                        styles.stopTypePillText,
                                        isPickup ? styles.pickupPillText : styles.deliveryPillText,
                                      ]}
                                    >
                                      {isPickup ? 'Coleta no Remetente' : 'Entrega no Destinatário'}
                                    </Text>
                                  </View>
                                  <Text style={styles.stopDistance}>{go.shared_distance_km} km</Text>
                                </View>
                                <Text style={styles.stopOrderTitle}>
                                  Pedido #{go.order_id}
                                  {orderItem?.package_description ? ` • ${orderItem.package_description}` : ''}
                                </Text>
                                {orderItem ? (
                                  <Text style={styles.stopAddress} numberOfLines={2}>
                                    📍 {isPickup ? orderItem.origin_address : orderItem.dest_address}
                                  </Text>
                                ) : (
                                  <Text style={styles.stopAddress}>
                                    📍 Parada calculada no lote
                                  </Text>
                                )}
                              </View>
                            </View>
                          );
                        })
                      ) : (
                        <Text style={styles.noStopsText}>
                          Paradas sincronizadas com a malha viária de Guarapuava.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl * 2,
  },
  adminBanner: {
    backgroundColor: '#FAF5FF',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  adminBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  adminShieldBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  adminBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6B21A8',
  },
  adminBannerDesc: {
    fontSize: 12,
    color: '#7E22CE',
    marginTop: 2,
    lineHeight: 16,
  },
  adminTriggerBtn: {
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  adminTriggerBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: SPACING.md,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  pageSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 3,
    lineHeight: 18,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.xxl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
  },
  groupsList: {
    gap: SPACING.md,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  groupCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: '#FFFFFF',
    flexWrap: 'wrap',
    gap: 6,
  },
  groupCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    flexShrink: 1,
  },
  groupNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexShrink: 0,
  },
  groupNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5',
  },
  groupDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  groupDateText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  groupCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  statusPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    minWidth: 50,
  },
  metricLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#CBD5E1',
  },
  metricBonusValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  expandedContent: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  bonusNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: SPACING.md,
  },
  bonusNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  bonusNoticeDesc: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  stopsHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stopSeqCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    marginTop: 2,
    flexShrink: 0,
  },
  pickupSeqCircle: {
    backgroundColor: '#D97706',
  },
  deliverySeqCircle: {
    backgroundColor: '#2563EB',
  },
  stopSeqNumber: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  stopInfoBox: {
    flex: 1,
  },
  stopTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  stopTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  pickupPill: {
    backgroundColor: '#FEF3C7',
  },
  deliveryPill: {
    backgroundColor: '#DBEAFE',
  },
  stopTypePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pickupPillText: {
    color: '#92400E',
  },
  deliveryPillText: {
    color: '#1E40AF',
  },
  stopDistance: {
    fontSize: 11,
    color: COLORS.textMuted,
    flexShrink: 0,
  },
  stopOrderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 3,
    flexShrink: 1,
  },
  stopAddress: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
    flexShrink: 1,
  },
  noStopsText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginVertical: 10,
  },
});

