import * as SecureStore from 'expo-secure-store';
import { User } from '../types/auth';

const TOKEN_KEY = 'zarpa_auth_token';
const USER_KEY = 'zarpa_auth_user';

export async function saveToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.warn('Erro ao salvar token no SecureStore:', error);
  }
}

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.warn('Erro ao obter token do SecureStore:', error);
    return null;
  }
}

export async function removeToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.warn('Erro ao remover token do SecureStore:', error);
  }
}

export async function saveUser(user: User): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.warn('Erro ao salvar usuário no SecureStore:', error);
  }
}

export async function getUser(): Promise<User | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Erro ao obter usuário do SecureStore:', error);
    return null;
  }
}

export async function removeUser(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (error) {
    console.warn('Erro ao remover usuário do SecureStore:', error);
  }
}

export async function clearSession(): Promise<void> {
  await removeToken();
  await removeUser();
}
