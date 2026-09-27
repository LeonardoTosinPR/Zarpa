import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ClientOrdersScreen from '../app/(client)/orders';
import { orderService, OrderItem } from '../src/services/orderService';
import { AuthProvider } from '../src/context/AuthContext';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

describe('Client Orders Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders filter tabs and orders list when items are returned', async () => {
    const mockOrders: OrderItem[] = [
      {
        id: 101,
        client_id: 1,
        courier_id: null,
        package_description: 'Pacote de Teste Lojista',
        package_weight_kg: 2.5,
        package_volume_m3: null,
        shipping_type: 'economic',
        status: 'pending',
        is_anchor: false,
        individual_freight_price: 24.5,
        final_freight_price: null,
        distance_km: 7.4,
        estimated_duration_minutes: 14,
        route_geometry: null,
        origin_address: 'Centro, Guarapuava - PR',
        dest_address: 'UTFPR, Guarapuava - PR',
        origin_lat: -25.3954,
        origin_lng: -51.4641,
        dest_lat: -25.3494,
        dest_lng: -51.4787,
        created_at: '2026-09-10T14:30:00Z',
      },
    ];

    jest.spyOn(orderService, 'getMyOrders').mockResolvedValue({ data: mockOrders });

    const { getByText, findByText } = render(
      <AuthProvider>
        <ClientOrdersScreen />
      </AuthProvider>
    );

    expect(getByText('Todos')).toBeTruthy();
    expect(getByText('Pendentes')).toBeTruthy();
    expect(getByText('Em Andamento')).toBeTruthy();

    const orderTitle = await findByText('Pacote de Teste Lojista');
    expect(orderTitle).toBeTruthy();
    expect(getByText('Pedido #101')).toBeTruthy();
    expect(getByText('Econômica')).toBeTruthy();
    expect(getByText('Pendente')).toBeTruthy();
  });

  it('renders empty state illustration when lojista has no orders', async () => {
    jest.spyOn(orderService, 'getMyOrders').mockResolvedValue({ data: [] });

    const { findByText } = render(
      <AuthProvider>
        <ClientOrdersScreen />
      </AuthProvider>
    );

    const emptyText = await findByText('Nenhum pedido encontrado');
    expect(emptyText).toBeTruthy();
  });
});
