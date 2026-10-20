import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import {
  adminService,
  AdminUserItem,
  AdminUsersMetrics,
  AdminOrderItem,
  AdminOrdersMetrics,
  AdminBatchSummary,
  ProcessBatchResult,
} from '../services/adminService';

type AdminTab = 'users' | 'orders';

export function AdminPanelScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  // Estado do Motor de Lote Noturno (Rateio 50/50)
  const [batchSummary, setBatchSummary] = useState<AdminBatchSummary | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [lastBatchResult, setLastBatchResult] = useState<ProcessBatchResult | null>(null);

  // Estado de Usuários
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [userMetrics, setUserMetrics] = useState<AdminUsersMetrics | null>(null);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userSearch, setUserSearch] = useState<string>('');
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);

  // Estado de Pedidos
  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [orderMetrics, setOrderMetrics] = useState<AdminOrdersMetrics | null>(null);
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [updatingCourierId, setUpdatingCourierId] = useState<number | null>(null);

  // Carrega Resumo da Fila do Lote Econômico
  const loadBatchSummary = useCallback(async () => {
    try {
      if (typeof adminService.getBatchSummary === 'function') {
        const summary = await adminService.getBatchSummary();
        if (summary) {
          setBatchSummary(summary);
        }
      }
    } catch (_) {
      // Silencioso caso não esteja mockado em testes específicos
    }
  }, []);

  // Executa manualmente o Lote Noturno (Rateio Dinâmico 50/50)
  const handleRunManualBatch = async () => {
    try {
      setIsProcessingBatch(true);
      const res = await adminService.processEconomicBatch({ dry_run: false });
      setLastBatchResult(res);

      await Promise.all([loadBatchSummary(), loadUsers(), loadOrders()]);

      Alert.alert(
        'Lote Noturno Executado!',
        `Processamento manual concluído com sucesso!\n\n• Pedidos Organizados: ${res.orders_processed}\n• Lotes Criados: ${res.groups_created}\n• Economia Viária 50/50: R$ ${Number(res.total_savings_generated || 0).toFixed(2)}`
      );
    } catch (err: any) {
      Alert.alert(
        'Erro ao Executar Lote',
        err?.response?.data?.message || 'Não foi possível processar o lote econômico no momento.'
      );
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const handleToggleCourierActive = async (courierId: number, currentActive: boolean) => {
    try {
      setUpdatingCourierId(courierId);
      const newStatus = !currentActive;
      await adminService.toggleCourierStatus(courierId, newStatus);
      // Atualiza o estado local imediatamente
      setUsers((prev) =>
        prev.map((u) => {
          if (u.courier && u.courier.id === courierId) {
            return {
              ...u,
              courier: {
                ...u.courier,
                is_active: newStatus,
              },
            };
          }
          return u;
        })
      );
    } catch (err: any) {
      Alert.alert(
        'Erro ao Alterar Status',
        err?.response?.data?.message || 'Falha ao alterar status de atividade do entregador.'
      );
    } finally {
      setUpdatingCourierId(null);
    }
  };

  // Carrega Usuários
  const loadUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      const params: any = {};
      if (userRoleFilter !== 'all') params.role = userRoleFilter;
      if (userSearch.trim()) params.search = userSearch.trim();

      const res = await adminService.getUsers(params);
      setUsers(res.users);
      setUserMetrics(res.metrics);
    } catch (err) {
      console.warn('Erro ao carregar usuários:', err);
    } finally {
      setIsLoadingUsers(false);
      setIsRefreshing(false);
    }
  }, [userRoleFilter, userSearch]);

  // Carrega Pedidos
  const loadOrders = useCallback(async () => {
    try {
      setIsLoadingOrders(true);
      const params: any = {};
      if (orderTypeFilter !== 'all') params.shipping_type = orderTypeFilter;
      if (orderStatusFilter !== 'all') params.status = orderStatusFilter;
      if (orderSearch.trim()) params.search = orderSearch.trim();

      const res = await adminService.getOrders(params);
      setOrders(res.orders);
      setOrderMetrics(res.metrics);
    } catch (err) {
      console.warn('Erro ao carregar pedidos:', err);
    } finally {
      setIsLoadingOrders(false);
      setIsRefreshing(false);
    }
  }, [orderTypeFilter, orderStatusFilter, orderSearch]);

  useEffect(() => {
    loadBatchSummary();
    if (activeTab === 'users') {
      loadUsers();
    } else {
      loadOrders();
    }
  }, [activeTab, loadUsers, loadOrders, loadBatchSummary]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadBatchSummary();
    if (activeTab === 'users') {
      loadUsers();
    } else {
      loadOrders();
    }
  };

  return (
    <View style={styles.container}>
      <Header />

      {/* Admin Title Bar & View Switchers */}
      <View style={styles.topBar}>
        <View style={styles.topBarTitleRow}>
          <View style={styles.shieldIconBox}>
            <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.topBarTitle}>Painel Administrativo Master</Text>
            <Text style={styles.topBarSubtitle}>Auditoria e Gestão Operacional Global</Text>
          </View>
        </View>

        <View style={styles.quickSwitchRow}>
          <TouchableOpacity
            style={styles.quickSwitchBtn}
            onPress={() => router.push('/(client)/dashboard')}
            activeOpacity={0.7}
            testID="admin-go-client-view"
          >
            <Ionicons name="storefront-outline" size={13} color={COLORS.primary} />
            <Text style={styles.quickSwitchText}>Visão Lojista</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickSwitchBtn}
            onPress={() => router.push('/(courier)/dashboard')}
            activeOpacity={0.7}
            testID="admin-go-courier-view"
          >
            <Ionicons name="bicycle-outline" size={13} color={COLORS.accentDark} />
            <Text style={[styles.quickSwitchText, { color: COLORS.accentDark }]}>Visão Entregador</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Tab Switcher: Usuários vs Todos os Pedidos */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'users' && styles.tabButtonActive]}
          onPress={() => setActiveTab('users')}
          activeOpacity={0.8}
          testID="admin-tab-users"
        >
          <Ionicons
            name={activeTab === 'users' ? 'people' : 'people-outline'}
            size={18}
            color={activeTab === 'users' ? COLORS.white : COLORS.textSecondary}
          />
          <Text style={[styles.tabButtonText, activeTab === 'users' && styles.tabButtonTextActive]}>
            Usuários do App
          </Text>
          {userMetrics && (
            <View style={[styles.tabBadge, activeTab === 'users' && styles.tabBadgeActive]}>
              <Text
                style={[styles.tabBadgeText, activeTab === 'users' && styles.tabBadgeTextActive]}
              >
                {userMetrics.total}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'orders' && styles.tabButtonActive]}
          onPress={() => setActiveTab('orders')}
          activeOpacity={0.8}
          testID="admin-tab-orders"
        >
          <Ionicons
            name={activeTab === 'orders' ? 'receipt' : 'receipt-outline'}
            size={18}
            color={activeTab === 'orders' ? COLORS.white : COLORS.textSecondary}
          />
          <Text style={[styles.tabButtonText, activeTab === 'orders' && styles.tabButtonTextActive]}>
            Todos os Pedidos
          </Text>
          {orderMetrics && (
            <View style={[styles.tabBadge, activeTab === 'orders' && styles.tabBadgeActive]}>
              <Text
                style={[styles.tabBadgeText, activeTab === 'orders' && styles.tabBadgeTextActive]}
              >
                {orderMetrics.total}
              </Text>
            </View>
          )}
        </TouchableOpacity>
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
        {/* ==================== MOTOR DE LOTE NOTURNO (EXECUÇÃO MANUAL) ==================== */}
        <View style={[styles.batchControlCard, SHADOWS.sm]} testID="admin-batch-control-card">
          <View style={styles.batchControlHeader}>
            <View style={styles.batchIconBadge}>
              <Ionicons name="cube" size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.batchControlTitle}>Motor de Lote Noturno (Rateio 50/50)</Text>
              <Text style={styles.batchControlSubtitle}>
                Agrupa pedidos econômicos pendentes por proximidade, divide 50/50 a economia viária e aplica R$ 3,00/parada.
              </Text>
            </View>
          </View>

          {batchSummary && (
            <View style={styles.batchMetricsRow}>
              <View style={styles.batchMetricBox}>
                <Text style={styles.batchMetricValue}>{batchSummary.pending_economic_orders}</Text>
                <Text style={styles.batchMetricLabel}>Fila Econômica</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.batchMetricBox}>
                <Text style={styles.batchMetricValue}>
                  {Number(batchSummary.total_weight_kg || 0).toFixed(1)} kg
                </Text>
                <Text style={styles.batchMetricLabel}>Peso Acumulado</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.batchMetricBox}>
                <Text style={[styles.batchMetricValue, { color: COLORS.accent }]}>
                  {batchSummary.recent_groups?.length ?? 0}
                </Text>
                <Text style={styles.batchMetricLabel}>Lotes Recentes</Text>
              </View>
            </View>
          )}

          {lastBatchResult && (
            <View style={styles.batchResultBanner} testID="admin-batch-result-banner">
              <Ionicons name="checkmark-circle" size={18} color={COLORS.accentDark} />
              <View style={{ flex: 1 }}>
                <Text style={styles.batchResultTitle}>
                  Última execução: {lastBatchResult.groups_created} lote(s) • {lastBatchResult.orders_processed} pedido(s)
                </Text>
                <Text style={styles.batchResultSub}>
                  Economia Total 50/50 Gerada: R$ {Number(lastBatchResult.total_savings_generated || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          <Button
            title={isProcessingBatch ? 'Processando Agrupamento...' : 'Executar Lote Noturno Agora'}
            variant="primary"
            loading={isProcessingBatch}
            disabled={isProcessingBatch}
            onPress={handleRunManualBatch}
            testID="admin-trigger-batch-btn"
          />
        </View>
        {activeTab === 'users' ? (
          /* ==================== ABA 1: USUÁRIOS DO SISTEMA ==================== */
          <View>
            {/* Métricas de Usuários */}
            {userMetrics && (
              <View style={[styles.metricsGrid, SHADOWS.sm]}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{userMetrics.total}</Text>
                  <Text style={styles.metricLbl}>Total Usuários</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={[styles.metricVal, { color: '#2563EB' }]}>{userMetrics.clients}</Text>
                  <Text style={styles.metricLbl}>Lojistas</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={[styles.metricVal, { color: '#059669' }]}>{userMetrics.couriers}</Text>
                  <Text style={styles.metricLbl}>Entregadores</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={[styles.metricVal, { color: '#7C3AED' }]}>{userMetrics.admins}</Text>
                  <Text style={styles.metricLbl}>Admins</Text>
                </View>
              </View>
            )}

            {/* Barra de Busca de Usuários */}
            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar usuário por nome, email ou telefone..."
                placeholderTextColor={COLORS.textMuted}
                value={userSearch}
                onChangeText={setUserSearch}
                onSubmitEditing={loadUsers}
                returnKeyType="search"
                testID="admin-user-search-input"
              />
              {userSearch.length > 0 && (
                <TouchableOpacity onPress={() => setUserSearch('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filtros de Tipo de Usuário (Chips) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {[
                { key: 'all', label: 'Todos os Perfis' },
                { key: 'client', label: 'Lojistas' },
                { key: 'courier', label: 'Entregadores' },
                { key: 'admin', label: 'Admins' },
              ].map((chip) => {
                const isSelected = userRoleFilter === chip.key;
                return (
                  <TouchableOpacity
                    key={chip.key}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setUserRoleFilter(chip.key)}
                    activeOpacity={0.7}
                    testID={`admin-user-filter-${chip.key}`}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Lista de Usuários */}
            {isLoadingUsers ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Carregando usuários cadastrados...</Text>
              </View>
            ) : users.length === 0 ? (
              <View style={[styles.emptyBox, SHADOWS.sm]} testID="admin-users-empty">
                <Ionicons name="people-outline" size={44} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>Nenhum usuário encontrado</Text>
                <Text style={styles.emptyDesc}>
                  Nenhum registro corresponde aos filtros ou busca informados.
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {users.map((item) => {
                  const isClient = item.role === 'client';
                  const isCourier = item.role === 'courier';
                  const isAdmin = item.role === 'admin';

                  return (
                    <View
                      key={item.id}
                      style={[styles.userCard, SHADOWS.sm]}
                      testID={`admin-user-card-${item.id}`}
                    >
                      <View style={styles.userCardHeader}>
                        <View style={styles.userAvatarBox}>
                          <Text style={styles.userAvatarText}>
                            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.userNameRow}>
                            <Text style={styles.userNameText}>{item.name}</Text>
                            <View
                              style={[
                                styles.roleBadge,
                                isClient && styles.roleClientBadge,
                                isCourier && styles.roleCourierBadge,
                                isAdmin && styles.roleAdminBadge,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.roleBadgeText,
                                  isClient && styles.roleClientText,
                                  isCourier && styles.roleCourierText,
                                  isAdmin && styles.roleAdminText,
                                ]}
                              >
                                {isClient ? 'Lojista' : isCourier ? 'Entregador' : 'Admin Master'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.userEmailText}>{item.email}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <Ionicons name="call-outline" size={12} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                            <Text style={styles.userPhoneText}>{item.phone || 'Sem telefone'}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Informações Específicas do Perfil */}
                      {isClient && item.client && (
                        <View style={styles.extraInfoBox}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                            <Ionicons name="business-outline" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
                            <Text style={styles.extraInfoTitle}>
                              {item.client.business_name}
                            </Text>
                          </View>
                          <Text style={styles.extraInfoSub}>
                            CNPJ/CPF: {item.client.cnpj_cpf}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <Ionicons name="location-outline" size={13} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                            <Text style={styles.extraInfoAddress} numberOfLines={2}>
                              {item.client.default_address}
                            </Text>
                          </View>
                        </View>
                      )}

                      {isCourier && item.courier && (
                        <View style={styles.extraInfoBox}>
                          <View style={styles.courierStatusRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View
                                style={[
                                  styles.statusDot,
                                  item.courier.is_online ? styles.statusOnline : styles.statusOffline,
                                ]}
                              />
                              <Text style={styles.courierStatusText}>
                                {item.courier.is_online ? 'Disponível no Radar' : 'Offline'}
                              </Text>
                            </View>
                            <Text style={styles.courierRadiusText}>
                              Raio: {item.courier.cluster_radius_km} km
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                            <Ionicons name="bicycle-outline" size={13} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                            <Text style={styles.extraInfoSub}>
                              Veículo: {item.courier.vehicle_type} • Placa: {item.courier.vehicle_plate}
                            </Text>
                          </View>
                          <Text style={styles.extraInfoSub}>
                            CNH: {item.courier.cnh}
                          </Text>

                          {/* Controle de Atividade (Ativo para Lotes e Chamados) */}
                          <View style={styles.courierActiveControlRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.courierActiveControlTitle}>
                                Status Operacional (Lote Econômico)
                              </Text>
                              <Text
                                style={[
                                  styles.courierActiveControlSubtitle,
                                  item.courier.is_active
                                    ? styles.courierActiveBadgeText
                                    : styles.courierInactiveBadgeText,
                                ]}
                              >
                                {item.courier.is_active
                                  ? 'Ativo (Apto a receber pedidos)'
                                  : 'Inativo (Bloqueado para distribuição)'}
                              </Text>
                            </View>
                            {updatingCourierId === item.courier.id ? (
                              <ActivityIndicator size="small" color={COLORS.primary} />
                            ) : (
                              <Switch
                                value={Boolean(item.courier.is_active)}
                                onValueChange={() =>
                                  handleToggleCourierActive(item.courier!.id, Boolean(item.courier!.is_active))
                                }
                                trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                                thumbColor={item.courier.is_active ? COLORS.accent : '#64748B'}
                                testID={`admin-toggle-courier-active-${item.courier.id}`}
                              />
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          /* ==================== ABA 2: TODOS OS PEDIDOS ==================== */
          <View>
            {/* Métricas de Pedidos */}
            {orderMetrics && (
              <View style={[styles.metricsGrid, SHADOWS.sm]}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{orderMetrics.total}</Text>
                  <Text style={styles.metricLbl}>Total Pedidos</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={[styles.metricVal, { color: COLORS.primary }]}>
                    {orderMetrics.express}
                  </Text>
                  <Text style={styles.metricLbl}>Expressos</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={[styles.metricVal, { color: '#4F46E5' }]}>
                    {orderMetrics.economic}
                  </Text>
                  <Text style={styles.metricLbl}>Econômicos</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={[styles.metricVal, { color: '#059669' }]}>
                    {orderMetrics.delivered}
                  </Text>
                  <Text style={styles.metricLbl}>Entregues</Text>
                </View>
              </View>
            )}

            {/* Barra de Busca de Pedidos */}
            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por #ID, mercadoria, remetente ou endereço..."
                placeholderTextColor={COLORS.textMuted}
                value={orderSearch}
                onChangeText={setOrderSearch}
                onSubmitEditing={loadOrders}
                returnKeyType="search"
                testID="admin-order-search-input"
              />
              {orderSearch.length > 0 && (
                <TouchableOpacity onPress={() => setOrderSearch('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filtros de Tipo e Status (Chips) */}
            <View style={{ marginBottom: SPACING.md }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {[
                  { key: 'all', label: 'Todos os Tipos', icon: 'layers-outline' },
                  { key: 'express', label: 'Expresso', icon: 'flash' },
                  { key: 'economic', label: 'Econômico', icon: 'leaf' },
                ].map((chip) => {
                  const isSelected = orderTypeFilter === chip.key;
                  return (
                    <TouchableOpacity
                      key={chip.key}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setOrderTypeFilter(chip.key)}
                      activeOpacity={0.7}
                      testID={`admin-order-type-${chip.key}`}
                    >
                      <Ionicons
                        name={chip.icon as any}
                        size={13}
                        color={isSelected ? COLORS.white : COLORS.textMuted}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={[styles.chipsScroll, { marginTop: 6 }]}
              >
                {[
                  { key: 'all', label: 'Todos os Status' },
                  { key: 'pending', label: 'Pendentes' },
                  { key: 'assigned', label: 'Atribuídos' },
                  { key: 'picked_up', label: 'Em Rota' },
                  { key: 'delivered', label: 'Entregues' },
                  { key: 'canceled', label: 'Cancelados' },
                ].map((chip) => {
                  const isSelected = orderStatusFilter === chip.key;
                  return (
                    <TouchableOpacity
                      key={chip.key}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setOrderStatusFilter(chip.key)}
                      activeOpacity={0.7}
                      testID={`admin-order-status-${chip.key}`}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Lista de Pedidos */}
            {isLoadingOrders ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Carregando todos os pedidos do app...</Text>
              </View>
            ) : orders.length === 0 ? (
              <View style={[styles.emptyBox, SHADOWS.sm]} testID="admin-orders-empty">
                <Ionicons name="receipt-outline" size={44} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>Nenhum pedido encontrado</Text>
                <Text style={styles.emptyDesc}>
                  Nenhum pedido atende aos filtros de busca selecionados.
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {orders.map((order) => {
                  const isExpress = order.shipping_type === 'express';
                  const isPending = order.status === 'pending';
                  const isAssigned = order.status === 'assigned';
                  const isPickedUp = order.status === 'picked_up';
                  const isDelivered = order.status === 'delivered';
                  const isCanceled = order.status === 'canceled';

                  const individualPrice = Number(order.individual_freight_price || 0);
                  const finalPrice =
                    order.final_freight_price !== null && order.final_freight_price !== undefined
                      ? Number(order.final_freight_price)
                      : individualPrice;
                  const hasBatchDiscount = !isExpress && finalPrice < individualPrice;

                  return (
                    <View
                      key={order.id}
                      style={[styles.orderCard, SHADOWS.sm]}
                      testID={`admin-order-card-${order.id}`}
                    >
                      {/* Order Header */}
                      <View style={styles.orderCardHeader}>
                        <View style={styles.orderIdBadge}>
                          <Text style={styles.orderIdText}>#{order.id}</Text>
                        </View>
                        <View
                          style={[
                            styles.typeBadge,
                            isExpress ? styles.typeExpressBadge : styles.typeEconomicBadge,
                          ]}
                        >
                          <Ionicons
                            name={isExpress ? 'flash' : 'leaf'}
                            size={11}
                            color={isExpress ? COLORS.warning : COLORS.primary}
                            style={{ marginRight: 3 }}
                          />
                          <Text
                            style={[
                              styles.typeBadgeText,
                              isExpress ? styles.typeExpressText : styles.typeEconomicText,
                            ]}
                          >
                            {isExpress ? 'Expresso' : 'Econômico'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            isPending && styles.statusPendingBadge,
                            (isAssigned || isPickedUp) && styles.statusAssignedBadge,
                            isDelivered && styles.statusDeliveredBadge,
                            isCanceled && styles.statusCanceledBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isPending && styles.statusPendingText,
                              (isAssigned || isPickedUp) && styles.statusAssignedText,
                              isDelivered && styles.statusDeliveredText,
                              isCanceled && styles.statusCanceledText,
                            ]}
                          >
                            {isPending
                              ? 'Pendente'
                              : isAssigned
                              ? 'Atribuído'
                              : isPickedUp
                              ? 'Em Rota'
                              : isDelivered
                              ? 'Entregue'
                              : isCanceled
                              ? 'Cancelado'
                              : order.status}
                          </Text>
                        </View>
                      </View>

                      {/* Package Description & Freight Price */}
                      <View style={styles.orderDescRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.orderDescTitle}>{order.package_description}</Text>
                          <Text style={styles.orderWeightText}>
                            Peso: {order.package_weight_kg} kg • {order.distance_km} km ({order.estimated_duration_minutes} min)
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          {hasBatchDiscount && (
                            <Text style={styles.orderOriginalPriceText}>
                              R$ {individualPrice.toFixed(2)}
                            </Text>
                          )}
                          <Text style={[styles.orderPriceText, hasBatchDiscount && { color: COLORS.accent }]}>
                            R$ {finalPrice.toFixed(2)}
                          </Text>
                          <Text style={styles.orderPriceLabel}>
                            {hasBatchDiscount ? 'Rateio 50/50' : 'Frete'}
                          </Text>
                        </View>
                      </View>

                      {/* Participants: Lojista e Entregador */}
                      <View style={styles.participantsBox}>
                        <View style={styles.participantRow}>
                          <Ionicons name="storefront-outline" size={14} color={COLORS.textSecondary} />
                          <Text style={styles.participantText}>
                            Lojista:{' '}
                            <Text style={styles.participantBold}>
                              {order.client?.business_name || order.client?.user?.name || `Cliente #${order.client_id}`}
                            </Text>
                          </Text>
                        </View>

                        <View style={styles.participantRow}>
                          <Ionicons name="bicycle-outline" size={14} color={COLORS.textSecondary} />
                          <Text style={styles.participantText}>
                            Entregador:{' '}
                            <Text
                              style={[
                                styles.participantBold,
                                !order.courier && { color: COLORS.textMuted },
                              ]}
                            >
                              {order.courier?.user?.name || (isPending ? 'Aguardando atribuição' : 'Não atribuído')}
                            </Text>
                          </Text>
                        </View>
                      </View>

                      {/* Código de Entrega (6 dígitos) ou Comprovante */}
                      {(order.delivery_code || order.proof_photo_url) && (
                        <View style={styles.auditProofRow}>
                          {order.delivery_code && (
                            <View style={styles.auditCodePill}>
                              <Ionicons name="key-outline" size={12} color={COLORS.primary} />
                              <Text style={styles.auditCodeText}>
                                Código: {order.delivery_code}
                              </Text>
                            </View>
                          )}
                          {order.proof_photo_url && (
                            <View style={styles.auditProofPill}>
                              <Ionicons name="shield-checkmark-outline" size={12} color={COLORS.accentDark} />
                              <Text style={styles.auditProofText}>Comprovante Validado</Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Addresses */}
                      <View style={styles.addressesBox}>
                        <View style={styles.addressLine}>
                          <Ionicons name="arrow-up-circle" size={14} color={COLORS.warning} />
                          <Text style={styles.addressText} numberOfLines={1}>
                            {order.origin_address}
                          </Text>
                        </View>
                        <View style={styles.addressLine}>
                          <Ionicons name="arrow-down-circle" size={14} color={COLORS.primary} />
                          <Text style={styles.addressText} numberOfLines={1}>
                            {order.dest_address}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
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
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topBarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  shieldIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  topBarSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  quickSwitchRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  quickSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  quickSwitchText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  batchControlCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    marginBottom: SPACING.lg,
  },
  batchControlHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  batchIconBadge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchControlTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  batchControlSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  batchMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  batchMetricBox: {
    flex: 1,
    alignItems: 'center',
  },
  batchMetricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  batchMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  batchResultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accentLight,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  batchResultTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accentDark,
  },
  batchResultSub: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
    marginTop: 1,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
    padding: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabButtonTextActive: {
    color: COLORS.white,
    fontWeight: '800',
  },
  tabBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  tabBadgeActive: {
    backgroundColor: COLORS.primaryDark,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tabBadgeTextActive: {
    color: COLORS.white,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl * 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: 4,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 48,
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  metricLbl: {
    fontSize: 8.5,
    color: COLORS.textMuted,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  chipsScroll: {
    marginBottom: SPACING.md,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centerBox: {
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
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  listContainer: {
    gap: SPACING.md,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: SPACING.md,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  userAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4F46E5',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  roleClientBadge: {
    backgroundColor: '#EFF6FF',
  },
  roleClientText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
  },
  roleCourierBadge: {
    backgroundColor: '#ECFDF5',
  },
  roleCourierText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  roleAdminBadge: {
    backgroundColor: '#FAF5FF',
  },
  roleAdminText: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '700',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userEmailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
    flexShrink: 1,
  },
  userPhoneText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
    flexShrink: 1,
  },
  extraInfoBox: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  extraInfoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    flexShrink: 1,
  },
  extraInfoSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    flexShrink: 1,
  },
  extraInfoAddress: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    flexShrink: 1,
  },
  courierStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusOnline: {
    backgroundColor: '#10B981',
  },
  statusOffline: {
    backgroundColor: '#9CA3AF',
  },
  courierStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
  courierRadiusText: {
    fontSize: 11,
    color: COLORS.textMuted,
    flexShrink: 0,
  },
  courierActiveControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    gap: 8,
  },
  courierActiveControlTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  courierActiveControlSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  courierActiveBadgeText: {
    color: '#059669',
    fontWeight: '700',
  },
  courierInactiveBadgeText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: SPACING.md,
  },
  orderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
    flexWrap: 'wrap',
  },
  orderIdBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    flexShrink: 0,
  },
  orderIdText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    flexShrink: 0,
  },
  typeExpressBadge: {
    backgroundColor: '#FEF3C7',
  },
  typeExpressText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '700',
  },
  typeEconomicBadge: {
    backgroundColor: '#EEF2FF',
  },
  typeEconomicText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    flexShrink: 0,
  },
  statusPendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  statusPendingText: {
    color: '#B45309',
  },
  statusAssignedBadge: {
    backgroundColor: '#DBEAFE',
  },
  statusAssignedText: {
    color: '#1D4ED8',
  },
  statusDeliveredBadge: {
    backgroundColor: '#D1FAE5',
  },
  statusDeliveredText: {
    color: '#065F46',
  },
  statusCanceledBadge: {
    backgroundColor: COLORS.dangerLight,
  },
  statusCanceledText: {
    color: COLORS.danger,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  orderDescRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  orderDescTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    flexShrink: 1,
  },
  orderWeightText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    flexShrink: 1,
  },
  orderOriginalPriceText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  orderPriceText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    flexShrink: 0,
  },
  orderPriceLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  auditProofRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: 4,
    marginBottom: 2,
  },
  auditCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  auditCodeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  auditProofPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentLight,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  auditProofText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  participantsBox: {
    paddingVertical: SPACING.xs,
    gap: 4,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
    flexShrink: 1,
  },
  participantBold: {
    fontWeight: '700',
    color: COLORS.text,
  },
  addressesBox: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    gap: 4,
  },
  addressLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
