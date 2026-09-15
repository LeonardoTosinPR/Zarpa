import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import WelcomeScreen from '../app/index';
import { AuthProvider } from '../src/context/AuthContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

describe('WelcomeScreen', () => {
  it('renders Zarpa brand title, subtitle and action buttons', async () => {
    const { getByText, getByTestId, queryByText } = render(
      <AuthProvider>
        <WelcomeScreen />
      </AuthProvider>
    );

    // Wait until loading state resolves
    await waitFor(() => {
      expect(queryByText('Carregando sessão Zarpa...')).toBeNull();
    });

    expect(getByText('Zarpa')).toBeTruthy();
    expect(getByText('Intermediação Inteligente de Entregas Urbanas')).toBeTruthy();
    expect(getByTestId('welcome-login-button')).toBeTruthy();
    expect(getByTestId('welcome-register-button')).toBeTruthy();
  });
});
