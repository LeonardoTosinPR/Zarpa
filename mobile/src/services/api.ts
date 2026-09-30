import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getToken, clearSession } from './authStorage';

// Resolve dinamicamente o host da API baseado no host do bundler Metro (USB / localhost, celular físico LAN ou emulador)
const getDynamicHost = (): string => {
  // 1. Tenta hostUri das configurações do Expo
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return hostUri.split(':')[0];
  }

  // 2. Tenta expoGoConfig.debuggerHost (presente no Expo Go em smartphones físicos)
  const expoGoDebuggerHost = (Constants as any).expoGoConfig?.debuggerHost;
  if (expoGoDebuggerHost) {
    return expoGoDebuggerHost.split(':')[0];
  }

  // 3. Tenta manifest legado ou manifest2 do Expo
  const manifestHost =
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (manifestHost) {
    return manifestHost.split(':')[0];
  }

  // 4. Tenta extrair da linkingUri (ex: "exp://192.168.x.x:8081")
  const linkingUri = Constants.linkingUri;
  if (linkingUri) {
    const match = linkingUri.match(/:\/\/([^:/]+)/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      return match[1];
    }
  }

  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
};

const DEFAULT_BASE_URL = `http://${getDynamicHost()}:8000/api`;

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || DEFAULT_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Se receber 401 não autorizado de endpoint protegido (exceto tentativa de login), limpa sessão local
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      await clearSession();
    }
    return Promise.reject(error);
  }
);
