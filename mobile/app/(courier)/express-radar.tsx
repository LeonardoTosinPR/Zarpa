import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { courierService, ExpressOrder, RadarResponse } from '../../src/services/courierService';
import { RouteMapPreview } from '../../src/components/RouteMapPreview';
import { useAuth } from '../../src/context/AuthContext';

interface OrderCardProps {
  order: ExpressOrder;
  onAccept: (orderId: number) => Promise<void>;
  onReject: (orderId: number) => Promise<void>;
  onExpire: (orderId: number) => void;
  isAccepting: boolean;
  isRejecting: boolean;
}

function RadarOrderCard({
  order,
  onAccept,
  onReject,
  onExpire,
  isAccepting,
  isRejecting,
}: OrderCardProps) {
  const [secondsLeft, setSecondsLeft] = useState(10);
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 10000,
      useNativeDriver: false,
    }).start();

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [order.id]);

  useEffect(() => {
    if (secondsLeft === 0) {
      onExpire(order.id);
    }
  }, [secondsLeft, order.id, onExpire]);

  const freightPrice = Number(order.individual_freight_price || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const pickupDistance = order.pickup_distance_km !== undefined
    ? `${order.pickup_distance_km} km`
    : `${order.distance_km} km`;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.orderCard, SHADOWS.lg]} testID={`radar-card-${order.id}`}>
      {/* Timer Bar */}
      <View style={styles.timerBarTrack}>
        <Animated.View
          style={[
            styles.timerBarFill,
            {
              width: progressWidth,
              backgroundColor: secondsLeft <= 3 ? COLORS.error : COLORS.accent,
            },
          ]}
        />
      </View>

      {/* Header Compacto: Tag e Contador */}
      <View style={styles.cardHeader}>
        <View style={styles.urgentBadge}>
          <Ionicons name="flash" size={11} color="#B45309" style={{ marginRight: 3 }} />
          <Text style={styles.urgentBadgeText}>EXPRESSO</Text>
        </View>
        <View style={styles.countdownBadge}>
          <Ionicons name="timer-outline" size={13} color={secondsLeft <= 3 ? COLORS.error : COLORS.textMuted} />
          <Text
            style={[
              styles.countdownText,
              secondsLeft <= 3 && { color: COLORS.error, fontWeight: '700' },
            ]}
            testID={`countdown-text-${order.id}`}
          >
            {secondsLeft}s restantes
          </Text>
        </View>
      </View>

      {/* Linha Principal: Preço e Distância da Coleta */}
      <View style={styles.mainInfoRow}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
          <Text style={styles.priceValue}>{freightPrice}</Text>
          <Text style={styles.priceSublabel}>ganho livre</Text>
        </View>
        <View style={styles.distanceBadge}>
          <Ionicons name="navigate-circle" size={14} color={COLORS.primary} style={{ marginRight: 3 }} />
          <Text style={styles.distanceBadgeText}>Coleta a {pickupDistance}</Text>
        </View>
      </View>

      {/* Descrição Compacta do Pacote */}
      <View style={styles.packageCompactRow}>
        <Ionicons name="cube-outline" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
        <Text style={styles.packageTitle} numberOfLines={1}>
          {order.package_description}
        </Text>
        <Text style={styles.packageSubtitle} numberOfLines={1}>
          • {order.package_weight_kg}kg • {order.distance_km}km
        </Text>
      </View>

      {/* Endereços em Linhas Compactas */}
      <View style={styles.addressSection}>
        <View style={styles.addressCompactRow}>
          <View style={[styles.dot, { backgroundColor: '#059669' }]} />
          <Text style={styles.addressText} numberOfLines={1}>
            <Text style={styles.addressLabel}>Coleta: </Text>
            {order.origin_address}
          </Text>
        </View>
        <View style={styles.addressCompactRow}>
          <View style={[styles.dot, { backgroundColor: '#DC2626' }]} />
          <Text style={styles.addressText} numberOfLines={1}>
            <Text style={styles.addressLabel}>Entrega: </Text>
            {order.dest_address}
          </Text>
        </View>
      </View>

      {/* Botões de Ação */}
      <View style={styles.cardActionsRow}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => onReject(order.id)}
          disabled={isRejecting || isAccepting}
          activeOpacity={0.7}
          testID={`reject-order-${order.id}`}
        >
          {isRejecting ? (
            <ActivityIndicator color={COLORS.textMuted} size="small" />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={15} color={COLORS.textMuted} />
              <Text style={styles.rejectButtonText}>Recusar</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptButton, isAccepting && styles.acceptButtonDisabled]}
          onPress={() => onAccept(order.id)}
          disabled={isAccepting || isRejecting || secondsLeft === 0}
          activeOpacity={0.8}
          testID={`accept-order-${order.id}`}
        >
          {isAccepting ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
              <Text style={styles.acceptButtonText}>Aceitar Corrida</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ExpressRadarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(user?.courier?.is_online ?? true);
  const [activatingOnline, setActivatingOnline] = useState(false);
  const [radarData, setRadarData] = useState<RadarResponse | null>(null);
  const [orders, setOrders] = useState<ExpressOrder[]>([]);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [deviceCoords, setDeviceCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Registro de cooldown temporário de 30 segundos para chamados que expiraram sem ação
  const cooldownsRef = useRef<{ [orderId: number]: number }>({});

  // Captura as coordenadas físicas reais do aparelho do condutor
  const getDeviceCoordinates = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let coords: { latitude: number; longitude: number } | null = null;
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        } catch (posErr) {
          try {
            const lastLoc = await Location.getLastKnownPositionAsync();
            if (lastLoc) {
              coords = { latitude: lastLoc.coords.latitude, longitude: lastLoc.coords.longitude };
            }
          } catch (_) {}
        }

        if (!coords) {
          coords = {
            latitude: Number(user?.courier?.current_lat ?? -25.3954),
            longitude: Number(user?.courier?.current_lng ?? -51.4641),
          };
        }

        setDeviceCoords(coords);
        return coords;
      }
    } catch (err) {
      // Fallback
    }

    const fallbackCoords = {
      latitude: Number(user?.courier?.current_lat ?? -25.3954),
      longitude: Number(user?.courier?.current_lng ?? -51.4641),
    };
    setDeviceCoords(fallbackCoords);
    return fallbackCoords;
  }, [user]);

  const fetchRadar = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);

      // Obtém coordenadas reais do GPS do aparelho
      const coords = await getDeviceCoordinates();
      const lat = coords?.latitude ?? (user?.courier?.current_lat ? Number(user.courier.current_lat) : undefined);
      const lng = coords?.longitude ?? (user?.courier?.current_lng ? Number(user.courier.current_lng) : undefined);

      const data = await courierService.getRadar(lat, lng);
      setRadarData(data);
      if (data?.courier) {
        setIsOnline(Boolean(data.courier.is_online));
      }

      // Filtra chamados em resfriamento (cooldown de 30s) que expiraram sem recusa explícita
      const now = Date.now();
      const availableOrders = (data.orders || []).filter((o: ExpressOrder) => {
        const cooldownUntil = cooldownsRef.current[o.id];
        return !cooldownUntil || cooldownUntil <= now;
      });

      setOrders(availableOrders);
    } catch (error: any) {
      console.warn('Erro ao carregar oportunidades do radar:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getDeviceCoordinates, user]);

  useEffect(() => {
    if (!isOnline) {
      setLoading(false);
      return;
    }

    fetchRadar();
    // Polling a cada 8 segundos para novos chamados
    const pollInterval = setInterval(() => {
      fetchRadar();
    }, 8000);

    return () => clearInterval(pollInterval);
  }, [fetchRadar, isOnline]);

  const handleActivateOnline = async () => {
    try {
      setActivatingOnline(true);
      await courierService.updateStatus(true);
      setIsOnline(true);
      await fetchRadar(true);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível ativar sua disponibilidade no radar.');
    } finally {
      setActivatingOnline(false);
    }
  };

  const handleExpireOrder = (orderId: number) => {
    // Ao expirar os 10s sem resposta do entregador, aplica 30 segundos de resfriamento local.
    // NÃO rejeita no banco de dados para que o chamado volte a aparecer caso ainda esteja pendente.
    cooldownsRef.current[orderId] = Date.now() + 30000;
    setOrders((prev) => prev.filter((o) => o.id !== orderId));

    // Reavaliação automática após os 30 segundos
    setTimeout(() => {
      delete cooldownsRef.current[orderId];
      fetchRadar();
    }, 30000);
  };

  const handleRejectOrder = async (orderId: number) => {
    try {
      setRejectingId(orderId);
      // Remove imediatamente da visualização local
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      await courierService.rejectExpressOrder(orderId, 'Recusado pelo entregador');
    } catch (error) {
      console.warn('Erro ao registrar recusa de pedido:', error);
    } finally {
      setRejectingId(null);
    }
  };

  const handleAcceptOrder = async (orderId: number) => {
    try {
      setAcceptingId(orderId);
      const response = await courierService.acceptExpressOrder(orderId);

      Alert.alert(
        'Corrida Aceita',
        'Você confirmou o chamado expresso com sucesso. Siga para o ponto de coleta.',
        [
          {
            text: 'Visualizar Rota',
            onPress: () => {
              router.push({
                pathname: '/(courier)/active-delivery',
                params: { orderId: String(orderId) },
              });
            },
          },
        ]
      );
    } catch (error: any) {
      if (error.response?.status === 409) {
        // Concorrência transacional com Lock Pessimista: outro entregador aceitou
        Alert.alert(
          'Chamado Indisponível',
          'Outro entregador parceiro aceitou esta corrida uma fração de segundo antes.',
          [
            {
              text: 'OK, Próxima',
              onPress: () => fetchRadar(true),
            },
          ]
        );
      } else {
        Alert.alert(
          'Erro ao Aceitar',
          error.response?.data?.message || 'Não foi possível aceitar a corrida no momento.'
        );
      }
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } finally {
      setAcceptingId(null);
    }
  };

  if (!isOnline) {
    return (
      <View style={styles.container}>
        {/* Top Navigation Bar */}
        <View style={styles.navbar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            testID="radar-back-button"
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.navTitleBox}>
            <Text style={styles.navTitle}>Radar de Chamados</Text>
            <Text style={styles.navSubtitle}>Guarapuava • Modalidade Expressa</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Offline Blocker Screen */}
        <View style={styles.offlineBlockerContainer} testID="radar-offline-blocker">
          <View style={styles.offlineIconBox}>
            <Ionicons name="radio-outline" size={44} color={COLORS.textMuted} />
          </View>

          <Text style={styles.offlineTitle}>Radar Desativado</Text>
          <Text style={styles.offlineSubtitle}>
            Você está offline no momento. O radar fica inacessível enquanto seu status de disponibilidade estiver desligado.
          </Text>
          <Text style={styles.offlineHint}>
            Ative sua disponibilidade para sintonizar e disputar chamados expressos em tempo real na região de Guarapuava.
          </Text>

          <TouchableOpacity
            style={styles.activateRadarBtn}
            onPress={handleActivateOnline}
            disabled={activatingOnline}
            activeOpacity={0.8}
            testID="activate-radar-online-btn"
          >
            {activatingOnline ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="power" size={18} color="#FFFFFF" />
                <Text style={styles.activateRadarBtnText}>Ficar Disponível no Radar</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.returnDashboardBtn}
            onPress={() => router.replace('/(courier)/dashboard')}
            activeOpacity={0.7}
          >
            <Ionicons name="home-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.returnDashboardBtnText}>Voltar ao Início</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const activeLat = deviceCoords?.latitude ?? Number(radarData?.courier?.current_lat ?? user?.courier?.current_lat ?? -25.3960);
  const activeLng = deviceCoords?.longitude ?? Number(radarData?.courier?.current_lng ?? user?.courier?.current_lng ?? -51.4843);
  const activeRadius = Number(radarData?.courier?.cluster_radius_km ?? user?.courier?.cluster_radius_km ?? 5.0);

  return (
    <View style={styles.container}>
      {/* 1. MAPA COBRINDO QUASE TODA A TELA (Modo Sem Bordas / Borderless) */}
      <View style={styles.fullScreenMapContainer} testID="radar-map-card">
        <RouteMapPreview
          origin={{
            latitude: activeLat,
            longitude: activeLng,
            title: 'Você (Entregador)',
            description: 'Posição rastreada do aparelho',
          }}
          destination={null}
          polyline={null}
          mode="current_location"
          radiusKm={activeRadius}
          borderless={true}
        />
      </View>

      {/* 2. BARRA SUPERIOR FLUTUANTE ELEGANTE */}
      <View style={[styles.floatingHeader, SHADOWS.md]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.floatingHeaderBtn}
          testID="radar-back-button"
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.floatingHeaderTitleBox}>
          <View style={styles.floatingHeaderStatusRow}>
            <View style={styles.statusPulseDot} />
            <Text style={styles.floatingHeaderTitle}>Radar de Chamados</Text>
          </View>
          <Text style={styles.floatingHeaderSubtitle}>
            Guarapuava • Raio: {activeRadius.toFixed(1)} km
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => fetchRadar(true)}
          style={styles.floatingHeaderBtn}
          testID="radar-manual-refresh"
        >
          <Ionicons name="refresh" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* 3. CARD POPUP FLUTUANTE NA PARTE INFERIOR SOBREPOSTO AO MAPA */}
      <View style={styles.bottomPopupContainer}>
        {loading && orders.length === 0 ? (
          <View style={[styles.statusPopupCard, SHADOWS.md]}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.statusPopupText}>Sintonizando chamados no radar...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={[styles.emptyPopupCard, SHADOWS.lg]} testID="radar-empty-state">
            <View style={styles.emptyIconCircleSmall}>
              <Ionicons name="radio-outline" size={28} color={COLORS.primary} />
            </View>
            <View style={styles.emptyContentBox}>
              <Text style={styles.emptyPopupTitle}>Nenhum chamado no momento</Text>
              <Text style={styles.emptyPopupDesc}>
                Aguardando novos pedidos expressos de lojistas no seu raio de atuação em Guarapuava. Mantenha o aplicativo aberto.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.emptyRefreshMiniBtn}
              onPress={() => fetchRadar(true)}
              testID="radar-empty-refresh-button"
            >
              <Ionicons name="reload" size={16} color={COLORS.primary} />
              <Text style={styles.emptyRefreshMiniBtnText}>Atualizar Radar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.ordersScrollBox}
            contentContainerStyle={styles.ordersScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.popupBadgeRow}>
              <View style={styles.popupBadgeIndicator}>
                <Ionicons name="flash" size={13} color="#FFFFFF" />
                <Text style={styles.popupBadgeIndicatorText}>
                  {orders.length} {orders.length === 1 ? 'CHAMADO DISPONÍVEL' : 'CHAMADOS DISPONÍVEIS'}
                </Text>
              </View>
            </View>

            {orders.map((order) => (
              <RadarOrderCard
                key={order.id}
                order={order}
                onAccept={handleAcceptOrder}
                onReject={handleRejectOrder}
                onExpire={handleExpireOrder}
                isAccepting={acceptingId === order.id}
                isRejecting={rejectingId === order.id}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  fullScreenMapContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  floatingHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 24,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
  },
  floatingHeaderBtn: {
    padding: 8,
    borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9',
  },
  floatingHeaderTitleBox: {
    alignItems: 'center',
  },
  floatingHeaderStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  floatingHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  floatingHeaderSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
    fontWeight: '500',
  },
  bottomPopupContainer: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 40,
    maxHeight: '68%',
  },
  statusPopupCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusPopupText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptyPopupCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIconCircleSmall: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  emptyContentBox: {
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  emptyPopupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyPopupDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyRefreshMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  emptyRefreshMiniBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  ordersScrollBox: {
    width: '100%',
  },
  ordersScrollContent: {
    paddingBottom: SPACING.xs,
  },
  popupBadgeRow: {
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  popupBadgeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  popupBadgeIndicatorText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + 10,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  navTitleBox: {
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  navSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  refreshButton: {
    padding: SPACING.xs,
  },
  statusPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  emptyStateDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  emptyRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  emptyRefreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  orderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  timerBarTrack: {
    height: 3,
    backgroundColor: '#E2E8F0',
    width: '100%',
    marginBottom: 6,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  urgentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  mainInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  priceValue: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.primary,
  },
  priceSublabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  packageCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 5,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  packageTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  packageSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  addressSection: {
    marginBottom: 8,
    gap: 4,
  },
  addressCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  addressText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  rejectButtonText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.accent,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  offlineBlockerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  offlineIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  offlineSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  offlineHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: SPACING.md,
  },
  activateRadarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    width: '100%',
    marginTop: SPACING.sm,
    ...SHADOWS.sm,
  },
  activateRadarBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  returnDashboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  returnDashboardBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
