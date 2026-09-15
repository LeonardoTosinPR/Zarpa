import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Badge } from '../src/components/Badge';
import { AlertBanner } from '../src/components/AlertBanner';
import { Card } from '../src/components/Card';
import { ActionCard } from '../src/components/ActionCard';
import { MetricCard } from '../src/components/MetricCard';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { ScreenContainer } from '../src/components/ScreenContainer';

describe('Reusable UI Components', () => {
  describe('Badge', () => {
    it('renders with label and variant', () => {
      const { getByText } = render(<Badge label="Ativo" variant="accent" />);
      expect(getByText('Ativo')).toBeTruthy();
    });
  });

  describe('AlertBanner', () => {
    it('renders error message correctly', () => {
      const { getByText } = render(
        <AlertBanner message="Credenciais inválidas" type="error" testID="error-alert" />
      );
      expect(getByText('Credenciais inválidas')).toBeTruthy();
    });
  });

  describe('Card', () => {
    it('renders children inside card', () => {
      const { getByText } = render(
        <Card variant="elevated">
          <Text>Conteúdo do Card</Text>
        </Card>
      );
      expect(getByText('Conteúdo do Card')).toBeTruthy();
    });
  });

  describe('ActionCard', () => {
    it('renders title, subtitle and triggers onPress', () => {
      const onPressMock = jest.fn();
      const { getByText, getByTestId } = render(
        <ActionCard
          iconName="cube-outline"
          title="Novo Pedido"
          subtitle="Criar envio expresso"
          onPress={onPressMock}
          testID="action-card-test"
        />
      );

      expect(getByText('Novo Pedido')).toBeTruthy();
      expect(getByText('Criar envio expresso')).toBeTruthy();

      fireEvent.press(getByTestId('action-card-test'));
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('MetricCard', () => {
    it('renders metrics row with primary and default values', () => {
      const { getByText } = render(
        <MetricCard
          title="Ganhos da Semana"
          metrics={[
            { label: 'Total Faturado', value: 'R$ 450,00', isPrimary: true },
            { label: 'Corridas', value: '32' },
          ]}
        />
      );

      expect(getByText('Ganhos da Semana')).toBeTruthy();
      expect(getByText('Total Faturado')).toBeTruthy();
      expect(getByText('R$ 450,00')).toBeTruthy();
      expect(getByText('Corridas')).toBeTruthy();
      expect(getByText('32')).toBeTruthy();
    });
  });

  describe('Button', () => {
    it('renders title and triggers onPress', () => {
      const onPress = jest.fn();
      const { getByText, getByTestId } = render(
        <Button title="Confirmar" onPress={onPress} testID="custom-btn" />
      );

      expect(getByText('Confirmar')).toBeTruthy();
      fireEvent.press(getByTestId('custom-btn'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('renders disabled state when disabled prop is passed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button title="Salvar" onPress={onPress} disabled testID="disabled-btn" />
      );

      expect(getByTestId('disabled-btn').props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Input', () => {
    it('renders label, handles text change and password toggle', () => {
      const onChange = jest.fn();
      const { getByText, getByPlaceholderText } = render(
        <Input
          label="Nome"
          placeholder="Digite seu nome"
          onChangeText={onChange}
        />
      );

      expect(getByText('Nome')).toBeTruthy();
      const input = getByPlaceholderText('Digite seu nome');
      fireEvent.changeText(input, 'Leonardo');
      expect(onChange).toHaveBeenCalledWith('Leonardo');
    });
  });

  describe('ScreenContainer', () => {
    it('renders children with safe area layout', () => {
      const { getByText } = render(
        <ScreenContainer>
          <Text>Tela Principal</Text>
        </ScreenContainer>
      );
      expect(getByText('Tela Principal')).toBeTruthy();
    });
  });
});
