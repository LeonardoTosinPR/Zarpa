import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { User } from '../types/auth';

const TOKEN_KEY = 'zarpa_auth_token';
const USER_KEY = 'zarpa_auth_user';

const isWeb = Platform.OS === 'web';

async function setStorageItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getStorageItem(key: string): Promise<string | null> {
  if (isWeb) {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  }
  return await SecureStore.getItemAsync(key);
}

async function deleteStorageItem(key: string): Promise<void> {
  if (isWeb) {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveToken(token: string): Promise<void> {
  try {
    await setStorageItem(TOKEN_KEY, token);
  } catch (error) {
    console.warn('Erro ao salvar token no storage:', error);
  }
}

export async function getToken(): Promise<string | null> {
  try {
    return await getStorageItem(TOKEN_KEY);
  } catch (error) {
    console.warn('Erro ao obter token do storage:', error);
    return null;
  }
}

export async function removeToken(): Promise<void> {
  try {
    await deleteStorageItem(TOKEN_KEY);
  } catch (error) {
    console.warn('Erro ao remover token do storage:', error);
  }
}

export async function saveUser(user: User): Promise<void> {
  try {
    await setStorageItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.warn('Erro ao salvar usuário no storage:', error);
  }
}

export async function getUser(): Promise<User | null> {
  try {
    const raw = await getStorageItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Erro ao obter usuário do storage:', error);
    return null;
  }
}

export async function removeUser(): Promise<void> {
  try {
    await deleteStorageItem(USER_KEY);
  } catch (error) {
    console.warn('Erro ao remover usuário do storage:', error);
  }
}

export async function clearSession(): Promise<void> {
  await removeToken();
  await removeUser();
}
