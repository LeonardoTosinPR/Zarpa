import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RoleSelector } from '../src/components/RoleSelector';

describe('RoleSelector Component', () => {
  it('renders both Merchant (Lojista) and Courier (Entregador) options', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <RoleSelector selectedRole="client" onSelect={onSelect} />
    );

    expect(getByText('Lojista / Estabelecimento')).toBeTruthy();
    expect(getByText('Entregador / Condutor')).toBeTruthy();
    expect(getByText('✓ Lojista')).toBeTruthy();
  });

  it('calls onSelect when an option is pressed', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <RoleSelector selectedRole="client" onSelect={onSelect} />
    );

    fireEvent.press(getByTestId('role-option-courier'));
    expect(onSelect).toHaveBeenCalledWith('courier');
  });
});
