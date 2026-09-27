import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getToken } from './authStorage';

// Resolve dinamicamente o host da API baseado no host do bundler Metro (USB / localhost ou LAN)
const getDynamicHost = (): string => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return hostUri.split(':')[0];
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
