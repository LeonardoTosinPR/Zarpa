import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../app/login';
import RegisterScreen from '../app/register';
import { AuthProvider } from '../src/context/AuthContext';

// Mock expo-router
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
  }),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

describe('Authentication Screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoginScreen', () => {
    it('renders login fields, title and demo shortcut buttons', () => {
      const { getByText, getByTestId } = render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      expect(getByText('Acesse sua conta')).toBeTruthy();
      expect(getByTestId('login-email-input')).toBeTruthy();
      expect(getByTestId('login-password-input')).toBeTruthy();
      expect(getByTestId('login-submit-button')).toBeTruthy();
      expect(getByTestId('login-quick-admin')).toBeTruthy();
      expect(getByTestId('login-quick-client')).toBeTruthy();
      expect(getByTestId('login-quick-courier')).toBeTruthy();
    });

    it('shows error banner when submitted without email or password', async () => {
      const { getByTestId, findByText } = render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      // Wait for AuthProvider initial session check to finish
      await waitFor(() => {
        expect(getByTestId('login-submit-button').props.accessibilityState?.disabled).toBeFalsy();
      });

      fireEvent.press(getByTestId('login-submit-button'));

      expect(await findByText('Informe seu e-mail.')).toBeTruthy();
    });

    it('toggles password visibility with animated emoji when eye button is pressed', () => {
      const { getByTestId, getByText } = render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      expect(getByText('🙈')).toBeTruthy();
      fireEvent.press(getByTestId('password-toggle-button'));
      expect(getByText('🐵')).toBeTruthy();
    });
  });

  describe('RegisterScreen', () => {
    it('renders role selector and switches conditional fields between merchant and courier', () => {
      const { getByText, getByTestId, queryByTestId } = render(
        <AuthProvider>
          <RegisterScreen />
        </AuthProvider>
      );

      expect(getByText('Crie sua conta')).toBeTruthy();
      expect(getByTestId('register-name-input')).toBeTruthy();
      expect(getByTestId('register-email-input')).toBeTruthy();

      // By default role is client: shows business fields
      expect(getByTestId('register-business-name-input')).toBeTruthy();
      expect(getByTestId('register-cnpj-input')).toBeTruthy();
      expect(queryByTestId('register-cnh-input')).toBeNull();

      // Switch to courier
      fireEvent.press(getByTestId('role-option-courier'));

      // Now shows courier fields
      expect(getByTestId('register-cnh-input')).toBeTruthy();
      expect(getByTestId('vehicle-option-motorcycle')).toBeTruthy();
      expect(queryByTestId('register-business-name-input')).toBeNull();
    });
  });
});
