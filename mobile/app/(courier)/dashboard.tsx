import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
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
  }, [fetchDeviceLocation]);

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

        {/* Real-time Map of Courier Current Location & Telemetry */}
        <View style={[styles.mapSectionCard, SHADOWS.sm]} testID="courier-gps-section">
          <View style={styles.mapHeaderRow}>
            <View style={styles.mapHeaderTitleBox}>
              <Ionicons name="navigate-circle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.mapHeaderTitle}>Sua Localização GPS</Text>
            </View>
            <TouchableOpacity
              onPress={fetchDeviceLocation}
              style={styles.recalibrateBtn}
              activeOpacity={0.7}
              disabled={isLocating}
              testID="recalibrate-gps-button"
            >
              {isLocating ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="locate-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.recalibrateBtnText}>Atualizar GPS</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Painel de Telemetria Numérica do GPS em Tempo Real */}
          <View style={styles.telemetryCard}>
            <View style={styles.telemetryHeaderRow}>
              <View style={styles.telemetryStatusBadge}>
                <View style={styles.telemetryStatusDot} />
                <Text style={styles.telemetryStatusText}>GPS Ativo no Dispositivo</Text>
              </View>
              <Text style={styles.telemetrySyncText}>{lastGpsSync}</Text>
            </View>

            <View style={styles.telemetryCoordsRow}>
              <View style={styles.telemetryCoordItem}>
                <Text style={styles.telemetryCoordLabel}>LATITUDE</Text>
                <Text style={styles.telemetryCoordValue}>
                  {deviceLocation.latitude.toFixed(6)}
                </Text>
              </View>
              <View style={styles.telemetryDivider} />
              <View style={styles.telemetryCoordItem}>
                <Text style={styles.telemetryCoordLabel}>LONGITUDE</Text>
                <Text style={styles.telemetryCoordValue}>
                  {deviceLocation.longitude.toFixed(6)}
                </Text>
              </View>
              <View style={styles.telemetryDivider} />
              <View style={styles.telemetryCoordItem}>
                <Text style={styles.telemetryCoordLabel}>POLO</Text>
                <Text style={styles.telemetryCoordValue}>Guarapuava</Text>
              </View>
            </View>
          </View>

          <View style={styles.mapContainer}>
            <RouteMapPreview
              origin={{
                latitude: deviceLocation.latitude,
                longitude: deviceLocation.longitude,
                title: 'Você está aqui',
                description: `GPS: ${deviceLocation.latitude.toFixed(5)}, ${deviceLocation.longitude.toFixed(5)}`,
              }}
              mode="current_location"
              radiusKm={parseFloat(radius) || 5.0}
              height={190}
            />
          </View>

          <View style={styles.mapFooterRow}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.mapFooterText}>
              O radar sintoniza chamados pelo GPS do aparelho num raio de {radius} km em Guarapuava.
            </Text>
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
          <Text style={styles.sectionTitle}>Ações de Despacho</Text>
        </View>

        <TouchableOpacity
          style={[styles.actionCard, SHADOWS.sm]}
          activeOpacity={0.8}
          onPress={handleNavigateRadar}
          testID="courier-radar-preview"
        >
          <View style={[styles.actionIconBox, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="radio" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.actionTextBox}>
            <Text style={styles.actionTitle}>Radar de Entregas Expressas</Text>
            <Text style={styles.actionSubtitle}>
              Dispute chamados urgentes com trava anti-conflito.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, SHADOWS.sm]}
          activeOpacity={0.8}
          testID="courier-routes-preview"
        >
          <View style={[styles.actionIconBox, { backgroundColor: '#F3F4F6' }]}>
            <Ionicons name="map-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <View style={styles.actionTextBox}>
            <Text style={styles.actionTitle}>Agenda de Lotes & Multi-paradas</Text>
            <Text style={styles.actionSubtitle}>
              Visualize itinerários e transborde para Google Maps / Waze.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Admin Switcher */}
        {role === 'admin' && (
          <View style={[styles.adminSwitcherCard, SHADOWS.sm]}>
            <Text style={styles.adminSwitcherTitle}>Painel de Alternância Admin</Text>
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
  },
  vehicleInfo: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  cnhInfo: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  statusToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statusIndicatorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
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
    backgroundColor: '#F5F3FF',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  adminSwitcherTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6D28D9',
    marginBottom: 4,
  },
  adminSwitcherDesc: {
    fontSize: 12,
    color: '#7C3AED',
    marginBottom: SPACING.md,
  },
  adminSwitchBtn: {
    borderColor: '#6D28D9',
  },
  logoutButton: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xxl,
  },
});
