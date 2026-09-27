import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { decodePolyline, LatLng } from '../utils/polyline';

interface RoutePoint {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
}

interface RouteMapPreviewProps {
  origin?: RoutePoint | null;
  destination?: RoutePoint | null;
  polyline?: string | null;
  height?: number;
}

// Coordenadas centrais de Guarapuava - PR
const GUARAPUAVA_DEFAULT_REGION = {
  latitude: -25.3954,
  longitude: -51.4641,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

export function RouteMapPreview({
  origin,
  destination,
  polyline,
  height = 230,
}: RouteMapPreviewProps) {
  const mapRef = useRef<MapView | null>(null);
  const isMapReady = useRef(false);

  const routeCoordinates: LatLng[] = polyline ? decodePolyline(polyline) : [];

  const updateCamera = () => {
    if (!mapRef.current) return;

    if (origin && destination) {
      const markersToFit = [
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: destination.latitude, longitude: destination.longitude },
        ...routeCoordinates,
      ];

      setTimeout(() => {
        mapRef.current?.fitToCoordinates(markersToFit, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }, 100);
    } else if (origin) {
      mapRef.current.animateToRegion(
        {
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500
      );
    } else if (destination) {
      mapRef.current.animateToRegion(
        {
          latitude: destination.latitude,
          longitude: destination.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500
      );
    } else {
      mapRef.current.animateToRegion(GUARAPUAVA_DEFAULT_REGION, 500);
    }
  };

  useEffect(() => {
    if (isMapReady.current) {
      updateCamera();
    }
  }, [
    origin?.latitude,
    origin?.longitude,
    destination?.latitude,
    destination?.longitude,
    polyline,
  ]);

  const mapProvider = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

  return (
    <View style={[styles.container, { height }, SHADOWS.md]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={mapProvider}
        initialRegion={GUARAPUAVA_DEFAULT_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        toolbarEnabled={false}
        loadingEnabled={true}
        loadingIndicatorColor={COLORS.primary}
        loadingBackgroundColor="#F8FAFC"
        onMapReady={() => {
          isMapReady.current = true;
          updateCamera();
        }}
      >
        {/* Marcador A: Origem / Ponto de Coleta */}
        {origin && (
          <Marker
            coordinate={{ latitude: origin.latitude, longitude: origin.longitude }}
            title={origin.title || 'Origem (Coleta)'}
            description={origin.description || 'Ponto de partida'}
            pinColor="#059669" // Verde esmeralda
          />
        )}

        {/* Marcador B: Destino / Ponto de Entrega */}
        {destination && (
          <Marker
            coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
            title={destination.title || 'Destino (Entrega)'}
            description={destination.description || 'Ponto de entrega'}
            pinColor="#DC2626" // Vermelho
          />
        )}

        {/* Traçado Viário OSRM */}
        {routeCoordinates.length > 0 ? (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={COLORS.primary}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        ) : origin && destination ? (
          <Polyline
            coordinates={[
              { latitude: origin.latitude, longitude: origin.longitude },
              { latitude: destination.latitude, longitude: destination.longitude },
            ]}
            strokeColor={COLORS.primaryLight}
            strokeWidth={2}
            lineDashPattern={[6, 4]}
          />
        ) : null}
      </MapView>

      {/* Top Status Overlay Badge */}
      <View style={styles.topInfoOverlay}>
        <Ionicons
          name={
            origin && destination
              ? 'navigate-circle'
              : origin
              ? 'location'
              : 'map-outline'
          }
          size={14}
          color={origin && destination ? COLORS.primary : COLORS.textSecondary}
        />
        <Text style={styles.topInfoText}>
          {origin && destination
            ? 'Rota viária traçada em Guarapuava'
            : origin
            ? 'Coleta definida. Selecione o destino'
            : destination
            ? 'Destino definido. Selecione a coleta'
            : 'Mapa de Guarapuava - Defina coleta e destino'}
        </Text>
      </View>

      {/* Legenda de Pontos do Mapa */}
      <View style={styles.mapLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
          <Text style={styles.legendText}>Coleta</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
          <Text style={styles.legendText}>Entrega</Text>
        </View>
        {origin && destination && (
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.legendText}>Rota OSRM</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    marginVertical: SPACING.md,
    overflow: Platform.OS === 'ios' ? 'hidden' : 'visible',
  },
  map: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.lg,
  },
  topInfoOverlay: {
    position: 'absolute',
    top: SPACING.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
    ...SHADOWS.sm,
  },
  topInfoText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  mapLegend: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLine: {
    width: 14,
    height: 3,
    borderRadius: 1.5,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
