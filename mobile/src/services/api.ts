import axios from 'axios';
import { Platform } from 'react-native';
import { getToken } from './authStorage';

// Android Emulator: 10.0.2.2, Physical device / iOS / Web: localhost or custom IP
const DEFAULT_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8000/api',
  default: 'http://localhost:8000/api',
});

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
