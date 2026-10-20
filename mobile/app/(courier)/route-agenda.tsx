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
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { Header } from '../../src/components/Header';
import {
  courierService,
  ActiveDeliveryGroup,
  SequencedStop,
} from '../../src/services/courierService';
import { openMultiStopNavigation } from '../../src/utils/navigationLauncher';

export default function RouteAgendaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId?: string }>();
  const initialGroupId = params.groupId ? Number(params.groupId) : null;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [group, setGroup] = useState<ActiveDeliveryGroup | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Modal de comprovante de entrega obrigatório (Código de 6 dígitos ou Foto)
  const [proofModalVisible, setProofModalVisible] = useState<boolean>(false);
  const [selectedDeliveryStop, setSelectedDeliveryStop] = useState<SequencedStop | null>(null);
  const [proofMethod, setProofMethod] = useState<'code' | 'photo'>('code');
  const [deliveryCode, setDeliveryCode] = useState<string>('');
  const [proofUrl, setProofUrl] = useState<string>('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const loadAgenda = useCallback(async () => {
    try {
      if (initialGroupId) {
        const detail = await courierService.getDeliveryGroupDetail(initialGroupId);
        setGroup(detail);
      } else {
        const res = await courierService.getActiveGroup();
        setGroup(res.active_group);
      }
    } catch (err) {
      console.warn('Erro ao carregar agenda de rotas:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [initialGroupId]);

  useEffect(() => {
    loadAgenda();
  }, [loadAgenda]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadAgenda();
  };

  // Inicia a jornada formalmente
  const handleStartGroup = async () => {
    if (!group) return;

    try {
      setActionLoading(true);
      const res = await courierService.startDeliveryGroup(group.id);
      setGroup(res.group);
      Alert.alert('Jornada Iniciada!', 'Siga a sequência de paradas para garantir a eficiência do lote.');
    } catch (err: any) {
      Alert.alert(
        'Erro ao Iniciar',
        err?.response?.data?.message || 'Não foi possível iniciar a jornada do lote.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Conclui o lote quando todas as paradas estiverem concluídas
  const handleCompleteGroup = async () => {
    if (!group) return;

    try {
      setActionLoading(true);
      const res = await courierService.completeDeliveryGroup(group.id);
      setGroup(res.group);
      Alert.alert(
        'Lote Concluído com Sucesso!',
        `Parabéns! Todas as entregas foram realizadas.\n\n• Ganhos Totais: R$ ${Number(res.group.total_earnings).toFixed(2)}\n• Bônus Rateio 50%: R$ ${Number(res.group.courier_bonus).toFixed(2)}`,
        [
          {
            text: 'Ver Extrato',
            onPress: () => router.push('/(courier)/financial'),
          },
          {
            text: 'Concluir',
            onPress: () => router.replace('/(courier)/dashboard'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(
        'Atenção',
        err?.response?.data?.message || 'Não foi possível concluir o lote econômico.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Confirmação de coleta (1 clique)
  const handleConfirmPickup = async (stop: SequencedStop) => {
    try {
      setActionLoading(true);
      await courierService.confirmPickup(stop.order_id);
      Alert.alert('Coleta Confirmada!', `Mercadoria do Pedido #${stop.order_id} em mãos. Siga para a próxima parada.`);
      await loadAgenda();
    } catch (err: any) {
      Alert.alert(
        'Erro na Coleta',
        err?.response?.data?.message || 'Falha ao confirmar a coleta.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Abertura do modal de entrega com comprovante obrigatório
  const handleOpenDeliveryModal = (stop: SequencedStop) => {
    setSelectedDeliveryStop(stop);
    setProofMethod('code');
    setDeliveryCode('');
    setProofUrl('');
    setPhotoBase64(null);
    setProofModalVisible(true);
  };

  // Captura foto com a câmera do aparelho
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

  // Confirmação da entrega com comprovante obrigatório (código de 6 dígitos ou foto)
  const handleConfirmDeliveryWithProof = async () => {
    if (!selectedDeliveryStop) return;

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
        setActionLoading(true);
        await courierService.confirmDelivery(selectedDeliveryStop.order_id, undefined, cleanCode);
        setProofModalVisible(false);
        Alert.alert(
          'Entrega Concluída!',
          `Pedido #${selectedDeliveryStop.order_id} validado pelo código de 6 dígitos e finalizado com sucesso.`
        );
        await loadAgenda();
      } catch (err: any) {
        Alert.alert(
          'Erro na Entrega',
          err?.response?.data?.message || 'Código de 6 dígitos inválido ou falha ao confirmar entrega.'
        );
      } finally {
        setActionLoading(false);
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
        setActionLoading(true);
        await courierService.confirmDelivery(
          selectedDeliveryStop.order_id,
          cleanUrl || undefined,
          undefined,
          photoBase64 || undefined
        );
        setProofModalVisible(false);
        Alert.alert(
          'Entrega Concluída!',
          `Pedido #${selectedDeliveryStop.order_id} finalizado com sucesso com comprovante fotográfico anexado.`
        );
        await loadAgenda();
      } catch (err: any) {
        Alert.alert(
          'Erro na Entrega',
          err?.response?.data?.message || 'Falha ao confirmar entrega do pedido.'
        );
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Transbordamento de GPS externo para TODAS as paradas reunidas em uma única rota unificada
  const handleNavigateFullRoute = () => {
    if (!group || !group.stops || group.stops.length === 0) {
      Alert.alert('Itinerário Vazio', 'Nenhuma parada encontrada neste lote.');
      return;
    }

    // Prioriza as paradas pendentes se o entregador já realizou parte do itinerário
    const pendingStops = group.stops.filter((s) => s.status !== 'completed');
    const stopsToRoute = pendingStops.length > 0 ? pendingStops : group.stops;

    openMultiStopNavigation({
      stops: stopsToRoute.map((s, idx) => ({
        lat: Number(s.lat),
        lng: Number(s.lng),
        label: `Parada #${s.stop_sequence || idx + 1} (${s.stop_type === 'pickup' ? 'Coleta' : 'Entrega'}): ${s.address}`,
        sequence: s.stop_sequence || idx + 1,
      })),
      groupTitle: `Lote #${group.id} (${stopsToRoute.length} paradas)`,
      app: 'ask',
    });
  };

  return (
    <View style={styles.container}>
      <Header />

      {/* Barra de Navegação */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          testID="route-agenda-back-btn"
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Agenda de Rotas</Text>
        <TouchableOpacity
          style={styles.refreshIconBtn}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Carregando sua agenda sequenciada...</Text>
          </View>
        ) : !group ? (
          <View style={[styles.emptyBox, SHADOWS.sm]} testID="route-agenda-empty">
            <Ionicons name="map-outline" size={48} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Nenhuma Rota Ativa no Momento</Text>
            <Text style={styles.emptyDesc}>
              Você não possui nenhum lote econômico atribuído ou em andamento. Acesse a área de Lotes Econômicos ou o Radar Expresso para aceitar novas corridas.
            </Text>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => router.push('/(courier)/economic-batches')}
              activeOpacity={0.8}
            >
              <Ionicons name="albums-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryActionBtnText}>Ver Lotes Disponíveis</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.contentWrap}>
            {/* Hero Card de Métricas do Lote */}
            <View style={[styles.heroCard, SHADOWS.md]} testID="agenda-hero-card">
              <View style={styles.heroHeader}>
                <View style={styles.groupBadge}>
                  <Ionicons name="layers" size={14} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={styles.groupBadgeText}>Lote #{group.id}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    group.status === 'in_progress'
                      ? styles.statusPillActive
                      : group.status === 'completed'
                      ? styles.statusPillCompleted
                      : styles.statusPillAssigned,
                  ]}
                >
                  <Text style={styles.statusPillText}>
                    {group.status === 'in_progress'
                      ? 'Em Rota'
                      : group.status === 'completed'
                      ? 'Concluído'
                      : 'Agendado / Atribuído'}
                  </Text>
                </View>
              </View>

              {/* Barra de Progresso das Paradas */}
              <View style={styles.progressRow}>
                <View style={styles.progressTextRow}>
                  <Text style={styles.progressLabel}>Progresso das Paradas</Text>
                  <Text style={styles.progressCountText}>
                    {group.completed_stops_count} de {group.total_stops} concluídas
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${
                          group.total_stops > 0
                            ? (group.completed_stops_count / group.total_stops) * 100
                            : 0
                        }%`,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Grid de Rendimentos */}
              <View style={styles.earningsGrid}>
                <View style={styles.earningItem}>
                  <Text style={styles.earningItemLabel}>SEU GANHO TOTAL</Text>
                  <Text style={styles.earningItemValueHighlight}>
                    R$ {Number(group.total_earnings || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.earningDivider} />
                <View style={styles.earningItem}>
                  <Text style={styles.earningItemLabel}>DISTÂNCIA</Text>
                  <Text style={styles.earningItemValue}>
                    {group.total_distance_km} km
                  </Text>
                </View>
                <View style={styles.earningDivider} />
                <View style={styles.earningItem}>
                  <Text style={styles.earningItemLabel}>BÔNUS</Text>
                  <Text style={[styles.earningItemValue, { color: '#059669' }]}>
                    + R$ {(Number(group.stop_fees || 0) + Number(group.courier_bonus || 0)).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Botão para Iniciar Jornada se estiver em 'assigned' */}
              {group.status === 'assigned' && (
                <TouchableOpacity
                  style={[styles.startBatchBtn, actionLoading && { opacity: 0.7 }]}
                  onPress={handleStartGroup}
                  disabled={actionLoading}
                  activeOpacity={0.8}
                  testID="start-batch-btn"
                >
                  <Ionicons name="play" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.startBatchBtnText}>
                    {actionLoading ? 'Iniciando Rota...' : 'Iniciar Rota do Lote'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Botão para Finalizar Lote se todas as paradas foram feitas */}
              {group.status === 'in_progress' && group.is_all_completed && (
                <TouchableOpacity
                  style={[styles.completeBatchBtn, actionLoading && { opacity: 0.7 }]}
                  onPress={handleCompleteGroup}
                  disabled={actionLoading}
                  activeOpacity={0.8}
                  testID="complete-batch-btn"
                >
                  <Ionicons name="checkmark-done" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.startBatchBtnText}>
                    {actionLoading ? 'Finalizando...' : 'Concluir Lote Econômico'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Botão Unificado para Navegar pelo GPS com TODAS as Paradas da Rota */}
              {group.stops && group.stops.length > 0 && group.status !== 'completed' && (
                <TouchableOpacity
                  style={[styles.fullRouteGpsBtn, SHADOWS.sm]}
                  onPress={handleNavigateFullRoute}
                  activeOpacity={0.85}
                  testID="nav-full-route-gps-btn"
                >
                  <View style={styles.fullRouteGpsIconWrap}>
                    <Ionicons name="navigate" size={18} color="#FFFFFF" />
                  </View>
                  <View style={styles.fullRouteGpsTextBox}>
                    <Text style={styles.fullRouteGpsBtnTitle}>Navegar pelo GPS (Rota Completa)</Text>
                    <Text style={styles.fullRouteGpsBtnSubtitle}>
                      {(() => {
                        const pendingCount = group.stops.filter((s) => s.status !== 'completed').length;
                        return pendingCount === 0
                          ? `Todas as ${group.stops.length} paradas unificadas no trajeto`
                          : `Reúne ${pendingCount} parada${pendingCount > 1 ? 's pendentes' : ' pendente'} em uma única rota contínua`;
                      })()}
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color="#1E40AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Título da Seção de Paradas */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Itinerário Sequenciado de Paradas</Text>
                <Text style={styles.sectionSubtitle}>{group.stops.length} pontos no trajeto</Text>
              </View>
              {group.stops && group.stops.length > 0 && (
                <TouchableOpacity
                  style={styles.headerGpsMiniBtn}
                  onPress={handleNavigateFullRoute}
                  activeOpacity={0.8}
                  testID="header-nav-gps-btn"
                >
                  <Ionicons name="navigate" size={13} color="#1E40AF" style={{ marginRight: 4 }} />
                  <Text style={styles.headerGpsMiniBtnText}>Navegar Todas</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Lista Interativa de Paradas */}
            <View style={styles.stopsList}>
              {group.stops.map((stop, idx) => {
                const isPickup = stop.stop_type === 'pickup';
                const isCompleted = stop.status === 'completed';
                const isCurrent =
                  group.current_stop && group.current_stop.id === stop.id && !isCompleted;

                return (
                  <View
                    key={stop.id || idx}
                    style={[
                      styles.stopCard,
                      SHADOWS.sm,
                      isCurrent && styles.stopCardCurrent,
                      isCompleted && styles.stopCardCompleted,
                    ]}
                    testID={`agenda-stop-card-${stop.id}`}
                  >
                    {/* Topo do Card de Parada */}
                    <View style={styles.stopCardTop}>
                      <View style={styles.stopSequenceBox}>
                        <View
                          style={[
                            styles.seqBadgeCircle,
                            isCompleted
                              ? styles.seqCompletedCircle
                              : isPickup
                              ? styles.seqPickupCircle
                              : styles.seqDeliveryCircle,
                          ]}
                        >
                          {isCompleted ? (
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          ) : (
                            <Text style={styles.seqBadgeNumber}>{stop.stop_sequence || idx + 1}</Text>
                          )}
                        </View>
                        <View style={{ marginLeft: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View
                              style={[
                                styles.stopTypeTag,
                                isPickup ? styles.pickupTag : styles.deliveryTag,
                              ]}
                            >
                              <Ionicons
                                name={isPickup ? 'arrow-up-circle' : 'arrow-down-circle'}
                                size={12}
                                color={isPickup ? '#92400E' : '#1E40AF'}
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                style={[
                                  styles.stopTypeTagText,
                                  isPickup ? styles.pickupTagText : styles.deliveryTagText,
                                ]}
                              >
                                {isPickup ? 'Coleta no Lojista' : 'Entrega no Destinatário'}
                              </Text>
                            </View>
                            {isCurrent && (
                              <View style={styles.currentActivePill}>
                                <Text style={styles.currentActivePillText}>PRÓXIMA PARADA</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.stopOrderTitle}>
                            Pedido #{stop.order_id} {stop.package_description ? `• ${stop.package_description}` : ''}
                          </Text>
                        </View>
                      </View>

                      {/* Status Badge */}
                      <View
                        style={[
                          styles.stopStatusBadge,
                          isCompleted ? styles.stopStatusCompleted : styles.stopStatusPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.stopStatusBadgeText,
                            isCompleted ? styles.stopStatusCompletedText : styles.stopStatusPendingText,
                          ]}
                        >
                          {isCompleted ? 'Concluída' : 'Pendente'}
                        </Text>
                      </View>
                    </View>

                    {/* Endereço e Detalhes */}
                    <View style={styles.addressBox}>
                      <Ionicons name="location-sharp" size={16} color={COLORS.primary} style={{ marginRight: 6, marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.addressText}>{stop.address}</Text>
                        {stop.client_name && (
                          <Text style={styles.clientDetailText}>
                            Responsável: {stop.client_name} {stop.client_phone ? `(${stop.client_phone})` : ''}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Ações Operacionais da Parada (apenas se pendente) */}
                    {!isCompleted && (
                      <View style={styles.stopActionsRow}>
                        {isPickup ? (
                          <TouchableOpacity
                            style={[styles.actionConfirmPickupBtn, actionLoading && { opacity: 0.7 }]}
                            onPress={() => handleConfirmPickup(stop)}
                            disabled={actionLoading}
                            activeOpacity={0.8}
                            testID={`confirm-pickup-btn-${stop.id}`}
                          >
                            <Ionicons name="cube-outline" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.actionConfirmBtnText}>Confirmar Coleta</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.actionConfirmDeliveryBtn, actionLoading && { opacity: 0.7 }]}
                            onPress={() => handleOpenDeliveryModal(stop)}
                            disabled={actionLoading}
                            activeOpacity={0.8}
                            testID={`confirm-delivery-btn-${stop.id}`}
                          >
                            <Ionicons name="camera-outline" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.actionConfirmBtnText}>Concluir Entrega</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal de Confirmação de Entrega com Comprovante */}
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
                <Ionicons name="checkmark-circle" size={24} color="#059669" />
              </View>
              <Text style={styles.modalTitle}>Confirmar Entrega</Text>
              <TouchableOpacity
                onPress={() => setProofModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Finalize o Pedido #{selectedDeliveryStop?.order_id} enviando o código de 6 dígitos do pedido ou uma foto de comprovante.
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
                    Solicite o código de 6 dígitos gerado no pedido ao destinatário ou lojista.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.proofSection}>
                <Text style={styles.proofLabel}>Comprovante de Entrega (Foto / Link):</Text>
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
                  placeholder="Insira URL ou tire uma foto do recibo"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  testID="proof-input"
                />
                <View style={styles.proofInfoRow}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={styles.proofInfoText}>
                    A imagem do comprovante será exibida no extrato e rastreamento do lojista.
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
                style={[styles.modalSubmitBtn, actionLoading && { opacity: 0.7 }]}
                onPress={handleConfirmDeliveryWithProof}
                disabled={actionLoading}
                activeOpacity={0.8}
                testID="submit-delivery-proof-btn"
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.modalSubmitBtnText}>
                  {actionLoading ? 'Finalizando...' : 'Confirmar e Finalizar'}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 4,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  refreshIconBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  emptyBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 24,
    alignItems: 'center',
    marginVertical: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  contentWrap: {
    flex: 1,
  },
  heroCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  groupBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  statusPillActive: {
    backgroundColor: '#EDE9FE',
  },
  statusPillAssigned: {
    backgroundColor: '#DBEAFE',
  },
  statusPillCompleted: {
    backgroundColor: '#D1FAE5',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressRow: {
    marginBottom: 14,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  progressCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  earningsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  earningItem: {
    flex: 1,
    alignItems: 'center',
  },
  earningItemLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  earningItemValueHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  earningItemValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  earningDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
  },
  startBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    marginTop: 14,
  },
  completeBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E40AF',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    marginTop: 14,
  },
  startBatchBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  fullRouteGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.md,
    padding: 12,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    gap: 10,
  },
  fullRouteGpsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullRouteGpsTextBox: {
    flex: 1,
  },
  fullRouteGpsBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
  },
  fullRouteGpsBtnSubtitle: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerGpsMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  headerGpsMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  stopsList: {
    gap: 12,
  },
  stopCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stopCardCurrent: {
    borderColor: '#059669',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  stopCardCompleted: {
    opacity: 0.75,
    backgroundColor: '#F8FAFC',
  },
  stopCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stopSequenceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  seqBadgeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqCompletedCircle: {
    backgroundColor: '#059669',
  },
  seqPickupCircle: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#D97706',
  },
  seqDeliveryCircle: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  seqBadgeNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  stopTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  pickupTag: {
    backgroundColor: '#FEF3C7',
  },
  deliveryTag: {
    backgroundColor: '#DBEAFE',
  },
  stopTypeTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pickupTagText: {
    color: '#92400E',
  },
  deliveryTagText: {
    color: '#1E40AF',
  },
  currentActivePill: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentActivePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stopOrderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  stopStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stopStatusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stopStatusCompleted: {
    backgroundColor: '#D1FAE5',
  },
  stopStatusPending: {
    backgroundColor: '#F1F5F9',
  },
  stopStatusCompletedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  stopStatusPendingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: RADIUS.sm,
    marginVertical: 8,
  },
  addressText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  clientDetailText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  stopActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  navExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  navExternalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  actionConfirmPickupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  actionConfirmDeliveryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  actionConfirmBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalIconWrap: {
    marginRight: 8,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
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
    borderRadius: RADIUS.sm,
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
  codeDigitInput: {
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    marginBottom: 8,
  },
  cameraActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  cameraActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  proofSection: {
    marginBottom: 16,
  },
  proofLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  proofInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 10,
    fontSize: 13,
    color: COLORS.text,
  },
  proofInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  proofInfoText: {
    fontSize: 11,
    color: '#059669',
    flex: 1,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
