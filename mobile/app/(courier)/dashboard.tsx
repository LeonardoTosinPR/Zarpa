import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';

export default function CourierDashboardScreen() {
  const router = useRouter();
  const { user, logout, role } = useAuth();

  const [isOnline, setIsOnline] = useState<boolean>(user?.courier?.is_online ?? true);

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
              <Text style={styles.roleBadgeText}>🛵 Entregador / Condutor</Text>
            </View>
            {user?.role === 'admin' && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>👑 Admin Master</Text>
              </View>
            )}
          </View>

          <Text style={styles.courierName}>{courierName}</Text>
          <Text style={styles.vehicleInfo}>
            Veículo: {vehicle} {plate !== 'Sem placa' ? `• Placa: ${plate}` : ''}
          </Text>
          <Text style={styles.cnhInfo}>CNH: {cnh} • Raio: {radius} km</Text>

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
              onValueChange={setIsOnline}
              trackColor={{ false: COLORS.border, true: '#A7F3D0' }}
              thumbColor={isOnline ? COLORS.accent : '#9CA3AF'}
              testID="courier-online-switch"
            />
          </View>
        </View>

        {/* Route / Earnings Preview (Figma Card Style) */}
        <View style={[styles.routePreviewCard, SHADOWS.sm]}>
          <Text style={styles.routePreviewHeader}>Rota Programada de Hoje</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Ganhos Estimados</Text>
              <Text style={styles.metricValuePrimary}>R$ 85,00</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Distância Total</Text>
              <Text style={styles.metricValue}>12 km</Text>
            </View>
          </View>
        </View>

        {/* Action Shortcuts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ações de Despacho (Condutor)</Text>
        </View>

        <TouchableOpacity
          style={[styles.actionCard, SHADOWS.sm]}
          activeOpacity={0.8}
          testID="courier-radar-preview"
        >
          <View style={[styles.actionIconBox, { backgroundColor: COLORS.accentLight }]}>
            <Text style={styles.actionIcon}>🧭</Text>
          </View>
          <View style={styles.actionTextBox}>
            <Text style={styles.actionTitle}>Radar de Entregas Expressas</Text>
            <Text style={styles.actionSubtitle}>
              Dispute chamados urgentes com trava anti-conflito.
            </Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, SHADOWS.sm]}
          activeOpacity={0.8}
          testID="courier-routes-preview"
        >
          <View style={styles.actionIconBox}>
            <Text style={styles.actionIcon}>🗺️</Text>
          </View>
          <View style={styles.actionTextBox}>
            <Text style={styles.actionTitle}>Agenda de Lotes & Multi-paradas</Text>
            <Text style={styles.actionSubtitle}>
              Visualize itinerários e transborde para Google Maps / Waze.
            </Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        {/* Admin Switcher (If Admin) */}
        {role === 'admin' && (
          <View style={[styles.adminSwitcherCard, SHADOWS.sm]}>
            <Text style={styles.adminSwitcherTitle}>👑 Painel de Alternância Admin</Text>
            <Text style={styles.adminSwitcherDesc}>
              Como administrador, você pode inspecionar o dashboard do lojista.
            </Text>
            <Button
              title="Visualizar Dashboard do Lojista"
              variant="secondary"
              onPress={() => router.push('/(client)/dashboard')}
              style={styles.adminSwitchBtn}
              testID="admin-switch-to-client"
            />
          </View>
        )}

        {/* Logout Button */}
        <Button
          title="Encerrar Sessão (Sair)"
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
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: SPACING.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  roleBadge: {
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
    backgroundColor: '#F5F3FF',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  courierName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  cnhInfo: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  statusToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statusIndicatorBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.sm,
  },
  statusDotOnline: {
    backgroundColor: COLORS.accent,
  },
  statusDotOffline: {
    backgroundColor: '#9CA3AF',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusTextOnline: {
    color: COLORS.accentDark,
  },
  statusTextOffline: {
    color: COLORS.textMuted,
  },
  routePreviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
  },
  routePreviewHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  metricValuePrimary: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.accent,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },
  sectionHeader: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionTextBox: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionArrow: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  adminSwitcherCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#C4B5FD',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  adminSwitcherTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6D28D9',
    marginBottom: 2,
  },
  adminSwitcherDesc: {
    fontSize: 12,
    color: '#4C1D95',
    marginBottom: SPACING.sm,
  },
  adminSwitchBtn: {
    height: 42,
  },
  logoutButton: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
});
