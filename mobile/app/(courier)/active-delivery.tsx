import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAppInsets } from '../../src/hooks/useAppInsets';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { courierService, ExpressOrder } from '../../src/services/courierService';
import { RouteMapPreview } from '../../src/components/RouteMapPreview';
import { Button } from '../../src/components/Button';
import { openMultiStopNavigation, openExternalNavigation } from '../../src/utils/navigationLauncher';

export default function ActiveDeliveryScreen() {
  const router = useRouter();
  const insets = useAppInsets();
  const params = useLocalSearchParams<{ orderId: string }>();
  const orderId = params.orderId ? Number(params.orderId) : null;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<ExpressOrder | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cancelingOrder, setCancelingOrder] = useState(false);

  // Modal de Comprovante de Entrega Obrigatório (Código de 6 dígitos ou Foto)
  const [proofModalVisible, setProofModalVisible] = useState(false);
  const [proofMethod, setProofMethod] = useState<'code' | 'photo'>('code');
  const [deliveryCode, setDeliveryCode] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

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

  // Abre o modal obrigatório de comprovante de entrega
  const handleOpenDeliveryProofModal = () => {
    setProofMethod('code');
    setDeliveryCode('');
    setProofUrl('');
    setPhotoBase64(null);
    setProofModalVisible(true);
  };

  // Captura foto com a câmera do dispositivo
  const handleTakePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permissão Necessária', 'Autorize o acesso à câmera para fotografar o comprovante.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setProofUrl(asset.uri);
        if (asset.base64) {
          setPhotoBase64(`data:image/jpeg;base64,${asset.base64}`);
        }
      }
    } catch (err) {
      Alert.alert('Câmera Indisponível', 'Não foi possível abrir a câmera neste dispositivo.');
    }
  };

  // Seleciona foto da galeria
  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permissão Necessária', 'Autorize o acesso à galeria para anexar a foto do comprovante.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setProofUrl(asset.uri);
        if (asset.base64) {
          setPhotoBase64(`data:image/jpeg;base64,${asset.base64}`);
        }
      }
    } catch (err) {
      Alert.alert('Galeria Indisponível', 'Não foi possível abrir a galeria neste dispositivo.');
    }
  };

  // Confirmação de entrega final ao cliente com validação de comprovante obrigatório
  const handleConfirmDelivery = async () => {
    if (!order) return;

    if (proofMethod === 'code') {
      const cleanCode = deliveryCode.trim();
      if (!/^\d{6}$/.test(cleanCode)) {
        Alert.alert(
          'Código Obrigatório',
          'Digite o código numérico de 6 dígitos fornecido pelo lojista/destinatário para validar a entrega.'
        );
        return;
      }

      try {
        setUpdatingStatus(true);
        const response = await courierService.confirmDelivery(order.id, undefined, cleanCode);
        setOrder(response.order);
        setProofModalVisible(false);
        Alert.alert(
          'Entrega Finalizada!',
          'Parabéns! O código de 6 dígitos foi validado e a entrega foi concluída com sucesso.',
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
          error.response?.data?.message || 'Código de 6 dígitos inválido ou falha ao concluir a entrega.'
        );
      } finally {
        setUpdatingStatus(false);
      }
    } else {
      const cleanUrl = proofUrl.trim();
      if (!cleanUrl && !photoBase64) {
        Alert.alert(
          'Comprovante Obrigatório',
          'Tire uma foto do comprovante de entrega ou informe o código de 6 dígitos do pedido.'
        );
        return;
      }

      try {
        setUpdatingStatus(true);
        const response = await courierService.confirmDelivery(
          order.id,
          cleanUrl || undefined,
          undefined,
          photoBase64 || undefined
        );
        setOrder(response.order);
        setProofModalVisible(false);
        Alert.alert(
          'Entrega Finalizada!',
          'Parabéns! O comprovante fotográfico foi registrado e a entrega foi concluída com sucesso.',
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
    }
  };

  // Navegação por GPS externo para a entrega expressa
  const handleNavigateExternalGps = () => {
    if (!order) return;

    if (order.status === 'assigned') {
      openMultiStopNavigation({
        stops: [
          {
            lat: Number(order.origin_lat),
            lng: Number(order.origin_lng),
            label: `Coleta: ${order.origin_address}`,
            sequence: 1,
          },
          {
            lat: Number(order.dest_lat),
            lng: Number(order.dest_lng),
            label: `Entrega: ${order.dest_address}`,
            sequence: 2,
          },
        ],
        groupTitle: `Corrida Expressa #${order.id}`,
        app: 'ask',
      });
    } else {
      openExternalNavigation({
        lat: Number(order.dest_lat),
        lng: Number(order.dest_lng),
        label: `Entrega #${order.id}: ${order.dest_address}`,
        app: 'ask',
      });
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
      {/* Header com safe area insets e interceptação de saída */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.xs }]}>
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

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + SPACING.xxl }]} showsVerticalScrollIndicator={false}>
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

          {/* Botão para Navegar por GPS Externo */}
          {!isDelivered && (
            <TouchableOpacity
              style={styles.externalGpsBtn}
              onPress={handleNavigateExternalGps}
              activeOpacity={0.85}
              testID="active-delivery-gps-btn"
            >
              <View style={styles.externalGpsIconWrap}>
                <Ionicons name="navigate" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.externalGpsTitle}>Navegar pelo GPS Externo</Text>
                <Text style={styles.externalGpsSubtitle}>
                  {isAssigned
                    ? 'Traçar rota completa (Coleta + Entrega) no Google Maps ou Waze'
                    : 'Traçar rota até o endereço de entrega no Google Maps ou Waze'}
                </Text>
              </View>
              <Ionicons name="open-outline" size={18} color="#1E40AF" />
            </TouchableOpacity>
          )}
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
              onPress={handleOpenDeliveryProofModal}
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

      {/* Modal Obrigatório de Comprovante de Entrega (Código de 6 Dígitos ou Foto) */}
      <Modal
        visible={proofModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProofModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, SHADOWS.lg]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="shield-checkmark" size={22} color="#059669" />
              </View>
              <Text style={styles.modalTitle}>Comprovante Obrigatório</Text>
              <TouchableOpacity
                onPress={() => setProofModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Para concluir o Pedido #{order.id}, valide com o código de 6 dígitos do pedido ou envie uma foto do comprovante.
            </Text>

            {/* Seletor de Método de Validação */}
            <View style={styles.methodTabsRow}>
              <TouchableOpacity
                style={[
                  styles.methodTabBtn,
                  proofMethod === 'code' && styles.methodTabBtnActive,
                ]}
                onPress={() => setProofMethod('code')}
                activeOpacity={0.8}
                testID="proof-tab-code"
              >
                <Ionicons
                  name="keypad-outline"
                  size={15}
                  color={proofMethod === 'code' ? '#FFFFFF' : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.methodTabText,
                    proofMethod === 'code' && styles.methodTabTextActive,
                  ]}
                >
                  Código (6 dígitos)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.methodTabBtn,
                  proofMethod === 'photo' && styles.methodTabBtnActive,
                ]}
                onPress={() => setProofMethod('photo')}
                activeOpacity={0.8}
                testID="proof-tab-photo"
              >
                <Ionicons
                  name="camera-outline"
                  size={16}
                  color={proofMethod === 'photo' ? '#FFFFFF' : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.methodTabText,
                    proofMethod === 'photo' && styles.methodTabTextActive,
                  ]}
                >
                  Foto de Comprovante
                </Text>
              </TouchableOpacity>
            </View>

            {proofMethod === 'code' ? (
              <View style={styles.proofSection}>
                <Text style={styles.proofLabel}>Código de Confirmação (6 dígitos):</Text>
                <TextInput
                  style={styles.codeDigitInput}
                  value={deliveryCode}
                  onChangeText={(txt) => setDeliveryCode(txt.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  testID="delivery-code-input"
                />
                <View style={styles.proofInfoRow}>
                  <Ionicons name="lock-closed-outline" size={14} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={styles.proofInfoText}>
                    Solicite o código de 6 dígitos que aparece no aplicativo do lojista/destinatário.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.proofSection}>
                <Text style={styles.proofLabel}>Fotografar ou Anexar Comprovante:</Text>
                <View style={styles.cameraActionsRow}>
                  <TouchableOpacity
                    style={styles.cameraActionBtn}
                    onPress={handleTakePhoto}
                    activeOpacity={0.8}
                    testID="take-photo-btn"
                  >
                    <Ionicons name="camera" size={16} color={COLORS.primary} />
                    <Text style={styles.cameraActionBtnText}>Usar Câmera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cameraActionBtn}
                    onPress={handlePickPhoto}
                    activeOpacity={0.8}
                    testID="pick-photo-btn"
                  >
                    <Ionicons name="images-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.cameraActionBtnText}>Da Galeria</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.proofInput}
                  value={proofUrl}
                  onChangeText={setProofUrl}
                  placeholder="Ou cole o link / identificador da foto do comprovante"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  testID="proof-input"
                />
                <View style={styles.proofInfoRow}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={styles.proofInfoText}>
                    A foto ficará anexada ao pedido para conferência do lojista.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setProofModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Voltar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, updatingStatus && { opacity: 0.7 }]}
                onPress={handleConfirmDelivery}
                disabled={updatingStatus}
                activeOpacity={0.8}
                testID="submit-delivery-proof-btn"
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.modalSubmitBtnText}>
                  {updatingStatus ? 'Validando...' : 'Validar e Concluir'}
                </Text>
              </TouchableOpacity>
            </View>
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
  externalGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: SPACING.xs,
    gap: 10,
  },
  externalGpsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  externalGpsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  externalGpsSubtitle: {
    fontSize: 11,
    color: '#1D4ED8',
    marginTop: 2,
    lineHeight: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    alignItems: 'center',
    marginBottom: 10,
  },
  modalIconWrap: {
    marginRight: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 14,
  },
  methodTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  methodTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  methodTabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  methodTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  methodTabTextActive: {
    color: '#FFFFFF',
  },
  proofSection: {
    marginBottom: 18,
  },
  proofLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  codeDigitInput: {
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
    color: COLORS.primary,
    backgroundColor: '#EFF6FF',
  },
  cameraActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  cameraActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  cameraActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  proofInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textPrimary,
    backgroundColor: '#F8FAFC',
  },
  proofInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  proofInfoText: {
    fontSize: 11,
    color: '#059669',
    flex: 1,
    lineHeight: 15,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  modalSubmitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: '#059669',
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
