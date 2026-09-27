import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
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

export function RouteMapPreview({
  origin,
  destination,
  polyline,
  height = 220,
}: RouteMapPreviewProps) {
  const mapRef = useRef<MapView | null>(null);

  const routeCoordinates: LatLng[] = polyline ? decodePolyline(polyline) : [];

  // Centraliza o mapa em Guarapuava - PR como padrão
  const initialRegion = {
    latitude: origin?.latitude || -25.3954,
    longitude: origin?.longitude || -51.4641,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  useEffect(() => {
    if (mapRef.current && origin && destination) {
      const markersToFit = [
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: destination.latitude, longitude: destination.longitude },
        ...routeCoordinates,
      ];

      setTimeout(() => {
        mapRef.current?.fitToCoordinates(markersToFit, {
          edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
          animated: true,
        });
      }, 300);
    }
  }, [origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude, polyline]);

  if (!origin && !destination) {
    return (
      <View style={[styles.placeholderContainer, { height }, SHADOWS.sm]}>
        <View style={styles.placeholderPill}>
          <Text style={styles.placeholderPillText}>Traçado de Rota</Text>
        </View>
        <Text style={styles.placeholderTitle}>Pré-visualização da Rota</Text>
        <Text style={styles.placeholderSubtitle}>
          Defina o ponto de coleta e endereço de entrega para traçar a rota viária em Guarapuava.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }, SHADOWS.md]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {/* Marcador A: Origem / Loja */}
        {origin && (
          <Marker
            coordinate={{ latitude: origin.latitude, longitude: origin.longitude }}
            title={origin.title || 'Origem (Coleta)'}
            description={origin.description || 'Ponto de partida'}
            pinColor="#059669" // Emerald green
          />
        )}

        {/* Marcador B: Destino / Cliente */}
        {destination && (
          <Marker
            coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
            title={destination.title || 'Destino (Entrega)'}
            description={destination.description || 'Ponto de entrega'}
            pinColor="#DC2626" // Red
          />
        )}

        {/* Traçado Viário OSRM */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={COLORS.primary}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

      <View style={styles.mapLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
          <Text style={styles.legendText}>Coleta</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
          <Text style={styles.legendText}>Entrega</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.legendText}>Rota OSRM</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    marginVertical: SPACING.md,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholderContainer: {
    width: '100%',
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    marginVertical: SPACING.md,
  },
  placeholderPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.xs,
  },
  placeholderPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  placeholderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  placeholderSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  mapLegend: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
    alignItems: 'center',
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
