import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { courierService, ExpressOrder } from '../../src/services/courierService';
import { RouteMapPreview } from '../../src/components/RouteMapPreview';
import { Button } from '../../src/components/Button';

export default function ActiveDeliveryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId: string }>();
  const orderId = params.orderId ? Number(params.orderId) : null;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<ExpressOrder | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cancelingOrder, setCancelingOrder] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const response = await courierService.getOrderDetails(orderId);
        setOrder(response.order);
      } catch (error: any) {
        console.warn('Erro ao carregar detalhes da entrega ativa:', error);
        Alert.alert(
          'Erro',
          'Não foi possível recuperar os detalhes do pedido.',
          [{ text: 'Voltar', onPress: () => router.replace('/(courier)/dashboard') }]
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderId]);

  // Intercepta a saída da tela: o entregador não pode sair se a corrida estiver em andamento
  const handleAttemptExit = () => {
    if (order && (order.status === 'assigned' || order.status === 'picked_up')) {
      Alert.alert(
        'Corrida em Andamento',
        'Você possui uma entrega ativa e não pode sair da tela sem antes cancelar a corrida. Deseja cancelar a entrega?',
        [
          { text: 'Continuar na Corrida', style: 'cancel' },
          {
            text: 'Cancelar Corrida',
            style: 'destructive',
            onPress: handleCancelDelivery,
          },
        ]
      );
    } else {
      router.replace('/(courier)/dashboard');
    }
  };

  // Confirmação de coleta no lojista
  const handleConfirmPickup = async () => {
    if (!order) return;

    try {
      setUpdatingStatus(true);
      const response = await courierService.confirmPickup(order.id);
      setOrder(response.order);
      Alert.alert(
        'Coleta Realizada!',
        'Mercadoria em mãos. Siga a rota traçada no mapa até o endereço de entrega do cliente.'
      );
    } catch (error: any) {
      Alert.alert(
        'Erro na Coleta',
        error.response?.data?.message || 'Não foi possível confirmar a coleta do pedido.'
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Confirmação de entrega final ao cliente
  const handleConfirmDelivery = async () => {
    if (!order) return;

    try {
      setUpdatingStatus(true);
      const response = await courierService.confirmDelivery(order.id);
      setOrder(response.order);
      Alert.alert(
        'Entrega Finalizada!',
        'Parabéns! Você concluiu a entrega com sucesso. O valor do frete foi creditado à sua conta.',
        [
          {
            text: 'Voltar ao Início',
            onPress: () => router.replace('/(courier)/dashboard'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Erro na Finalização',
        error.response?.data?.message || 'Não foi possível concluir a entrega.'
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Cancelamento da corrida em andamento
  const handleCancelDelivery = async () => {
    if (!order) return;

    try {
      setCancelingOrder(true);
      await courierService.cancelActiveDelivery(
        order.id,
        'Cancelado pelo entregador durante o trajeto'
      );

      Alert.alert(
        'Corrida Cancelada',
        'A corrida foi cancelada e o pedido voltou à fila de chamados disponíveis.',
        [{ text: 'OK', onPress: () => router.replace('/(courier)/dashboard') }]
      );
    } catch (error: any) {
      Alert.alert(
        'Erro ao Cancelar',
        error.response?.data?.message || 'Não foi possível cancelar a corrida no momento.'
      );
    } finally {
      setCancelingOrder(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando traçado da rota no Zarpa...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.notFoundContainer}>
        <Ionicons name="alert-circle-outline" size={54} color={COLORS.error} />
        <Text style={styles.notFoundTitle}>Entrega não encontrada</Text>
        <Button
          title="Voltar ao Início"
          onPress={() => router.replace('/(courier)/dashboard')}
          style={styles.backHomeBtn}
        />
      </View>
    );
  }

  const freightPrice = Number(order.individual_freight_price || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const isAssigned = order.status === 'assigned';
  const isPickedUp = order.status === 'picked_up';
  const isDelivered = order.status === 'delivered';

  return (
    <View style={styles.container}>
      {/* Header com interceptação de saída */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleAttemptExit}
          style={styles.backBtn}
          testID="active-delivery-back-btn"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>
            {isDelivered ? 'Entrega Concluída' : 'Corrida em Andamento'}
          </Text>
          <Text style={styles.headerSubtitle}>
            Pedido #{order.id} • Guarapuava - PR
          </Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Mapa Interno do Zarpa com Rota OSRM Traçada */}
        <View style={[styles.mapWrapper, SHADOWS.sm]}>
          <RouteMapPreview
            origin={{
              latitude: Number(order.origin_lat),
              longitude: Number(order.origin_lng),
              title: 'Coleta (Lojista)',
              description: order.origin_address,
            }}
            destination={{
              latitude: Number(order.dest_lat),
              longitude: Number(order.dest_lng),
              title: 'Entrega (Cliente)',
              description: order.dest_address,
            }}
            polyline={order.route_geometry}
            height={260}
          />
        </View>

        {/* Card de Status da Corrida */}
        <View style={[styles.statusCard, SHADOWS.sm]}>
          <View style={styles.statusBadgeRow}>
            <View
              style={[
                styles.activeStatusBadge,
                isPickedUp && { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
                isDelivered && { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  isPickedUp && { backgroundColor: COLORS.primary },
                  isDelivered && { backgroundColor: '#16A34A' },
                ]}
              />
              <Text
                style={[
                  styles.activeStatusText,
                  isPickedUp && { color: COLORS.primary },
                  isDelivered && { color: '#16A34A' },
                ]}
              >
                {isAssigned
                  ? '1. A CAMINHO DA COLETA'
                  : isPickedUp
                  ? '2. EM TRANSPORTE PARA ENTREGA'
                  : '3. CORRIDA CONCLUÍDA'}
              </Text>
            </View>
            <Text style={styles.freightValueText}>{freightPrice}</Text>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Distância Viária</Text>
              <Text style={styles.metricValue}>{order.distance_km} km</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Tempo Estimado</Text>
              <Text style={styles.metricValue}>{order.estimated_duration_minutes} min</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Peso do Pacote</Text>
              <Text style={styles.metricValue}>{order.package_weight_kg} kg</Text>
            </View>
          </View>
        </View>

        {/* Itinerário Passo a Passo Traçado no Aplicativo */}
        <View style={[styles.stopsCard, SHADOWS.sm]}>
          <Text style={styles.cardHeaderTitle}>Itinerário Viário no App</Text>

          {/* Etapa 1: Ponto de Coleta */}
          <View style={[styles.stopBlock, !isAssigned && { opacity: 0.6 }]}>
            <View style={styles.stopIconCol}>
              <View
                style={[
                  styles.stopIconCircle,
                  { backgroundColor: isAssigned ? '#ECFDF5' : '#F1F5F9' },
                ]}
              >
                <Ionicons
                  name={isAssigned ? 'arrow-forward-circle' : 'checkmark-circle'}
                  size={20}
                  color={isAssigned ? COLORS.accent : '#10B981'}
                />
              </View>
              <View style={styles.stepDashedLine} />
            </View>
            <View style={styles.stopDetailsCol}>
              <Text style={styles.stopTypeLabel}>1. PONTO DE COLETA (LOJISTA)</Text>
              <Text style={styles.stopTitle}>
                {order.client?.business_name || 'Comércio Parceiro'}
              </Text>
              <Text style={styles.stopAddress}>{order.origin_address}</Text>
            </View>
          </View>

          {/* Etapa 2: Ponto de Entrega */}
          <View style={[styles.stopBlock, isAssigned && { opacity: 0.65 }]}>
            <View style={styles.stopIconCol}>
              <View
                style={[
                  styles.stopIconCircle,
                  { backgroundColor: isPickedUp ? '#EFF6FF' : '#F1F5F9' },
                ]}
              >
                <Ionicons
                  name="location"
                  size={20}
                  color={isPickedUp ? COLORS.primary : COLORS.textMuted}
                />
              </View>
            </View>
            <View style={styles.stopDetailsCol}>
              <Text style={styles.stopTypeLabel}>2. DESTINO DE ENTREGA</Text>
              <Text style={styles.stopTitle}>Cliente Final</Text>
              <Text style={styles.stopAddress}>{order.dest_address}</Text>
            </View>
          </View>
        </View>

        {/* Detalhes da Carga */}
        <View style={[styles.packageNotesCard, SHADOWS.sm]}>
          <Text style={styles.cardHeaderTitle}>Conteúdo da Carga</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Ionicons name="cube-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.packageDescText}>{order.package_description}</Text>
          </View>
        </View>

        {/* Botões de Controle e Ciclo de Vida da Corrida */}
        <View style={styles.actionsContainer}>
          {isAssigned && (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: COLORS.accent }]}
              onPress={handleConfirmPickup}
              disabled={updatingStatus}
              activeOpacity={0.8}
              testID="confirm-pickup-btn"
            >
              {updatingStatus ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="cube" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>Confirmar Coleta no Lojista</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isPickedUp && (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: COLORS.primary }]}
              onPress={handleConfirmDelivery}
              disabled={updatingStatus}
              activeOpacity={0.8}
              testID="confirm-delivery-btn"
            >
              {updatingStatus ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-done-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>Confirmar Entrega ao Cliente</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isDelivered && (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#16A34A' }]}
              onPress={() => router.replace('/(courier)/dashboard')}
              activeOpacity={0.8}
              testID="finish-delivery-btn"
            >
              <Ionicons name="home" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Voltar ao Início</Text>
            </TouchableOpacity>
          )}

          {/* Botão de Cancelamento de Corrida em Andamento */}
          {(isAssigned || isPickedUp) && (
            <TouchableOpacity
              style={styles.cancelDeliveryBtn}
              onPress={handleAttemptExit}
              disabled={cancelingOrder || updatingStatus}
              activeOpacity={0.7}
              testID="cancel-delivery-btn"
            >
              {cancelingOrder ? (
                <ActivityIndicator color={COLORS.error} size="small" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={16} color={COLORS.error} />
                  <Text style={styles.cancelDeliveryBtnText}>Cancelar Corrida</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
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
  backBtn: {
    padding: SPACING.xs,
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl * 2,
  },
  mapWrapper: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  activeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  activeStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  freightValueText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  stopsCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  stopBlock: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  stopIconCol: {
    alignItems: 'center',
  },
  stopIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDashedLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  stopDetailsCol: {
    flex: 1,
    paddingBottom: SPACING.lg,
  },
  stopTypeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  stopTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  stopAddress: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  packageNotesCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  packageDescText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  actionsContainer: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelDeliveryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  cancelDeliveryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.error,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  notFoundContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  backHomeBtn: {
    width: '100%',
  },
});
