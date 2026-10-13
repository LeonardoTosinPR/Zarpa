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
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { Header } from '../components/Header';
import {
  adminService,
  AdminUserItem,
  AdminUsersMetrics,
  AdminOrderItem,
  AdminOrdersMetrics,
} from '../services/adminService';

type AdminTab = 'users' | 'orders';

export function AdminPanelScreen() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

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
    if (activeTab === 'users') {
      loadUsers();
    } else {
      loadOrders();
    }
  }, [activeTab, loadUsers, loadOrders]);

  const onRefresh = () => {
    setIsRefreshing(true);
    if (activeTab === 'users') {
      loadUsers();
    } else {
      loadOrders();
    }
  };

  return (
    <View style={styles.container}>
      <Header />

      {/* Admin Title Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarTitleRow}>
          <View style={styles.shieldIconBox}>
            <Ionicons name="shield-checkmark" size={18} color="#7C3AED" />
          </View>
          <View>
            <Text style={styles.topBarTitle}>Painel Administrativo Master</Text>
            <Text style={styles.topBarSubtitle}>Auditoria e Gestão Operacional Global</Text>
          </View>
        </View>
      </View>

      {/* Main Tab Switcher: Usuários vs Todos os Pedidos com fundo escuro */}
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
            color={activeTab === 'users' ? '#60A5FA' : '#94A3B8'}
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
            color={activeTab === 'orders' ? '#F59E0B' : '#94A3B8'}
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
                          <Text style={styles.userPhoneText}>📞 {item.phone || 'Sem telefone'}</Text>
                        </View>
                      </View>

                      {/* Informações Específicas do Perfil */}
                      {isClient && item.client && (
                        <View style={styles.extraInfoBox}>
                          <Text style={styles.extraInfoTitle}>
                            🏢 {item.client.business_name}
                          </Text>
                          <Text style={styles.extraInfoSub}>
                            CNPJ/CPF: {item.client.cnpj_cpf}
                          </Text>
                          <Text style={styles.extraInfoAddress} numberOfLines={2}>
                            📍 {item.client.default_address}
                          </Text>
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
                          <Text style={styles.extraInfoSub}>
                            🛵 Veículo: {item.courier.vehicle_type} • Placa: {item.courier.vehicle_plate}
                          </Text>
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
                                  ? '✓ Ativo (Apto a receber pedidos)'
                                  : '✕ Inativo (Bloqueado para distribuição)'}
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
                  { key: 'all', label: 'Todos os Tipos' },
                  { key: 'express', label: '⚡ Expresso' },
                  { key: 'economic', label: '🌙 Econômico' },
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
                  const isDelivered = order.status === 'delivered';

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
                          <Text
                            style={[
                              styles.typeBadgeText,
                              isExpress ? styles.typeExpressText : styles.typeEconomicText,
                            ]}
                          >
                            {isExpress ? '⚡ Expresso' : '🌙 Econômico'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            isPending && styles.statusPendingBadge,
                            isAssigned && styles.statusAssignedBadge,
                            isDelivered && styles.statusDeliveredBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isPending && styles.statusPendingText,
                              isAssigned && styles.statusAssignedText,
                              isDelivered && styles.statusDeliveredText,
                            ]}
                          >
                            {isPending
                              ? 'Pendente'
                              : isAssigned
                              ? 'Atribuído'
                              : isDelivered
                              ? 'Entregue'
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
                          <Text style={styles.orderPriceText}>
                            R$ {Number(order.final_freight_price || order.individual_freight_price).toFixed(2)}
                          </Text>
                          <Text style={styles.orderPriceLabel}>Frete</Text>
                        </View>
                      </View>

                      {/* Participants: Lojista e Entregador */}
                      <View style={styles.participantsBox}>
                        <View style={styles.participantRow}>
                          <Ionicons name="storefront-outline" size={14} color="#64748B" />
                          <Text style={styles.participantText}>
                            Lojista:{' '}
                            <Text style={styles.participantBold}>
                              {order.client?.business_name || order.client?.user?.name || `Cliente #${order.client_id}`}
                            </Text>
                          </Text>
                        </View>

                        <View style={styles.participantRow}>
                          <Ionicons name="bicycle-outline" size={14} color="#64748B" />
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

                      {/* Addresses */}
                      <View style={styles.addressesBox}>
                        <View style={styles.addressLine}>
                          <Ionicons name="arrow-up-circle" size={14} color="#D97706" />
                          <Text style={styles.addressText} numberOfLines={1}>
                            {order.origin_address}
                          </Text>
                        </View>
                        <View style={styles.addressLine}>
                          <Ionicons name="arrow-down-circle" size={14} color="#2563EB" />
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topBarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  shieldIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6B21A8',
  },
  topBarSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
    padding: 4,
    borderRadius: RADIUS.md,
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
    backgroundColor: '#1E293B',
    borderBottomWidth: 0,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  tabBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
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
