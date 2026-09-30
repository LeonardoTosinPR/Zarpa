import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ActiveDeliveryScreen from '../app/(courier)/active-delivery';
import { courierService, ExpressOrder } from '../src/services/courierService';
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
  useLocalSearchParams: () => ({
    orderId: '42',
  }),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

describe('Active Delivery Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockActiveOrder: ExpressOrder = {
    id: 42,
    client_id: 5,
    courier_id: 1,
    package_description: 'Envelope com documentos',
    package_weight_kg: 0.3,
    shipping_type: 'express',
    status: 'assigned',
    individual_freight_price: 15.0,
    final_freight_price: null,
    distance_km: 3.2,
    estimated_duration_minutes: 8,
    route_geometry: null,
    origin_address: 'Rua Saldanha Marinho, Centro, Guarapuava - PR',
    dest_address: 'Campus UTFPR, Guarapuava - PR',
    origin_lat: -25.3954,
    origin_lng: -51.4641,
    dest_lat: -25.405,
    dest_lng: -51.475,
    pickup_distance_km: 0.5,
    created_at: '2026-09-30T15:00:00Z',
    client: {
      id: 5,
      business_name: 'Papelaria Central',
    },
  };

  it('renders active delivery screen with internal route map and order details', async () => {
    jest.spyOn(courierService, 'getOrderDetails').mockResolvedValue({
      order: mockActiveOrder,
    });

    const { findByText, findByTestId } = render(
      <AuthProvider>
        <ActiveDeliveryScreen />
      </AuthProvider>
    );

    expect(await findByText('Corrida em Andamento')).toBeTruthy();
    expect(await findByText('Envelope com documentos')).toBeTruthy();
    expect(await findByText('Papelaria Central')).toBeTruthy();
    expect(await findByTestId('confirm-pickup-btn')).toBeTruthy();
    expect(await findByTestId('cancel-delivery-btn')).toBeTruthy();
  });

  it('prevents courier from exiting active delivery without canceling', async () => {
    jest.spyOn(courierService, 'getOrderDetails').mockResolvedValue({
      order: mockActiveOrder,
    });

    const alertSpy = jest.spyOn(Alert, 'alert');

    const { findByTestId } = render(
      <AuthProvider>
        <ActiveDeliveryScreen />
      </AuthProvider>
    );

    const backBtn = await findByTestId('active-delivery-back-btn');
    fireEvent.press(backBtn);

    expect(alertSpy).toHaveBeenCalledWith(
      'Corrida em Andamento',
      expect.stringContaining('não pode sair da tela sem antes cancelar a corrida'),
      expect.any(Array)
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('progresses delivery lifecycle from assigned to picked_up', async () => {
    jest.spyOn(courierService, 'getOrderDetails').mockResolvedValue({
      order: mockActiveOrder,
    });

    const pickupSpy = jest.spyOn(courierService, 'confirmPickup').mockResolvedValue({
      message: 'Coleta confirmada com sucesso!',
      order: { ...mockActiveOrder, status: 'picked_up' },
    });

    const { findByTestId, findByText } = render(
      <AuthProvider>
        <ActiveDeliveryScreen />
      </AuthProvider>
    );

    const confirmPickupBtn = await findByTestId('confirm-pickup-btn');
    fireEvent.press(confirmPickupBtn);

    await waitFor(() => {
      expect(pickupSpy).toHaveBeenCalledWith(42);
    });

    expect(await findByTestId('confirm-delivery-btn')).toBeTruthy();
    expect(await findByText('2. EM TRANSPORTE PARA ENTREGA')).toBeTruthy();
  });

  it('allows canceling delivery and redirects to courier dashboard', async () => {
    jest.spyOn(courierService, 'getOrderDetails').mockResolvedValue({
      order: mockActiveOrder,
    });

    const cancelSpy = jest.spyOn(courierService, 'cancelActiveDelivery').mockResolvedValue({
      message: 'Corrida cancelada com sucesso.',
    });

    const { findByTestId } = render(
      <AuthProvider>
        <ActiveDeliveryScreen />
      </AuthProvider>
    );

    const cancelBtn = await findByTestId('cancel-delivery-btn');
    fireEvent.press(cancelBtn);

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const lastAlertCall = alertCalls[alertCalls.length - 1];
    const cancelOption = lastAlertCall[2].find((btn: any) => btn.text === 'Cancelar Corrida');

    cancelOption.onPress();

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith(42, expect.any(String));
    });
  });
});

