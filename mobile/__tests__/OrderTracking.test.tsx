import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import ClientOrdersScreen from '../app/(client)/orders';
import { orderService, OrderItem, OrderTrackingResponse } from '../src/services/orderService';

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

// Mock Header
jest.mock('../src/components/Header', () => ({
  Header: () => null,
}));

const mockOrders: OrderItem[] = [
  {
    id: 501,
    client_id: 1,
    courier_id: 2,
    package_description: 'Combo Sushi Familiar',
    package_weight_kg: 1.5,
    package_volume_m3: null,
    shipping_type: 'express',
    status: 'picked_up',
    is_anchor: false,
    individual_freight_price: 22.0,
    final_freight_price: 22.0,
    distance_km: 5.2,
    estimated_duration_minutes: 18,
    route_geometry: null,
    origin_address: 'Rua Saldanha Marinho, 1200',
    dest_address: 'Rua Brigadeiro Rocha, 450',
    origin_lat: -25.3954,
    origin_lng: -51.4641,
    dest_lat: -25.402,
    dest_lng: -51.461,
    delivery_code: '654321',
    created_at: '2026-10-19T10:00:00Z',
    courier: {
      id: 2,
      user: {
        name: 'Roberto Motoboy',
        phone: '42991112233',
      },
    },
  },
];

const mockTracking: OrderTrackingResponse = {
  order_id: 501,
  status: 'picked_up',
  shipping_type: 'express',
  package_description: 'Combo Sushi Familiar',
  package_weight_kg: 1.5,
  origin_address: 'Rua Saldanha Marinho, 1200',
  dest_address: 'Rua Brigadeiro Rocha, 450',
  courier: {
    id: 2,
    name: 'Roberto Motoboy',
    phone: '42991112233',
    vehicle_type: 'motorcycle',
    vehicle_plate: 'ZRP-2026',
  },
  proof_photo_url: 'https://zarpa.com.br/proofs/comprovante_501.jpg',
  delivery_code: '654321',
  timeline: [
    {
      step: 'created',
      title: 'Pedido Criado',
      description: 'Solicitação registrada na plataforma.',
      timestamp: '2026-10-19T10:00:00Z',
      completed: true,
    },
    {
      step: 'assigned',
      title: 'Condutor Atribuído',
      description: 'Atribuído ao condutor Roberto Motoboy.',
      timestamp: '2026-10-19T10:05:00Z',
      completed: true,
    },
    {
      step: 'picked_up',
      title: 'Mercadoria Coletada',
      description: 'Pacote em trânsito com o condutor a caminho do destino.',
      timestamp: '2026-10-19T10:15:00Z',
      completed: true,
    },
    {
      step: 'delivered',
      title: 'Entrega Concluída',
      description: 'Mercadoria entregue com sucesso.',
      timestamp: null,
      completed: false,
    },
  ],
};

describe('Order Tracking Timeline (Sprint 6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tracking button on merchant orders screen and opens timeline modal', async () => {
    jest.spyOn(orderService, 'getMyOrders').mockResolvedValueOnce({
      data: mockOrders,
    });
    jest.spyOn(orderService, 'getTracking').mockResolvedValueOnce(mockTracking);

    const { getByTestId, getByText, queryByText } = render(<ClientOrdersScreen />);

    // Espera a listagem carregar e exibe o código de 6 dígitos anexado ao pedido para o lojista
    await waitFor(() => {
      expect(getByTestId('order-card-501')).toBeTruthy();
      expect(getByTestId('order-delivery-code-501')).toBeTruthy();
      expect(getByText('654321')).toBeTruthy();
      expect(getByTestId('track-order-btn-501')).toBeTruthy();
    });

    // Clica no botão de rastreamento
    fireEvent.press(getByTestId('track-order-btn-501'));

    // Valida abertura do modal e dados de tracking
    await waitFor(() => {
      expect(orderService.getTracking).toHaveBeenCalledWith(501);
      expect(getByText('Rastreamento #501')).toBeTruthy();
      expect(getByText('Roberto Motoboy')).toBeTruthy();
      expect(getByText(/Placa: ZRP-2026/)).toBeTruthy();
      expect(getByText('Mercadoria Coletada')).toBeTruthy();
      expect(getByText('Entrega Concluída')).toBeTruthy();
      expect(getByText('Comprovante de Entrega Registrado')).toBeTruthy();
    });

    // Fecha o modal
    fireEvent.press(getByTestId('close-tracking-modal-btn'));

    await waitFor(() => {
      expect(queryByText('Rastreamento #501')).toBeNull();
    });
  });
});

