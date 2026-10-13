import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import ClientOrdersScreen from '../app/(client)/orders';
import CourierDashboardScreen from '../app/(courier)/dashboard';
import EconomicBatchesScreen from '../app/(courier)/economic-batches';
import { orderService, OrderItem } from '../src/services/orderService';
import { courierService } from '../src/services/courierService';
import { AuthProvider } from '../src/context/AuthContext';

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  }),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: -25.3954,
        longitude: -51.4641,
        altitude: 1000,
        accuracy: 5,
        altitudeAccuracy: 5,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    })
  ),
  getLastKnownPositionAsync: jest.fn(() => Promise.resolve(null)),
  Accuracy: { Balanced: 3 },
}));

// Mock RouteMapPreview
jest.mock('../src/components/RouteMapPreview', () => ({
  RouteMapPreview: () => null,
}));

describe('Economic Batch Modules (Sprint 4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders economic batch pending badge on merchant screen', async () => {
    const mockOrders: OrderItem[] = [
      {
        id: 201,
        client_id: 1,
        courier_id: null,
        package_description: 'Pedido Noturno Guarapuava',
        package_weight_kg: 2.0,
        package_volume_m3: null,
        shipping_type: 'economic',
        status: 'pending',
        is_anchor: false,
        individual_freight_price: 20.0,
        final_freight_price: null,
        distance_km: 5.0,
        estimated_duration_minutes: 10,
        route_geometry: null,
        origin_address: 'Centro',
        dest_address: 'Bonsucesso',
        origin_lat: -25.3954,
        origin_lng: -51.4641,
        dest_lat: -25.3582,
        dest_lng: -51.4682,
        created_at: '2026-10-05T10:00:00Z',
      },
    ];

    jest.spyOn(orderService, 'getMyOrders').mockResolvedValue({ data: mockOrders });

    const { findByText } = render(
      <AuthProvider>
        <ClientOrdersScreen />
      </AuthProvider>
    );

    // Valida badge informativo do pedido econômico pendente aguardando batch noturno
    const pendingBatchText = await findByText('Aguardando processamento do lote noturno (02:00)');
    expect(pendingBatchText).toBeTruthy();
  });

  it('renders economic batch scheduled badge and discounted price when order is assigned to batch', async () => {
    const mockOrders: OrderItem[] = [
      {
        id: 202,
        client_id: 1,
        courier_id: 5,
        package_description: 'Pedido com Rateio Aplicado',
        package_weight_kg: 3.0,
        package_volume_m3: null,
        shipping_type: 'economic',
        status: 'assigned',
        is_anchor: false,
        individual_freight_price: 22.0,
        final_freight_price: 18.5, // Com desconto de R$ 3,50
        distance_km: 6.0,
        estimated_duration_minutes: 12,
        route_geometry: null,
        origin_address: 'Centro',
        dest_address: 'Santa Cruz',
        origin_lat: -25.3954,
        origin_lng: -51.4641,
        dest_lat: -25.3888,
        dest_lng: -51.4745,
        created_at: '2026-10-05T10:00:00Z',
      },
    ];

    jest.spyOn(orderService, 'getMyOrders').mockResolvedValue({ data: mockOrders });

    const { findByText, getByText } = render(
      <AuthProvider>
        <ClientOrdersScreen />
      </AuthProvider>
    );

    const scheduledText = await findByText('Lote Gerado: Entrega Agendada');
    expect(scheduledText).toBeTruthy();

    // Preço individual riscado e valor final com desconto rateado
    expect(getByText('R$ 22.00')).toBeTruthy();
    expect(getByText('R$ 18.50')).toBeTruthy();
  });

  it('renders economic batches shortcut on courier dashboard and navigates to dedicated screen', async () => {
    const mockGroups = [
      {
        id: 1,
        courier_id: 10,
        scheduled_date: '2026-10-06',
        total_distance_km: 18.5,
        total_duration_minutes: 35,
        status: 'assigned',
        courier_bonus: 7.25,
        orders: [{ id: 1 }, { id: 2 }],
      },
    ];

    jest.spyOn(courierService, 'getDeliveryGroups').mockResolvedValue({
      courier_id: 10,
      total_groups: 1,
      groups: mockGroups,
    });
    jest.spyOn(courierService, 'updateLocation').mockResolvedValue({} as any);

    const { findByText, getByTestId } = render(
      <AuthProvider>
        <CourierDashboardScreen />
      </AuthProvider>
    );

    // Valida card de atalho para a tela dedicada
    const shortcutTitle = await findByText('Lotes Econômicos Agendados');
    expect(shortcutTitle).toBeTruthy();

    const shortcutBtn = getByTestId('courier-economic-batches-btn');
    fireEvent.press(shortcutBtn);

    // Valida navegação para a rota dedicada
    expect(mockPush).toHaveBeenCalledWith('/(courier)/economic-batches');
  });

  it('renders dedicated economic batches screen with sequenced stops and productivity bonus', async () => {
    const mockGroups = [
      {
        id: 1,
        courier_id: 10,
        scheduled_date: '2026-10-06',
        total_distance_km: 18.5,
        total_duration_minutes: 35,
        status: 'assigned',
        courier_bonus: 7.25,
        orders: [{ id: 1 }, { id: 2 }],
        group_orders: [
          {
            id: 1,
            delivery_group_id: 1,
            order_id: 1,
            stop_sequence: 1,
            stop_type: 'pickup',
            shared_distance_km: 3.2,
            order: {
              origin_address: 'Rua Saldanha Marinho, 1200 - Centro',
              dest_address: 'Av. Professora Laura, 500 - Bonsucesso',
            },
          },
          {
            id: 2,
            delivery_group_id: 1,
            order_id: 2,
            stop_sequence: 2,
            stop_type: 'pickup',
            shared_distance_km: 2.1,
            order: {
              origin_address: 'Rua XV de Novembro, 7000 - Centro',
              dest_address: 'Rua Salvatore, 100 - Bonsucesso',
            },
          },
          {
            id: 3,
            delivery_group_id: 1,
            order_id: 1,
            stop_sequence: 3,
            stop_type: 'delivery',
            shared_distance_km: 4.5,
            order: {
              origin_address: 'Rua Saldanha Marinho, 1200 - Centro',
              dest_address: 'Av. Professora Laura, 500 - Bonsucesso',
            },
          },
          {
            id: 4,
            delivery_group_id: 1,
            order_id: 2,
            stop_sequence: 4,
            stop_type: 'delivery',
            shared_distance_km: 8.7,
            order: {
              origin_address: 'Rua XV de Novembro, 7000 - Centro',
              dest_address: 'Rua Salvatore, 100 - Bonsucesso',
            },
          },
        ],
      },
    ];

    jest.spyOn(courierService, 'getDeliveryGroups').mockResolvedValue({
      courier_id: 10,
      total_groups: 1,
      groups: mockGroups,
    });

    const { findByText, getByText, getAllByText } = render(
      <AuthProvider>
        <EconomicBatchesScreen />
      </AuthProvider>
    );

    // Valida título da tela dedicada
    expect(getByText('Lotes Econômicos')).toBeTruthy();
    expect(getByText('Itinerários Agendados')).toBeTruthy();

    // Valida lote e métricas
    const loteTitle = await findByText('Lote #1');
    expect(loteTitle).toBeTruthy();
    expect(getByText('18.5 km')).toBeTruthy();
    expect(getByText('R$ 7.25')).toBeTruthy();

    // Valida itinerário sequenciado e bônus exibido
    await waitFor(() => {
      expect(getByText('Bônus de Produtividade: R$ 7.25')).toBeTruthy();
      expect(getAllByText('Coleta no Remetente')).toHaveLength(2);
      expect(getAllByText('Entrega no Destinatário')).toHaveLength(2);
    });
  });
});
