import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';

/**
 * Hook oficial do Zarpa Mobile para tratamento consistente de Safe Area.
 * 
 * Resolve o problema crônico de sobreposição da Status Bar no Android,
 * garantindo que o topo da tela respeite sempre o maior valor entre
 * `insets.top` (Expo Safe Area Context) e `StatusBar.currentHeight` (Android nativo).
 */
export function useAppInsets(): EdgeInsets & { statusBarHeight: number } {
  const insets = useSafeAreaInsets();
  const androidStatusBar = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;
  const top = Math.max(insets.top, androidStatusBar);
  const bottom = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0);

  return {
    ...insets,
    top,
    bottom,
    statusBarHeight: androidStatusBar,
  };
}

