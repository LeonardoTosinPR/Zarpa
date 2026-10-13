import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ExpoLeaflet, MapLayer, MapMarker, MapShape } from 'expo-leaflet';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { decodePolyline, LatLng } from '../utils/polyline';

export interface RoutePoint {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
}

export interface RouteMapPreviewProps {
  origin?: RoutePoint | null;
  destination?: RoutePoint | null;
  polyline?: string | null;
  height?: number;
  mode?: 'route' | 'current_location';
  radiusKm?: number;
  borderless?: boolean;
}

// Coordenadas centrais oficiais e delimitações de Guarapuava - PR
export const GUARAPUAVA_DEFAULT_REGION = {
  latitude: -25.3954,
  longitude: -51.4641,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Camada base oficial OpenStreetMap (OSM) via Leaflet
const OSM_MAP_LAYER: MapLayer = {
  baseLayerName: 'OpenStreetMap',
  baseLayerIsChecked: true,
  layerType: 'TileLayer',
  baseLayer: true,
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
};

// Ícones SVG para os marcadores Leaflet (Compatíveis com WebView e Leaflet)
const COURIER_PIN_SVG = `<svg stroke="currentColor" fill="#1E3A8A" stroke-width="0" viewBox="0 0 384 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"></path></svg>`;
const ORIGIN_PIN_SVG = `<svg stroke="currentColor" fill="#059669" stroke-width="0" viewBox="0 0 384 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"></path></svg>`;
const DEST_PIN_SVG = `<svg stroke="currentColor" fill="#DC2626" stroke-width="0" viewBox="0 0 384 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"></path></svg>`;

export function RouteMapPreview({
  origin,
  destination,
  polyline,
  height,
  mode,
  radiusKm = 5.0,
  borderless = false,
}: RouteMapPreviewProps) {
  // Identifica se o mapa está exibindo exclusivamente a posição do condutor
  const isCurrentLocation =
    mode === 'current_location' || (Boolean(origin) && !destination && !polyline);

  const routeCoordinates: LatLng[] = useMemo(() => {
    return polyline ? decodePolyline(polyline) : [];
  }, [polyline]);

  const centerLat = useMemo(() => {
    if (origin && destination && !isCurrentLocation) {
      return (origin.latitude + destination.latitude) / 2;
    }
    return origin?.latitude ?? destination?.latitude ?? GUARAPUAVA_DEFAULT_REGION.latitude;
  }, [origin, destination, isCurrentLocation]);

  const centerLng = useMemo(() => {
    if (origin && destination && !isCurrentLocation) {
      return (origin.longitude + destination.longitude) / 2;
    }
    return origin?.longitude ?? destination?.longitude ?? GUARAPUAVA_DEFAULT_REGION.longitude;
  }, [origin, destination, isCurrentLocation]);

  const zoom = isCurrentLocation ? 15 : origin && destination ? 13 : 14;

  // Marcadores Leaflet
  const mapMarkers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [];

    if (origin) {
      list.push({
        id: isCurrentLocation ? 'courier-loc' : 'origin-loc',
        position: { lat: origin.latitude, lng: origin.longitude },
        icon: isCurrentLocation ? COURIER_PIN_SVG : ORIGIN_PIN_SVG,
        size: [32, 32],
        title: isCurrentLocation ? 'Você está aqui' : (origin.title || 'Coleta'),
      });
    }

    if (!isCurrentLocation && destination) {
      list.push({
        id: 'dest-loc',
        position: { lat: destination.latitude, lng: destination.longitude },
        icon: DEST_PIN_SVG,
        size: [32, 32],
        title: destination.title || 'Entrega',
      });
    }

    return list;
  }, [origin, destination, isCurrentLocation]);

  // Formas Leaflet (Círculo de radar e polilinha de rota OSRM)
  const mapShapes = useMemo<MapShape[]>(() => {
    const shapes: MapShape[] = [];

    if (isCurrentLocation && origin) {
      shapes.push({
        shapeType: 'circle',
        id: 'radar-radius-circle',
        center: { lat: origin.latitude, lng: origin.longitude },
        radius: (radiusKm ?? 5.0) * 1000,
        pathOptions: {
          color: '#1E3A8A',
          fillColor: '#1E3A8A',
          fillOpacity: 0.12,
          weight: 2,
        },
      } as any);
    }

    if (routeCoordinates.length > 0) {
      shapes.push({
        shapeType: 'polyline',
        id: 'route-polyline',
        positions: routeCoordinates.map((c) => [c.latitude, c.longitude]),
        pathOptions: {
          color: '#1E3A8A',
          weight: 4,
          opacity: 0.85,
        },
      } as any);
    }

    return shapes;
  }, [isCurrentLocation, origin, radiusKm, routeCoordinates]);

  const mapHeightStyle =
    height !== undefined
      ? { height }
      : borderless
      ? { flex: 1, height: '100%' as any }
      : { height: 230 };

  // =========================================================================
  // RENDERIZAÇÃO WEB VIA LEAFLET / OPENSTREETMAP (Navegadores Desktop e Web)
  // =========================================================================
  if (Platform.OS === 'web') {
    const webCenterLat = centerLat;
    const webCenterLng = centerLng;

    const markersJson = JSON.stringify([
      ...(origin
        ? [
            {
              lat: origin.latitude,
              lng: origin.longitude,
              title: isCurrentLocation ? 'Você está aqui' : (origin.title || 'Coleta'),
              color: isCurrentLocation ? '#1E3A8A' : '#059669',
            },
          ]
        : []),
      ...(!isCurrentLocation && destination
        ? [
            {
              lat: destination.latitude,
              lng: destination.longitude,
              title: destination.title || 'Entrega',
              color: '#DC2626',
            },
          ]
        : []),
    ]);

    const polylineCoordsJson = JSON.stringify(
      routeCoordinates.map((c) => [c.latitude, c.longitude])
    );

    const leafletHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #e5e7eb; }
            .leaflet-control-attribution { font-size: 9px; opacity: 0.8; }
            .custom-pin { display: flex; align-items: center; justify-content: center; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            try {
              var map = L.map('map', { zoomControl: false }).setView([${webCenterLat}, ${webCenterLng}], ${zoom});
              L.control.zoom({ position: 'bottomright' }).addTo(map);

              L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap'
              }).addTo(map);

              var markers = ${markersJson};
              var bounds = [];

              markers.forEach(function(m) {
                var icon = L.divIcon({
                  className: 'custom-pin',
                  html: '<div style="background-color:' + m.color + '; width:16px; height:16px; border-radius:50%; border:3px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>',
                  iconSize: [16, 16],
                  iconAnchor: [8, 8]
                });
                var marker = L.marker([m.lat, m.lng], { icon: icon }).addTo(map);
                marker.bindPopup('<b>' + m.title + '</b>');
                bounds.push([m.lat, m.lng]);
              });

              if (${isCurrentLocation && origin ? 'true' : 'false'}) {
                L.circle([${webCenterLat}, ${webCenterLng}], {
                  radius: ${(radiusKm ?? 5.0) * 1000},
                  color: '#1E3A8A',
                  fillColor: '#1E3A8A',
                  fillOpacity: 0.12,
                  weight: 2
                }).addTo(map);
              }

              var routePts = ${polylineCoordsJson};
              if (routePts.length > 0) {
                var polyline = L.polyline(routePts, {
                  color: '#1E3A8A',
                  weight: 4,
                  opacity: 0.9,
                  lineJoin: 'round'
                }).addTo(map);
                routePts.forEach(function(pt) { bounds.push(pt); });
              }

              if (bounds.length > 1) {
                map.fitBounds(bounds, { padding: [30, 30] });
              }
            } catch(e) {
              console.error('Erro ao renderizar Leaflet:', e);
            }
          </script>
        </body>
      </html>
    `;

    return (
      <View
        style={[
          styles.container,
          borderless ? styles.containerBorderless : SHADOWS.md,
          mapHeightStyle,
        ]}
        testID="mock-map-view"
      >
        <iframe
          srcDoc={leafletHtml}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: borderless ? 0 : RADIUS.lg,
          }}
          title="Mapa Guarapuava Zarpa"
        />

        {/* Top Info Banner */}
        <View style={styles.topInfoOverlay}>
          <Ionicons
            name={isCurrentLocation ? 'navigate-circle' : origin && destination ? 'navigate-circle' : 'location'}
            size={14}
            color={COLORS.primary}
          />
          <Text style={styles.topInfoText}>
            {isCurrentLocation && origin
              ? `GPS: ${origin.latitude.toFixed(5)}, ${origin.longitude.toFixed(5)}`
              : isCurrentLocation
              ? 'Sua Localização GPS • Guarapuava - PR'
              : origin && destination
              ? 'Rota viária traçada em Guarapuava - PR'
              : origin
              ? 'Ponto de coleta definido'
              : 'Mapa interativo • Guarapuava - PR'}
          </Text>
        </View>

        {/* Legenda */}
        {!isCurrentLocation && (origin || destination) && (
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
        )}
      </View>
    );
  }

  // =========================================================================
  // RENDERIZAÇÃO MOBILE NATIVA VIA EXPO-LEAFLET + WEBVIEW (Android & iOS)
  // Conforme modelo do orientador (OpenStreetMap via WebView)
  // =========================================================================
  return (
    <View
      style={[
        styles.container,
        borderless ? styles.containerBorderless : SHADOWS.md,
        mapHeightStyle,
      ]}
      testID="mock-map-view"
    >
      <ExpoLeaflet
        mapLayers={[OSM_MAP_LAYER]}
        mapCenterPosition={{ lat: centerLat, lng: centerLng }}
        mapMarkers={mapMarkers}
        mapShapes={mapShapes}
        onMessage={(msg) => {
          if (msg.tag === 'onMapClicked') {
            console.log('Mapa clicado:', msg.location);
          }
        }}
        zoom={zoom}
      />

      {/* Top Info Banner */}
      <View style={styles.topInfoOverlay}>
        <Ionicons
          name={isCurrentLocation ? 'navigate-circle' : origin && destination ? 'navigate-circle' : 'location'}
          size={14}
          color={isCurrentLocation ? COLORS.accentDark : COLORS.primary}
        />
        <Text style={styles.topInfoText}>
          {isCurrentLocation && origin
            ? `GPS Ativo: ${origin.latitude.toFixed(5)}, ${origin.longitude.toFixed(5)}`
            : isCurrentLocation
            ? 'Localização GPS • Guarapuava - PR'
            : origin && destination
            ? 'Rota viária traçada em Guarapuava - PR'
            : origin
            ? 'Ponto de coleta definido'
            : destination
            ? 'Destino definido'
            : 'Guarapuava - PR • Área de Cobertura'}
        </Text>
      </View>

      {/* Legenda ou Status de Radar */}
      {isCurrentLocation && origin ? (
        <View style={styles.currentLocBottomBadge}>
          <Ionicons name="radio-outline" size={13} color={COLORS.accent} />
          <Text style={styles.currentLocBottomText}>
            Guarapuava - PR • Raio: {(radiusKm ?? 5.0).toFixed(1)} km
          </Text>
        </View>
      ) : !isCurrentLocation && (origin || destination) ? (
        <View style={styles.mapLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
            <Text style={styles.legendText}>Coleta</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
            <Text style={styles.legendText}>Entrega</Text>
          </View>
        </View>
      ) : null}

      {/* Tag de Atribuição Cartográfica Oficial OpenStreetMap */}
      <View style={styles.attributionTag}>
        <Text style={styles.attributionText}>© OpenStreetMap (Leaflet)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  containerBorderless: {
    borderRadius: 0,
    borderWidth: 0,
  },
  topInfoOverlay: {
    position: 'absolute',
    top: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 10,
    ...SHADOWS.sm,
  },
  topInfoText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  currentLocBottomBadge: {
    position: 'absolute',
    bottom: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 10,
    ...SHADOWS.sm,
  },
  currentLocBottomText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  mapLegend: {
    position: 'absolute',
    bottom: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 10,
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
  attributionTag: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    zIndex: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  attributionText: {
    fontSize: 8,
    color: '#64748B',
  },
});
