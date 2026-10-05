import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import {
  ExpoLeaflet,
  MapLayer,
  MapMarker,
  MapShape,
  LeafletWebViewEvent,
} from 'expo-leaflet';

// Ícone SVG padrão (marcador clássico em vermelho compatível com Leaflet)
export const DEFAULT_MAP_PIN_ICON = `<svg stroke="currentColor" fill="red" stroke-width="0" viewBox="0 0 384 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"></path></svg>`;

export const DEFAULT_OPENSTREETMAP_LAYER: MapLayer = {
  baseLayerName: 'OpenStreetMap',
  baseLayerIsChecked: true,
  layerType: 'TileLayer',
  baseLayer: true,
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
};

// Coordenadas padrão de Guarapuava - PR
export const GUARAPUAVA_DEFAULT_COORDS = {
  lat: -25.3954,
  lng: -51.4641,
};

export interface MyMapProps {
  mapCenterPosition?: { lat: number; lng: number };
  zoom?: number;
  mapLayers?: MapLayer[];
  mapMarkers?: MapMarker[];
  mapShapes?: MapShape[];
  onMessage?: (message: LeafletWebViewEvent) => void;
  onMapClicked?: (coords: { lat: number; lng: number }) => void;
  onMarkerClicked?: (markerId: string) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Componente MyMap baseado no modelo do orientador (Prof. Andres Jessé Porfirio)
 * Repositório de referência: https://github.com/university-lessons/pdm-ts-maps-leaflet
 * 
 * Utiliza o OpenStreetMap renderizado via WebView através da biblioteca expo-leaflet,
 * eliminando a exigência de faturamento/chaves proprietárias da Google e mantendo total
 * compatibilidade multiplataforma.
 */
export default function MyMap({
  mapCenterPosition = GUARAPUAVA_DEFAULT_COORDS,
  zoom = 15,
  mapLayers,
  mapMarkers,
  mapShapes,
  onMessage,
  onMapClicked,
  onMarkerClicked,
  style,
  testID = 'mock-map-view',
}: MyMapProps = {}) {
  const activeLayers: MapLayer[] = mapLayers ?? [DEFAULT_OPENSTREETMAP_LAYER];

  const defaultMarkers: MapMarker[] = [
    {
      id: '1',
      position: mapCenterPosition,
      icon: DEFAULT_MAP_PIN_ICON,
      size: [32, 32],
    },
  ];

  const defaultShapes: MapShape[] = [
    {
      shapeType: 'circle',
      id: '1',
      center: mapCenterPosition,
      radius: 500,
      pathOptions: { color: 'blue' },
    } as any,
  ];

  const activeMarkers = mapMarkers ?? (mapMarkers === undefined && mapShapes === undefined ? defaultMarkers : []);
  const activeShapes = mapShapes ?? (mapMarkers === undefined && mapShapes === undefined ? defaultShapes : []);

  const handleMessage = (msg: LeafletWebViewEvent) => {
    if (onMessage) {
      onMessage(msg);
    }

    if (msg.tag === 'onMapClicked' && onMapClicked) {
      onMapClicked(msg.location);
    }

    if (msg.tag === 'onMapMarkerClicked' && onMarkerClicked) {
      onMarkerClicked(msg.mapMarkerId);
    }
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      <ExpoLeaflet
        mapLayers={activeLayers}
        mapCenterPosition={mapCenterPosition}
        mapMarkers={activeMarkers}
        mapShapes={activeShapes}
        onMessage={handleMessage}
        zoom={zoom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
});
