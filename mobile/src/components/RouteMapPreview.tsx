import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
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

interface MapTileItem {
  key: string;
  url: string;
  left: number;
  top: number;
}

// Projeção Mercator para cálculo determinístico de tiles e posicionamento em pixels
function calculateMapTiles(
  centerLat: number,
  centerLng: number,
  zoom: number,
  containerWidth: number,
  containerHeight: number
) {
  const n = Math.pow(2, zoom);
  const xExact = ((centerLng + 180) / 360) * n;
  const latRad = (centerLat * Math.PI) / 180;
  const yExact = ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n;

  const centerTileX = Math.floor(xExact);
  const centerTileY = Math.floor(yExact);

  const offsetX = (xExact - centerTileX) * 256;
  const offsetY = (yExact - centerTileY) * 256;

  const centerTileLeft = containerWidth / 2 - offsetX;
  const centerTileTop = containerHeight / 2 - offsetY;

  const tiles: MapTileItem[] = [];
  // Grade 3x3 de tiles (768x768 pixels) cobrindo todo o viewport do mapa diretamente via OpenStreetMap (OSM)
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const tx = centerTileX + dx;
      const ty = centerTileY + dy;
      tiles.push({
        key: `${zoom}-${tx}-${ty}`,
        url: `https://tile.openstreetmap.de/${zoom}/${tx}/${ty}.png`,
        left: centerTileLeft + dx * 256,
        top: centerTileTop + dy * 256,
      });
    }
  }

  // Metros por pixel no paralelo da latitude central
  const metersPerPixel = (40075016.686 * Math.cos(latRad)) / (256 * n);

  const toPixelXY = (targetLat: number, targetLng: number) => {
    const txExact = ((targetLng + 180) / 360) * n;
    const tLatRad = (targetLat * Math.PI) / 180;
    const tyExact = ((1 - Math.asinh(Math.tan(tLatRad)) / Math.PI) / 2) * n;
    return {
      x: centerTileLeft + (txExact - centerTileX) * 256,
      y: centerTileTop + (tyExact - centerTileY) * 256,
    };
  };

  return { tiles, metersPerPixel, toPixelXY };
}

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

  const [zoom, setZoom] = useState<number>(isCurrentLocation ? 15 : 14);
  const [containerWidth, setContainerWidth] = useState<number>(360);
  const [containerHeight, setContainerHeight] = useState<number>(height ?? 230);

  useEffect(() => {
    if (height) {
      setContainerHeight(height);
    }
  }, [height]);

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

  const { tiles, metersPerPixel, toPixelXY } = useMemo(() => {
    return calculateMapTiles(centerLat, centerLng, zoom, containerWidth, containerHeight);
  }, [centerLat, centerLng, zoom, containerWidth, containerHeight]);

  const originPixel = origin ? toPixelXY(origin.latitude, origin.longitude) : null;
  const destPixel = destination ? toPixelXY(destination.latitude, destination.longitude) : null;
  const radiusPx = (radiusKm * 1000) / metersPerPixel;

  // =========================================================================
  // RENDERIZAÇÃO WEB VIA LEAFLET / OPENSTREETMAP (Navegadores Desktop e Web)
  // =========================================================================
  if (Platform.OS === 'web') {
    const webCenterLat = origin?.latitude ?? destination?.latitude ?? GUARAPUAVA_DEFAULT_REGION.latitude;
    const webCenterLng = origin?.longitude ?? destination?.longitude ?? GUARAPUAVA_DEFAULT_REGION.longitude;
    const webZoom = isCurrentLocation ? 15 : origin && destination ? 13 : origin || destination ? 14 : 13;

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
              var map = L.map('map', { zoomControl: false }).setView([${webCenterLat}, ${webCenterLng}], ${webZoom});
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

    const mapHeightStyle =
      height !== undefined
        ? { height }
        : borderless
        ? { flex: 1, height: '100%' as any }
        : { height: 230 };

    return (
      <View
        style={[
          styles.container,
          borderless ? styles.containerBorderless : SHADOWS.md,
          mapHeightStyle,
        ]}
        testID="web-map-preview-container"
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

        {/* Legenda (Apenas para rotas com destino) */}
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

  const mapHeightStyle =
    height !== undefined
      ? { height }
      : borderless
      ? { flex: 1, height: '100%' as any }
      : { height: 230 };

  // =========================================================================
  // RENDERIZAÇÃO MOBILE NATIVA DE ALTA PERFORMANCE (Android & iOS)
  // Sem dependência de chave paga da Google e compatível com New Architecture
  // =========================================================================
  return (
    <View
      style={[
        styles.container,
        borderless ? styles.containerBorderless : SHADOWS.md,
        mapHeightStyle,
      ]}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (w > 0 && Math.abs(w - containerWidth) > 1) {
          setContainerWidth(w);
        }
        if (h > 0 && Math.abs(h - containerHeight) > 1) {
          setContainerHeight(h);
        }
      }}
      testID="mock-map-view"
    >
      {/* 1. Base Canvas Background com Linhas de Grade e Bússola */}
      <View style={styles.baseCanvas}>
        <View style={styles.canvasCrosshairHorizontal} />
        <View style={styles.canvasCrosshairVertical} />
      </View>

      {/* 2. Grade 3x3 de Tiles Nativos OpenStreetMap (OSM) */}
      {tiles.map((tile) => (
        <Image
          key={tile.key}
          source={{
            uri: tile.url,
            headers: {
              'User-Agent': 'ZarpaApp-Guarapuava/1.0 (contato@zarpa.com.br)',
            },
          }}
          style={[
            styles.tileImage,
            {
              left: tile.left,
              top: tile.top,
            },
          ]}
          resizeMode="cover"
        />
      ))}

      {/* 3. Círculo do Raio de Radar do Entregador */}
      {isCurrentLocation && originPixel && (
        <View
          style={[
            styles.radarCircle,
            {
              left: originPixel.x - radiusPx,
              top: originPixel.y - radiusPx,
              width: radiusPx * 2,
              height: radiusPx * 2,
              borderRadius: radiusPx,
            },
          ]}
        />
      )}

      {/* 4. Linha Conectora de Rota (Modo Entrega com Origem e Destino) */}
      {!isCurrentLocation && originPixel && destPixel && (
        <View
          style={[
            styles.routeConnectorLine,
            {
              left: Math.min(originPixel.x, destPixel.x),
              top: Math.min(originPixel.y, destPixel.y),
              width: Math.max(Math.abs(destPixel.x - originPixel.x), 2),
              height: Math.max(Math.abs(destPixel.y - originPixel.y), 2),
            },
          ]}
        />
      )}

      {/* 5. Pino do Entregador (Modo Localização Atual) */}
      {isCurrentLocation && originPixel && (
        <View
          style={[
            styles.courierPinContainer,
            { left: originPixel.x - 18, top: originPixel.y - 36 },
          ]}
        >
          <View style={styles.courierPinBubble}>
            <Ionicons name="bicycle" size={16} color="#FFFFFF" />
          </View>
          <View style={styles.courierPinPointer} />
          <View style={styles.courierPinPulse} />
        </View>
      )}

      {/* 6. Marcadores de Coleta e Entrega (Modo Rota) */}
      {!isCurrentLocation && originPixel && (
        <View
          style={[
            styles.routePinContainer,
            { left: originPixel.x - 14, top: originPixel.y - 32 },
          ]}
        >
          <Ionicons name="location" size={28} color="#059669" />
          <View style={styles.pinTooltip}>
            <Text style={styles.pinTooltipText}>Coleta</Text>
          </View>
        </View>
      )}

      {!isCurrentLocation && destPixel && (
        <View
          style={[
            styles.routePinContainer,
            { left: destPixel.x - 14, top: destPixel.y - 32 },
          ]}
        >
          <Ionicons name="location" size={28} color="#DC2626" />
          <View style={[styles.pinTooltip, { backgroundColor: '#DC2626' }]}>
            <Text style={styles.pinTooltipText}>Entrega</Text>
          </View>
        </View>
      )}

      {/* 7. Controles Flutuantes de Zoom e Recentralização */}
      <View style={styles.zoomControlsBox}>
        <TouchableOpacity
          style={styles.zoomBtn}
          onPress={() => setZoom((z) => Math.min(18, z + 1))}
          activeOpacity={0.7}
          testID="map-zoom-in-btn"
        >
          <Ionicons name="add" size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.zoomDivider} />
        <TouchableOpacity
          style={styles.zoomBtn}
          onPress={() => setZoom((z) => Math.max(12, z - 1))}
          activeOpacity={0.7}
          testID="map-zoom-out-btn"
        >
          <Ionicons name="remove" size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.zoomDivider} />
        <TouchableOpacity
          style={styles.zoomBtn}
          onPress={() => setZoom(isCurrentLocation ? 15 : 14)}
          activeOpacity={0.7}
          testID="map-recenter-btn"
        >
          <Ionicons name="locate" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* 8. Badge Superior de Telemetria GPS */}
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

      {/* 9. Badge Inferior de Status ou Legenda */}
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

      {/* 10. Tag de Atribuição Cartográfica Oficial OpenStreetMap */}
      <View style={styles.attributionTag}>
        <Text style={styles.attributionText}>© OpenStreetMap</Text>
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
  baseCanvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasCrosshairHorizontal: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
  },
  canvasCrosshairVertical: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
  },
  tileImage: {
    position: 'absolute',
    width: 256,
    height: 256,
  },
  radarCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(30, 58, 138, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(30, 58, 138, 0.45)',
    borderStyle: 'dashed',
    zIndex: 5,
  },
  routeConnectorLine: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    zIndex: 4,
  },
  courierPinContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
    width: 36,
    height: 36,
  },
  courierPinBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...SHADOWS.md,
  },
  courierPinPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 0,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.primary,
    marginTop: -1,
  },
  courierPinPulse: {
    width: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(30, 58, 138, 0.3)',
    marginTop: 2,
  },
  routePinContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  pinTooltip: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: -4,
  },
  pinTooltipText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  zoomControlsBox: {
    position: 'absolute',
    right: SPACING.sm,
    top: '30%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 15,
    ...SHADOWS.sm,
  },
  zoomBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    width: '100%',
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
