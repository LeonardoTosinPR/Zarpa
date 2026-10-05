declare module 'expo-leaflet' {
  import React from 'react';
  import { StyleProp, ViewStyle } from 'react-native';

  export interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  export type MapLayerType =
    | 'ImageOverlay'
    | 'TileLayer'
    | 'VectorLayer'
    | 'VideoOverlay'
    | 'WMSTileLayer';

  export interface MapLayer {
    attribution?: string;
    baseLayer?: boolean;
    baseLayerIsChecked?: boolean;
    baseLayerName?: string;
    bounds?: any;
    id?: string;
    layerType?: MapLayerType;
    opacity?: number;
    pane?: string;
    subLayer?: string;
    url?: string;
    zIndex?: number;
  }

  export interface MapMarker {
    icon: string;
    iconAnchor?: [number, number];
    id: string;
    position: LatLngLiteral;
    size?: [number, number];
    title?: string;
  }

  export type MapShape = {
    id?: string;
    shapeType: 'circle' | 'circleMarker' | 'polygon' | 'polyline' | 'rectangle';
    color?: string;
    [key: string]: any;
  };

  export type LeafletWebViewEvent =
    | { tag: 'DebugMessage'; message: string }
    | { tag: 'DocumentEventListenerAdded' }
    | { tag: 'DocumentEventListenerRemoved' }
    | { tag: 'Error'; error: any }
    | { tag: 'WindowEventListenerAdded' }
    | { tag: 'WindowEventListenerRemoved' }
    | { tag: 'MapReady'; version: string }
    | { tag: 'MapComponentMounted'; version: string }
    | { tag: 'onMapClicked'; location: LatLngLiteral }
    | { tag: 'onMapMarkerClicked'; mapMarkerId: string }
    | { tag: string; [key: string]: any };

  export interface ExpoLeafletProps {
    backgroundColor?: string;
    loadingIndicator?: () => React.ReactElement;
    onMessage: (message: LeafletWebViewEvent) => void;
    onMapLoad?: () => void;
    mapCenterPosition?: LatLngLiteral;
    mapLayers?: MapLayer[];
    mapMarkers?: MapMarker[];
    mapShapes?: MapShape[];
    mapOptions?: any;
    maxZoom?: number;
    zoom?: number;
    style?: StyleProp<ViewStyle>;
  }

  export const ExpoLeaflet: React.FC<ExpoLeafletProps>;
}
