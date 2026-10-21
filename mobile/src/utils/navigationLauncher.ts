import { Linking, Alert, Platform } from 'react-native';

export interface NavigationOptions {
  lat: number;
  lng: number;
  label?: string;
  app?: 'google' | 'waze' | 'ask';
}

export interface NavigationStopPoint {
  lat: number;
  lng: number;
  label?: string;
  sequence?: number;
}

export interface MultiStopNavigationOptions {
  stops: NavigationStopPoint[];
  groupTitle?: string;
  app?: 'google' | 'waze' | 'ask';
}

/**
 * Constrói a URL universal do Google Maps reunindo todas as paradas sequenciadas do lote em uma única rota contínua.
 * A rota parte da posição atual do condutor (origin omitida) e passa por todos os waypoints intermediários até a parada final.
 */
export function buildGoogleMapsMultiStopUrl(stops: NavigationStopPoint[]): string {
  if (stops.length === 0) return '';
  if (stops.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${stops[0].lat},${stops[0].lng}&travelmode=driving&dir_action=navigate`;
  }

  const lastStop = stops[stops.length - 1];
  const waypoints = stops.slice(0, stops.length - 1);
  const waypointsStr = waypoints.map((s) => `${s.lat},${s.lng}`).join('%7C');

  return `https://www.google.com/maps/dir/?api=1&destination=${lastStop.lat},${lastStop.lng}&waypoints=${waypointsStr}&travelmode=driving&dir_action=navigate`;
}

/**
 * Invoca deep linking nativo para aplicativos externos reunindo TODAS as paradas em uma única rota veicular contínua.
 */
export async function openMultiStopNavigation({
  stops,
  groupTitle = 'Lote Econômico Zarpa',
  app = 'ask',
}: MultiStopNavigationOptions): Promise<void> {
  if (!stops || stops.length === 0) {
    Alert.alert('Navegação Indisponível', 'Nenhuma parada encontrada no itinerário para traçar a rota.');
    return;
  }

  const googleMapsUrl = buildGoogleMapsMultiStopUrl(stops);
  const firstStop = stops[0];
  const wazeNativeUrl = `waze://?ll=${firstStop.lat},${firstStop.lng}&navigate=yes`;
  const wazeWebFallback = `https://waze.com/ul?ll=${firstStop.lat},${firstStop.lng}&navigate=yes`;

  if (app === 'google') {
    try {
      await Linking.openURL(googleMapsUrl);
    } catch {
      Alert.alert('Erro ao Abrir Navegação', 'Não foi possível iniciar a rota no Google Maps.');
    }
    return;
  }

  if (app === 'waze') {
    try {
      const supported = await Linking.canOpenURL(wazeNativeUrl);
      if (supported) {
        await Linking.openURL(wazeNativeUrl);
      } else {
        await Linking.openURL(wazeWebFallback);
      }
    } catch {
      await Linking.openURL(wazeWebFallback);
    }
    return;
  }

  // Opção interativa para o condutor
  Alert.alert(
    'Navegar com GPS Externo',
    `Deseja traçar a rota com todas as ${stops.length} paradas unificadas no Google Maps?`,
    [
      {
        text: 'Google Maps (Rota Completa)',
        onPress: () => openMultiStopNavigation({ stops, groupTitle, app: 'google' }),
      },
      {
        text: 'Waze (Apenas 1ª Parada)',
        onPress: () => openMultiStopNavigation({ stops, groupTitle, app: 'waze' }),
      },
      {
        text: 'Cancelar',
        style: 'cancel',
      },
    ]
  );
}

/**
 * Invoca deep linking nativo para aplicativos externos de navegação veicular (Google Maps ou Waze).
 */
export async function openExternalNavigation({
  lat,
  lng,
  label = 'Parada Zarpa',
  app = 'ask',
}: NavigationOptions): Promise<void> {
  const encodedLabel = encodeURIComponent(label);

  const googleMapsNativeUrl = Platform.select({
    ios: `maps:0,0?q=${encodedLabel}@${lat},${lng}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${encodedLabel})`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  });

  const googleMapsWebFallback = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const wazeNativeUrl = `waze://?ll=${lat},${lng}&navigate=yes`;
  const wazeWebFallback = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

  if (app === 'google') {
    try {
      const supported = await Linking.canOpenURL(googleMapsNativeUrl);
      if (supported) {
        await Linking.openURL(googleMapsNativeUrl);
      } else {
        await Linking.openURL(googleMapsWebFallback);
      }
    } catch {
      await Linking.openURL(googleMapsWebFallback);
    }
    return;
  }

  if (app === 'waze') {
    try {
      const supported = await Linking.canOpenURL(wazeNativeUrl);
      if (supported) {
        await Linking.openURL(wazeNativeUrl);
      } else {
        await Linking.openURL(wazeWebFallback);
      }
    } catch {
      await Linking.openURL(wazeWebFallback);
    }
    return;
  }

  // Opção interativa para o condutor selecionar seu app de preferência
  Alert.alert(
    'Navegar com GPS Externo',
    `Escolha o aplicativo de navegação para traçar a rota até:\n"${label}"`,
    [
      {
        text: 'Google Maps',
        onPress: () => openExternalNavigation({ lat, lng, label, app: 'google' }),
      },
      {
        text: 'Waze',
        onPress: () => openExternalNavigation({ lat, lng, label, app: 'waze' }),
      },
      {
        text: 'Cancelar',
        style: 'cancel',
      },
    ]
  );
}

