import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../services/api';
import { clearSession, getToken, getUser, saveToken, saveUser } from '../services/authStorage';
import { AuthResponse, LoginPayload, RegisterPayload, User, UserRole } from '../types/auth';

interface AuthContextData {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  quickLogin: (role: UserRole) => Promise<User>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load session from secure storage on mount
  useEffect(() => {
    async function loadStoredSession() {
      try {
        const storedToken = await getToken();
        const storedUser = await getUser();

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);

          // Silent profile refresh
          api.get('/auth/me')
            .then(res => {
              if (res.data?.user) {
                setUser(res.data.user);
                saveUser(res.data.user);
              }
            })
            .catch(() => {
              // Ignore background refresh errors
            });
        }
      } catch (error) {
        console.warn('Erro ao restaurar sessão:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredSession();
  }, []);

  async function login(payload: LoginPayload): Promise<User> {
    setIsLoading(true);
    try {
      const response = await api.post<AuthResponse>('/auth/login', payload);
      const { user: loggedUser, token: authToken } = response.data;

      await saveToken(authToken);
      await saveUser(loggedUser);

      setToken(authToken);
      setUser(loggedUser);

      return loggedUser;
    } finally {
      setIsLoading(false);
    }
  }

  async function register(payload: RegisterPayload): Promise<User> {
    setIsLoading(true);
    try {
      const response = await api.post<AuthResponse>('/auth/register', payload);
      const { user: registeredUser, token: authToken } = response.data;

      await saveToken(authToken);
      await saveUser(registeredUser);

      setToken(authToken);
      setUser(registeredUser);

      return registeredUser;
    } finally {
      setIsLoading(false);
    }
  }

  async function logout(): Promise<void> {
    setIsLoading(true);
    try {
      if (token) {
        await api.post('/auth/logout').catch(() => {});
      }
    } finally {
      await clearSession();
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  }

  async function quickLogin(targetRole: UserRole): Promise<User> {
    const credentials: Record<UserRole, LoginPayload> = {
      admin: { email: 'admin@zarpa.com.br', password: 'admin123456' },
      client: { email: 'lojista@zarpa.com.br', password: 'lojista123456' },
      courier: { email: 'entregador@zarpa.com.br', password: 'entregador123456' },
    };

    return await login(credentials[targetRole]);
  }

  async function refreshProfile(): Promise<void> {
    if (!token) return;
    try {
      const response = await api.get<{ user: User }>('/auth/me');
      if (response.data?.user) {
        setUser(response.data.user);
        await saveUser(response.data.user);
      }
    } catch (error) {
      console.warn('Erro ao atualizar perfil:', error);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        quickLogin,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
