import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { courierService, ActiveDeliveryGroup } from '../../src/services/courierService';
import { financialService, CourierFinancialSummary } from '../../src/services/financialService';
import { openMultiStopNavigation } from '../../src/utils/navigationLauncher';

export default function CourierDashboardScreen() {
  const router = useRouter();
  const { user, role, updateCourierOnlineStatus } = useAuth();

  const [isOnline, setIsOnline] = useState<boolean>(user?.courier?.is_online ?? true);
  const [deviceLocation, setDeviceLocation] = useState<{ latitude: number; longitude: number }>(() => ({
    latitude: Number(user?.courier?.current_lat ?? -25.3960),
    longitude: Number(user?.courier?.current_lng ?? -51.4843),
  }));
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [lastGpsSync, setLastGpsSync] = useState<string>('Sincronizado');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Dados Operacionais em Tempo Real (Lotes, Jornada Ativa, Radar e Extrato 50/50)
  const [deliveryGroups, setDeliveryGroups] = useState<any[]>([]);
  const [activeGroup, setActiveGroup] = useState<ActiveDeliveryGroup | null>(null);
  const [radarOrdersCount, setRadarOrdersCount] = useState<number>(0);
  const [financialSummary, setFinancialSummary] = useState<CourierFinancialSummary | null>(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(true);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);

  // Sincroniza o toggle automaticamente quando ativado/desativado pela tela de Radar
  useEffect(() => {
    if (user?.courier?.is_online !== undefined) {
      setIsOnline(Boolean(user.courier.is_online));
    }
  }, [user?.courier?.is_online]);

  const loadDeliveryGroups = useCallback(async () => {
    try {
      setIsLoadingGroups(true);
      const res = await courierService.getDeliveryGroups();
      setDeliveryGroups(res?.groups || []);
    } catch (err) {
      // Silencioso em caso de mock parcial nos testes
    } finally {
      setIsLoadingGroups(false);
    }
  }, []);

  const loadOperationalOverview = useCallback(async (lat?: number, lng?: number) => {
    // 1. Jornada / Lote Ativo (Sprint 6)
    try {
      if (typeof courierService.getActiveGroup === 'function') {
        const activeRes = await courierService.getActiveGroup();
        if (activeRes && 'active_group' in activeRes) {
          setActiveGroup(activeRes.active_group);
        }
      }
    } catch (_) {}

    // 2. Resumo Financeiro Real com Rateio 50/50 e Taxa de Parada R$ 3,00 (Sprint 5)
    try {
      if (typeof financialService.getCourierStatement === 'function') {
        const finRes = await financialService.getCourierStatement();
        if (finRes?.summary) {
          setFinancialSummary(finRes.summary);
        }
      }
    } catch (_) {}

    // 3. Contagem de Oportunidades no Radar Expresso (Sprint 3)
    try {
      if (typeof courierService.getRadar === 'function') {
        const radarRes = await courierService.getRadar(lat, lng);
        if (radarRes) {
          setRadarOrdersCount(Number(radarRes.orders_count ?? radarRes.orders?.length ?? 0));
          if (radarRes.courier?.is_online !== undefined) {
            const serverOnline = Boolean(radarRes.courier.is_online);
            setIsOnline(serverOnline);
            if (updateCourierOnlineStatus && user?.courier?.is_online !== serverOnline) {
              updateCourierOnlineStatus(serverOnline).catch(() => {});
            }
          }
        }
      }
    } catch (_) {}
  }, [updateCourierOnlineStatus, user?.courier?.is_online]);

  const handleTriggerBatchNow = async () => {
    try {
      setIsProcessingBatch(true);
      const res = await courierService.processEconomicBatch({ dry_run: false });
      Alert.alert(
        'Distribuição Concluída!',
        `Processamento noturno executado com sucesso!\n\n• Pedidos Organizados: ${res.orders_processed}\n• Lotes Criados: ${res.groups_created}\n• Economia Gerada: R$ ${Number(res.total_savings_generated).toFixed(2)}`,
        [
          {
            text: 'OK',
            onPress: () => {
              loadDeliveryGroups();
              loadOperationalOverview(deviceLocation.latitude, deviceLocation.longitude);
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Erro ao Processar Lote', err?.response?.data?.message || 'Falha ao executar distribuição.');
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Captura a localização GPS física real do aparelho do condutor
  const fetchDeviceLocation = useCallback(async () => {
    let resolvedCoords = {
      latitude: Number(user?.courier?.current_lat ?? -25.3954),
      longitude: Number(user?.courier?.current_lng ?? -51.4641),
    };

    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        let coords: { latitude: number; longitude: number } | null = null;

        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
        } catch (posErr) {
          try {
            const lastLoc = await Location.getLastKnownPositionAsync();
            if (lastLoc) {
              coords = {
                latitude: lastLoc.coords.latitude,
                longitude: lastLoc.coords.longitude,
              };
            }
          } catch (_) {}
        }

        if (!coords) {
          coords = resolvedCoords;
        } else {
          resolvedCoords = coords;
        }

        setDeviceLocation(coords);

        // Notifica o backend com as coordenadas físicas reais do aparelho
        try {
          await courierService.updateLocation(coords.latitude, coords.longitude);
          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
          setLastGpsSync(`Atualizado às ${timeStr}`);
        } catch (netErr: any) {
          setLastGpsSync('Local (Servidor em espera)');
        }
      } else {
        setDeviceLocation(resolvedCoords);
        setLastGpsSync('Permissão GPS negada');
      }
    } catch (err) {
      setDeviceLocation(resolvedCoords);
      setLastGpsSync('Padrão Guarapuava');
    } finally {
      setIsLocating(false);
    }

    return resolvedCoords;
  }, [user]);

  const refreshDashboard = useCallback(async () => {
    const coords = await fetchDeviceLocation();
    await Promise.all([
      loadDeliveryGroups(),
      loadOperationalOverview(coords.latitude, coords.longitude),
    ]);
  }, [fetchDeviceLocation, loadDeliveryGroups, loadOperationalOverview]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const onPullRefresh = async () => {
    setIsRefreshing(true);
    await refreshDashboard();
    setIsRefreshing(false);
  };

  async function handleToggleOnline(val: boolean) {
    setIsOnline(val);
    if (updateCourierOnlineStatus) {
      await updateCourierOnlineStatus(val);
    }
    try {
      await courierService.updateStatus(val);
    } catch (err) {
      console.warn('Erro ao atualizar status online do condutor:', err);
      setIsOnline(!val);
      if (updateCourierOnlineStatus) {
        await updateCourierOnlineStatus(!val);
      }
    }
  }

  const courierName = user?.name || 'Condutor Parceiro';
  const vehicle =
    user?.courier?.vehicle_type === 'motorcycle'
      ? 'Motocicleta'
      : user?.courier?.vehicle_type === 'bicycle'
      ? 'Bicicleta'
      : 'Carro';
  const plate = user?.courier?.vehicle_plate || 'Sem placa';
  const cnh = user?.courier?.cnh || 'Não informada';
  const radius = user?.courier?.cluster_radius_km || '5.0';

  function handleNavigateRadar() {
    if (!isOnline) {
      Alert.alert(
        'Radar Indisponível',
        'Você está offline no momento. Ative sua disponibilidade para acessar o radar e disputar chamados expressos.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ativar e Acessar',
            onPress: async () => {
              await handleToggleOnline(true);
              router.push('/(courier)/express-radar');
            },
          },
        ]
      );
      return;
    }
    router.push('/(courier)/express-radar');
  }

  function handleNavigateActiveGroupGps() {
    if (!activeGroup || !activeGroup.stops || activeGroup.stops.length === 0) return;
    const pendingStops = activeGroup.stops.filter((s) => s.status !== 'completed');
    const stopsToRoute = pendingStops.length > 0 ? pendingStops : activeGroup.stops;

    openMultiStopNavigation({
      stops: stopsToRoute.map((s, idx) => ({
        lat: Number(s.lat),
        lng: Number(s.lng),
        label: `Parada #${s.stop_sequence || idx + 1}: ${s.address}`,
        sequence: s.stop_sequence || idx + 1,
      })),
      groupTitle: `Lote #${activeGroup.id} (${stopsToRoute.length} paradas)`,
      app: 'ask',
    });
  }

  // Cálculo dos indicadores financeiros (dados reais da API ou estimativa dos lotes carregados)
  const fallbackEarnings = deliveryGroups.reduce((acc, g) => {
    const ordersCount = g.orders ? g.orders.length : g.group_orders ? g.group_orders.length / 2 : 0;
    const routeFare = Number(g.total_distance_km || 0) * 2.5;
    const stopFees = ordersCount * 3.0;
    const bonus = Number(g.courier_bonus || 0);
    return acc + routeFare + stopFees + bonus;
  }, 0);
  const fallbackDistance = deliveryGroups.reduce((acc, g) => acc + Number(g.total_distance_km || 0), 0);
  const fallbackBonus = deliveryGroups.reduce((acc, g) => acc + Number(g.courier_bonus || 0), 0);
  const fallbackStopFees = deliveryGroups.reduce((acc, g) => {
    const ordersCount = g.orders ? g.orders.length : g.group_orders ? g.group_orders.length / 2 : 0;
    return acc + ordersCount * 3.0;
  }, 0);

  const displayTotalEarnings = financialSummary?.total_earnings ?? (activeGroup?.total_earnings ?? fallbackEarnings);
  const displayTotalDistance = financialSummary?.total_distance_km ?? (activeGroup?.total_distance_km ?? fallbackDistance);
  const displayBatchBonus = financialSummary?.total_batch_bonus ?? (activeGroup?.courier_bonus ?? fallbackBonus);
  const displayStopFees = financialSummary?.total_stop_fees ?? (activeGroup?.stop_fees ?? fallbackStopFees);
  const displayDeliveriesCount = financialSummary?.total_deliveries_count ?? deliveryGroups.length;
  const displayEarningsPerKm =
    financialSummary?.earnings_per_km ??
    (displayTotalDistance > 0 ? displayTotalEarnings / displayTotalDistance : 0);

  return (
    <View style={styles.container}>
      {/* Official Zarpa Header */}
      <Header onProfilePress={() => router.push('/(courier)/profile')} />

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
        {/* 1. Driver Profile & Online/Offline Switch Card */}
        <View style={[styles.profileCard, SHADOWS.md]}>
          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Ionicons name="bicycle" size={13} color={COLORS.accentDark} style={{ marginRight: 4 }} />
              <Text style={styles.roleBadgeText}>Entregador Parceiro</Text>
            </View>
            {user?.role === 'admin' && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#7C3AED" style={{ marginRight: 4 }} />
                <Text style={styles.adminBadgeText}>Admin Master</Text>
              </View>
            )}
          </View>

          <Text style={styles.courierName}>{courierName}</Text>
          <Text style={styles.vehicleInfo}>
            Veículo: {vehicle} {plate !== 'Sem placa' ? `• Placa: ${plate}` : ''}
          </Text>
          <Text style={styles.cnhInfo}>CNH: {cnh} • Raio de Atuação: {radius} km</Text>

          {/* Online/Offline Status Switch */}
          <View style={styles.statusToggleRow}>
            <View style={styles.statusIndicatorBox}>
              <View
                style={[
                  styles.statusDot,
                  isOnline ? styles.statusDotOnline : styles.statusDotOffline,
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  isOnline ? styles.statusTextOnline : styles.statusTextOffline,
                ]}
              >
                {isOnline ? 'Disponível no Radar' : 'Offline / Indisponível'}
              </Text>
            </View>

            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: COLORS.border, true: '#A7F3D0' }}
              thumbColor={isOnline ? COLORS.accent : '#9CA3AF'}
              testID="courier-online-switch"
            />
          </View>
        </View>

        {/* 2. Resumo Simplificado de Ganhos e Desempenho */}
        <View style={[styles.routePreviewCard, SHADOWS.sm]}>
          <Text style={styles.routePreviewHeader}>Resumo de Ganhos</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Ganho Acumulado</Text>
              <Text style={styles.metricValuePrimary}>
                R$ {Number(displayTotalEarnings).toFixed(2)}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Bônus Rateio 50%</Text>
              <Text style={[styles.metricValue, { color: '#059669' }]}>
                + R$ {Number(displayBatchBonus).toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.summarySecondRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Entregas Realizadas</Text>
              <Text style={styles.metricValue}>{displayDeliveriesCount}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Distância Total</Text>
              <Text style={styles.metricValue}>
                {Number(displayTotalDistance).toFixed(1)} km
              </Text>
            </View>
          </View>
        </View>

        {/* 3. Status Operacional Atual (Apenas Informativo) */}
        <View style={[styles.routePreviewCard, SHADOWS.sm]}>
          <Text style={styles.routePreviewHeader}>Status Operacional</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Lotes Agendados</Text>
              <Text style={styles.metricValue}>{deliveryGroups.length}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Chamados no Raio</Text>
              <Text style={styles.metricValuePrimary}>{radarOrdersCount}</Text>
            </View>
          </View>
        </View>

        {/* 4. Admin Switcher & Batch Simulation Panel */}
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
              onPress={() => router.push('/(courier)/admin')}
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
              title="Alternar para Visão do Lojista"
              variant="secondary"
              onPress={() => router.push('/(client)/dashboard')}
              style={styles.adminSwitchBtn}
              textStyle={{ color: '#FFFFFF', fontWeight: '700' }}
              testID="admin-switch-to-client"
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
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: SPACING.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignSelf: 'flex-start',
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  courierName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
    flexShrink: 1,
  },
  vehicleInfo: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
    flexShrink: 1,
  },
  cnhInfo: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
    flexShrink: 1,
  },
  statusToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexWrap: 'wrap',
    gap: 8,
  },
  statusIndicatorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
    flexShrink: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotOnline: {
    backgroundColor: COLORS.accent,
  },
  statusDotOffline: {
    backgroundColor: '#9CA3AF',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusTextOnline: {
    color: COLORS.accentDark,
  },
  statusTextOffline: {
    color: COLORS.textMuted,
  },
  mapSectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  mapHeaderTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  recalibrateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
  },
  recalibrateBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  telemetryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  telemetryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  telemetryStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  telemetryStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  telemetryStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  telemetrySyncText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  telemetryCoordsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.sm,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  telemetryCoordItem: {
    alignItems: 'center',
    flex: 1,
  },
  telemetryCoordLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  telemetryCoordValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 1,
  },
  telemetryDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
  },
  mapContainer: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  mapLoadingBox: {
    height: 190,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLoadingText: {
    marginTop: SPACING.sm,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  mapFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
  },
  mapFooterText: {
    fontSize: 11,
    color: COLORS.textMuted,
    flex: 1,
    lineHeight: 15,
  },
  routePreviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  routePreviewHeader: {
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
  summarySecondRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
  sectionHeader: {
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  actionTextBox: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  adminSwitcherCard: {
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#334155',
  },
  adminSwitcherTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A78BFA',
    marginBottom: 4,
  },
  adminSwitcherDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: SPACING.md,
  },
  adminSwitchBtn: {
    height: 44,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  batchQuickBtn: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
  },
  batchQuickBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  groupLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  groupLoadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyGroupBox: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyGroupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyGroupSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.md,
    lineHeight: 16,
  },
  simulateBatchBtn: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  simulateBatchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  groupsContainer: {
    marginBottom: SPACING.md,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  groupCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  batchCountPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  batchCountPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  groupDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupDateText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  groupMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  groupMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  groupMetricLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  groupMetricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  groupMetricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  groupBonusValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  viewStopsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  viewStopsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: SPACING.sm,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
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
  modalBody: {
    marginBottom: SPACING.md,
  },
  modalBonusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: SPACING.md,
  },
  modalBonusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  modalBonusDesc: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  stopsSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stopSeqBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  stopSeqText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  stopTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stopTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pickupTag: {
    backgroundColor: '#FEF3C7',
  },
  deliveryTag: {
    backgroundColor: '#DBEAFE',
  },
  stopTypeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pickupText: {
    color: '#92400E',
  },
  deliveryText: {
    color: '#1E40AF',
  },
  stopDistText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  stopOrderDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: 2,
  },
  modalDoneBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  modalDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  agendaQuickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 16,
  },
  activeMissionCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: SPACING.md,
  },
  agendaQuickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agendaQuickLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  agendaQuickIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaQuickTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803D',
  },
  agendaQuickSubtitle: {
    fontSize: 11,
    color: '#166534',
    marginTop: 1,
  },
  activeGroupBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
  },
  activeProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeProgressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  activeProgressEarnings: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  activeProgressBarTrack: {
    height: 6,
    backgroundColor: '#DCFCE7',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  activeProgressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  nextStopHighlight: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 10,
  },
  nextStopBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nextStopTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pickupPillBg: {
    backgroundColor: '#FEF3C7',
  },
  deliveryPillBg: {
    backgroundColor: '#DBEAFE',
  },
  nextStopTypeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  nextStopSeqText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  nextStopAddress: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  activeMissionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  missionPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
  },
  missionPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  missionGpsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  missionGpsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  radarLiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 4,
  },
  radarLiveBannerOffline: {
    backgroundColor: '#F8FAFC',
    borderColor: COLORS.border,
  },
  radarLiveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  radarPulseCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarLiveTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  radarLiveSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  financialHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  financialSubheader: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  financialLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  financialLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  apportionmentPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  apportionmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  apportionmentPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  apportionmentPillNeutral: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  apportionmentPillNeutralText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
