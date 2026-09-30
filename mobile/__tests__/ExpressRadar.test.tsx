import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ExpressRadarScreen from '../app/(courier)/express-radar';
import { courierService, ExpressOrder, RadarResponse } from '../src/services/courierService';
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

// Mock expo-location para simular GPS real do dispositivo
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: -25.3954,
        longitude: -51.4641,
      },
    })
  ),
  Accuracy: { Balanced: 3, High: 4 },
}));

describe('Express Radar Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no express orders are available in radius', async () => {
    const mockEmptyRadar: RadarResponse = {
      courier: {
        id: 1,
        is_online: true,
        current_lat: -25.3954,
        current_lng: -51.4641,
        cluster_radius_km: 5.0,
      },
      orders_count: 0,
      orders: [],
      timestamp: '2026-09-30T14:00:00Z',
    };

    jest.spyOn(courierService, 'getRadar').mockResolvedValue(mockEmptyRadar);

    const { findByTestId, findByText } = render(
      <AuthProvider>
        <ExpressRadarScreen />
      </AuthProvider>
    );

    expect(await findByTestId('radar-empty-state')).toBeTruthy();
    expect(await findByText('Nenhum chamado no momento')).toBeTruthy();
  });

  it('renders express opportunity card with price, countdown, and details', async () => {
    const mockOrder: ExpressOrder = {
      id: 99,
      client_id: 2,
      courier_id: null,
      package_description: 'Exame de sangue urgente',
      package_weight_kg: 0.3,
      shipping_type: 'express',
      status: 'pending',
      individual_freight_price: 18.5,
      final_freight_price: null,
      distance_km: 4.2,
      estimated_duration_minutes: 9,
      route_geometry: null,
      origin_address: 'Rua Saldanha Marinho, Centro, Guarapuava - PR',
      dest_address: 'Hospital São Vicente, Guarapuava - PR',
      origin_lat: -25.3954,
      origin_lng: -51.4641,
      dest_lat: -25.385,
      dest_lng: -51.455,
      pickup_distance_km: 0.8,
      created_at: '2026-09-30T14:10:00Z',
    };

    const mockRadarData: RadarResponse = {
      courier: {
        id: 1,
        is_online: true,
        current_lat: -25.3954,
        current_lng: -51.4641,
        cluster_radius_km: 5.0,
      },
      orders_count: 1,
      orders: [mockOrder],
      timestamp: '2026-09-30T14:10:00Z',
    };

    jest.spyOn(courierService, 'getRadar').mockResolvedValue(mockRadarData);

    const { findByTestId, findByText } = render(
      <AuthProvider>
        <ExpressRadarScreen />
      </AuthProvider>
    );

    expect(await findByTestId('radar-card-99')).toBeTruthy();
    expect(await findByText('Exame de sangue urgente')).toBeTruthy();
    expect(await findByText('Coleta a 0.8 km')).toBeTruthy();
    expect(await findByText('10s restantes')).toBeTruthy();
  });

  it('handles acceptance of an express delivery order successfully', async () => {
    const mockOrder: ExpressOrder = {
      id: 88,
      client_id: 2,
      courier_id: null,
      package_description: 'Almoço Executivo Urgente',
      package_weight_kg: 0.8,
      shipping_type: 'express',
      status: 'pending',
      individual_freight_price: 12.0,
      final_freight_price: null,
      distance_km: 2.1,
      estimated_duration_minutes: 6,
      route_geometry: null,
      origin_address: 'Centro',
      dest_address: 'Santa Cruz',
      origin_lat: -25.3954,
      origin_lng: -51.4641,
      dest_lat: -25.4,
      dest_lng: -51.47,
      pickup_distance_km: 0.4,
      created_at: '2026-09-30T14:20:00Z',
    };

    jest.spyOn(courierService, 'getRadar').mockResolvedValue({
      courier: {
        id: 1,
        is_online: true,
        current_lat: -25.3954,
        current_lng: -51.4641,
        cluster_radius_km: 5.0,
      },
      orders_count: 1,
      orders: [mockOrder],
      timestamp: '2026-09-30T14:20:00Z',
    });

    const acceptSpy = jest.spyOn(courierService, 'acceptExpressOrder').mockResolvedValue({
      success: true,
      message: 'Corrida expressa aceita com sucesso!',
      order: { ...mockOrder, status: 'assigned', courier_id: 1 },
    });

    const alertSpy = jest.spyOn(Alert, 'alert');

    const { findByTestId } = render(
      <AuthProvider>
        <ExpressRadarScreen />
      </AuthProvider>
    );

    const acceptBtn = await findByTestId('accept-order-88');
    fireEvent.press(acceptBtn);

    await waitFor(() => {
      expect(acceptSpy).toHaveBeenCalledWith(88);
      expect(alertSpy).toHaveBeenCalledWith(
        'Corrida Aceita',
        expect.stringContaining('Você confirmou o chamado expresso com sucesso'),
        expect.any(Array)
      );
    });
  });

  it('handles rejection of an express delivery order dismissing it immediately', async () => {
    const mockOrder: ExpressOrder = {
      id: 66,
      client_id: 2,
      courier_id: null,
      package_description: 'Pedido a ser Recusado',
      package_weight_kg: 1.0,
      shipping_type: 'express',
      status: 'pending',
      individual_freight_price: 10.0,
      final_freight_price: null,
      distance_km: 2.0,
      estimated_duration_minutes: 5,
      route_geometry: null,
      origin_address: 'Centro',
      dest_address: 'Batel',
      origin_lat: -25.3954,
      origin_lng: -51.4641,
      dest_lat: -25.38,
      dest_lng: -51.46,
      pickup_distance_km: 0.3,
      created_at: '2026-09-30T14:25:00Z',
    };

    jest.spyOn(courierService, 'getRadar').mockResolvedValue({
      courier: {
        id: 1,
        is_online: true,
        current_lat: -25.3954,
        current_lng: -51.4641,
        cluster_radius_km: 5.0,
      },
      orders_count: 1,
      orders: [mockOrder],
      timestamp: '2026-09-30T14:25:00Z',
    });

    const rejectSpy = jest.spyOn(courierService, 'rejectExpressOrder').mockResolvedValue({
      success: true,
      message: 'Chamado recusado com sucesso.',
    });

    const { findByTestId, queryByTestId } = render(
      <AuthProvider>
        <ExpressRadarScreen />
      </AuthProvider>
    );

    const rejectBtn = await findByTestId('reject-order-66');
    fireEvent.press(rejectBtn);

    await waitFor(() => {
      expect(rejectSpy).toHaveBeenCalledWith(66, 'Recusado pelo entregador');
      expect(queryByTestId('radar-card-66')).toBeNull();
    });
  });

  it('displays friendly alert when 409 conflict occurs (pessimistic lock race condition)', async () => {
    const mockOrder: ExpressOrder = {
      id: 77,
      client_id: 2,
      courier_id: null,
      package_description: 'Envelope Jurídico',
      package_weight_kg: 0.2,
      shipping_type: 'express',
      status: 'pending',
      individual_freight_price: 15.0,
      final_freight_price: null,
      distance_km: 3.0,
      estimated_duration_minutes: 8,
      route_geometry: null,
      origin_address: 'Centro',
      dest_address: 'Batel',
      origin_lat: -25.3954,
      origin_lng: -51.4641,
      dest_lat: -25.38,
      dest_lng: -51.46,
      pickup_distance_km: 0.5,
      created_at: '2026-09-30T14:30:00Z',
    };

    jest.spyOn(courierService, 'getRadar').mockResolvedValue({
      courier: {
        id: 1,
        is_online: true,
        current_lat: -25.3954,
        current_lng: -51.4641,
        cluster_radius_km: 5.0,
      },
      orders_count: 1,
      orders: [mockOrder],
      timestamp: '2026-09-30T14:30:00Z',
    });

    const conflictError: any = new Error('Request failed with status code 409');
    conflictError.response = {
      status: 409,
      data: {
        message: 'Outro entregador parceiro aceitou esta corrida uma fração de segundo antes.',
        error_code: 'ORDER_ALREADY_CLAIMED',
      },
    };

    jest.spyOn(courierService, 'acceptExpressOrder').mockRejectedValue(conflictError);
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { findByTestId } = render(
      <AuthProvider>
        <ExpressRadarScreen />
      </AuthProvider>
    );

    const acceptBtn = await findByTestId('accept-order-77');
    fireEvent.press(acceptBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Chamado Indisponível',
        expect.stringContaining('Outro entregador parceiro aceitou esta corrida'),
        expect.any(Array)
      );
    });
  });

  it('blocks radar screen when courier is offline and enables quick online activation', async () => {
    const mockOfflineRadar: RadarResponse = {
      courier: {
        id: 1,
        is_online: false,
        current_lat: -25.3954,
        current_lng: -51.4641,
        cluster_radius_km: 5.0,
      },
      orders_count: 0,
      orders: [],
      timestamp: '2026-09-30T14:40:00Z',
    };

    jest.spyOn(courierService, 'getRadar').mockResolvedValue(mockOfflineRadar);
    const updateStatusSpy = jest.spyOn(courierService, 'updateStatus').mockResolvedValue({
      message: 'Condutor agora está ONLINE no radar.',
      is_online: true,
    });

    const { findByTestId, findByText } = render(
      <AuthProvider>
        <ExpressRadarScreen />
      </AuthProvider>
    );

    expect(await findByTestId('radar-offline-blocker')).toBeTruthy();
    expect(await findByText('Radar Desativado')).toBeTruthy();
    expect(
      await findByText(
        'Você está offline no momento. O radar fica inacessível enquanto seu status de disponibilidade estiver desligado.'
      )
    ).toBeTruthy();

    const activateBtn = await findByTestId('activate-radar-online-btn');
    fireEvent.press(activateBtn);

    await waitFor(() => {
      expect(updateStatusSpy).toHaveBeenCalledWith(true);
    });
  });

  it('applies 30-second cooldown without permanent backend rejection when order timer expires', async () => {
    jest.useFakeTimers();

    const mockOrder: ExpressOrder = {
      id: 55,
      client_id: 2,
      courier_id: null,
      package_description: 'Pedido com Expiracao sem Acao',
      package_weight_kg: 0.5,
      shipping_type: 'express',
      status: 'pending',
      individual_freight_price: 14.0,
      final_freight_price: null,
      distance_km: 2.5,
      estimated_duration_minutes: 7,
      route_geometry: null,
      origin_address: 'Centro',
      dest_address: 'Batel',
      origin_lat: -25.3954,
      origin_lng: -51.4641,
      dest_lat: -25.38,
      dest_lng: -51.46,
      pickup_distance_km: 0.2,
      created_at: '2026-09-30T14:45:00Z',
    };

    jest.spyOn(courierService, 'getRadar').mockResolvedValue({
      courier: {
        id: 1,
        is_online: true,
        current_lat: -25.3954,
        current_lng: -51.4641,
        cluster_radius_km: 5.0,
      },
      orders_count: 1,
      orders: [mockOrder],
      timestamp: '2026-09-30T14:45:00Z',
    });

    const rejectSpy = jest.spyOn(courierService, 'rejectExpressOrder');

    const { findByTestId, queryByTestId } = render(
      <AuthProvider>
        <ExpressRadarScreen />
      </AuthProvider>
    );

    expect(await findByTestId('radar-card-55')).toBeTruthy();

    // Avança 11 segundos para acionar a expiração dos 10s do card dentro do act
    act(() => {
      jest.advanceTimersByTime(11000);
    });

    expect(queryByTestId('radar-card-55')).toBeNull();

    // Garante que o backend NÃO recebeu recusa permanente
    expect(rejectSpy).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});

