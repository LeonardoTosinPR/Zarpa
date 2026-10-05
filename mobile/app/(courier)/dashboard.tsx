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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { RouteMapPreview } from '../../src/components/RouteMapPreview';
import { courierService } from '../../src/services/courierService';

export default function CourierDashboardScreen() {
  const router = useRouter();
  const { user, logout, role } = useAuth();

  const [isOnline, setIsOnline] = useState<boolean>(user?.courier?.is_online ?? true);
  const [deviceLocation, setDeviceLocation] = useState<{ latitude: number; longitude: number }>(() => ({
    latitude: Number(user?.courier?.current_lat ?? -25.3960),
    longitude: Number(user?.courier?.current_lng ?? -51.4843),
  }));
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [lastGpsSync, setLastGpsSync] = useState<string>('Sincronizado');

  // Lotes Econômicos Agendados (Sprint 4)
  const [deliveryGroups, setDeliveryGroups] = useState<any[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(true);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);

  const loadDeliveryGroups = useCallback(async () => {
    try {
      setIsLoadingGroups(true);
      const res = await courierService.getDeliveryGroups();
      setDeliveryGroups(res.groups || []);
    } catch (err) {
      console.warn('Erro ao carregar lotes do condutor:', err);
    } finally {
      setIsLoadingGroups(false);
    }
  }, []);

  const handleTriggerBatchNow = async () => {
    try {
      setIsProcessingBatch(true);
      const res = await courierService.processEconomicBatch({ dry_run: false });
      Alert.alert(
        'Distribuição Concluída!',
        `Processamento noturno executado com sucesso!\n\n• Pedidos Organizados: ${res.orders_processed}\n• Lotes Criados: ${res.groups_created}\n• Economia Gerada: R$ ${Number(res.total_savings_generated).toFixed(2)}`,
        [{ text: 'OK', onPress: () => loadDeliveryGroups() }]
      );
    } catch (err: any) {
      Alert.alert('Erro ao Processar Lote', err?.response?.data?.message || 'Falha ao executar distribuição.');
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Captura a localização GPS física real do aparelho do condutor
  const fetchDeviceLocation = useCallback(async () => {
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
          coords = {
            latitude: Number(user?.courier?.current_lat ?? -25.3954),
            longitude: Number(user?.courier?.current_lng ?? -51.4641),
          };
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
        // Fallback para coordenadas cadastradas ou centro de Guarapuava
        setDeviceLocation({
          latitude: Number(user?.courier?.current_lat ?? -25.3954),
          longitude: Number(user?.courier?.current_lng ?? -51.4641),
        });
        setLastGpsSync('Permissão GPS negada');
      }
    } catch (err) {
      setDeviceLocation({
        latitude: Number(user?.courier?.current_lat ?? -25.3954),
        longitude: Number(user?.courier?.current_lng ?? -51.4641),
      });
      setLastGpsSync('Padrão Guarapuava');
    } finally {
      setIsLocating(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDeviceLocation();
    loadDeliveryGroups();
  }, [fetchDeviceLocation, loadDeliveryGroups]);

  async function handleToggleOnline(val: boolean) {
    setIsOnline(val);
    try {
      await courierService.updateStatus(val);
    } catch (err) {
      console.warn('Erro ao atualizar status online do condutor:', err);
      setIsOnline(!val);
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

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

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

  return (
    <View style={styles.container}>
      {/* Official Zarpa Header */}
      <Header />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Driver Profile Card */}
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



        {/* Route / Earnings Preview */}
        <View style={[styles.routePreviewCard, SHADOWS.sm]}>
          <Text style={styles.routePreviewHeader}>Ganhos e Metas de Hoje</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Ganhos Estimados</Text>
              <Text style={styles.metricValuePrimary}>R$ 85,00</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Distância Percorrida</Text>
              <Text style={styles.metricValue}>12 km</Text>
            </View>
          </View>
        </View>

        {/* Action Shortcuts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lotes e Roteamento</Text>
        </View>

        <TouchableOpacity
          style={[styles.actionCard, SHADOWS.sm]}
          activeOpacity={0.8}
          onPress={() => router.push('/(courier)/economic-batches')}
          testID="courier-economic-batches-btn"
        >
          <View style={[styles.actionIconBox, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="cash-outline" size={22} color="#059669" />
          </View>
          <View style={styles.actionTextBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.actionTitle}>Lotes Econômicos Agendados</Text>
              {deliveryGroups.length > 0 && (
                <View style={styles.batchCountPill}>
                  <Text style={styles.batchCountPillText}>{deliveryGroups.length}</Text>
                </View>
              )}
            </View>
            <Text style={styles.actionSubtitle}>
              Itinerários otimizados com paradas sequenciadas do batch.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Admin Switcher & Batch Simulation Panel */}
        {role === 'admin' && (
          <View style={[styles.adminSwitcherCard, SHADOWS.sm]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }}>
              <Ionicons name="shield-checkmark" size={16} color="#7C3AED" />
              <Text style={styles.adminSwitcherTitle}>Painel do Administrador Master</Text>
            </View>
            <Text style={styles.adminSwitcherDesc}>
              Acesso exclusivo para simulação da distribuição noturna e auditoria.
            </Text>
            <Button
              title={isProcessingBatch ? "Executando Distribuição..." : "⚡ Simular Distribuição do Batch Agora"}
              variant="primary"
              onPress={handleTriggerBatchNow}
              disabled={isProcessingBatch}
              style={{ marginBottom: SPACING.sm }}
              testID="admin-trigger-batch-dashboard-btn"
            />
            {/* Button to switch view removed to avoid duplicating navigation options */}
          </View>
        )}

        {/* Logout Button */}
        <Button
          title="Encerrar Sessão"
          variant="outline"
          onPress={handleLogout}
          style={styles.logoutButton}
          testID="courier-logout-button"
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
  logoutButton: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xxl,
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
});
