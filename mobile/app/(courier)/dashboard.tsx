import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { ActionCard } from '../../src/components/ActionCard';
import { MetricCard } from '../../src/components/MetricCard';

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
            <Badge
              label="Entregador / Condutor"
              variant="accent"
              iconName="bicycle"
              size="sm"
            />
            {user?.role === 'admin' && (
              <Badge
                label="Admin Master"
                variant="purple"
                iconName="shield-checkmark"
                size="sm"
              />
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
              trackColor={{ false: COLORS.border, true: COLORS.accentBorder }}
              thumbColor={isOnline ? COLORS.accent : COLORS.textMuted}
              testID="courier-online-switch"
            />
          </View>
        </View>

        {/* Route / Earnings Preview (MetricCard Component) */}
        <MetricCard
          title="Rota Programada de Hoje"
          metrics={[
            { label: 'Ganhos Estimados', value: 'R$ 85,00', isPrimary: true },
            { label: 'Distância Total', value: '12 km' },
          ]}
        />

        {/* Action Shortcuts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ações de Despacho (Condutor)</Text>
        </View>

        <ActionCard
          iconName="compass-outline"
          title="Radar de Entregas Expressas"
          subtitle="Dispute chamados urgentes com trava anti-conflito."
          accentIcon
          testID="courier-radar-preview"
        />

        <ActionCard
          iconName="map-outline"
          title="Agenda de Lotes & Multi-paradas"
          subtitle="Visualize itinerários e transborde para Google Maps / Waze."
          testID="courier-routes-preview"
        />

        {/* Admin Switcher (If Admin) */}
        {role === 'admin' && (
          <View style={[styles.adminSwitcherCard, SHADOWS.sm]}>
            <View style={styles.adminHeader}>
              <Ionicons name="shield-outline" size={16} color={COLORS.purpleDark} />
              <Text style={styles.adminSwitcherTitle}>Painel de Alternância Admin</Text>
            </View>
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
          iconName="log-out-outline"
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
    borderColor: COLORS.accentBorder,
    marginBottom: SPACING.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  courierName: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: COLORS.text,
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  cnhInfo: {
    fontSize: TYPOGRAPHY.size.sm,
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
    backgroundColor: COLORS.textMuted,
  },
  statusText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  statusTextOnline: {
    color: COLORS.accentDark,
  },
  statusTextOffline: {
    color: COLORS.textMuted,
  },
  sectionHeader: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
  },
  adminSwitcherCard: {
    backgroundColor: COLORS.purpleLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.purpleBorder,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  adminSwitcherTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.purpleDark,
  },
  adminSwitcherDesc: {
    fontSize: TYPOGRAPHY.size.xs,
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
