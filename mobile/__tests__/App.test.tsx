import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from '../app/index';

describe('HomeScreen', () => {
  it('renders brand name and sprint 0 status correctly', () => {
    const { getByText } = render(<HomeScreen />);

    expect(getByText('⚡ Zarpa')).toBeTruthy();
    expect(getByText('Intermediação Inteligente de Entregas Urbanas')).toBeTruthy();
    expect(getByText('✅ Sprint 0: Ambiente & Monorepo Inicializado')).toBeTruthy();
  });
});

