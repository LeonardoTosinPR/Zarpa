import React from 'react';
import { render } from '@testing-library/react-native';
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
    const { findByText, findByTestId } = render(
      <AuthProvider>
        <WelcomeScreen />
      </AuthProvider>
    );

    expect(await findByText('Zarpa')).toBeTruthy();
    expect(await findByText('Intermediação Inteligente de Entregas Urbanas')).toBeTruthy();
    expect(await findByTestId('welcome-login-button')).toBeTruthy();
    expect(await findByTestId('welcome-register-button')).toBeTruthy();
  });
});
