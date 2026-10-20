import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Linking, Alert } from 'react-native';
import RouteAgendaScreen from '../app/(courier)/route-agenda';
import { courierService } from '../src/services/courierService';
import {
  openMultiStopNavigation,
  buildGoogleMapsMultiStopUrl,
} from '../src/utils/navigationLauncher';

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
  useLocalSearchParams: () => ({}),
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

// Mock Linking
jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any);
jest.spyOn(Alert, 'alert');

const mockActiveGroup = {
  id: 101,
  courier_id: 1,
  courier_name: 'Carlos Entregador',
  scheduled_date: '2026-10-19',
  total_distance_km: 14.0,
  total_duration_minutes: 40,
  status: 'assigned' as const,
  total_combined_cost: 35.0,
  total_savings_generated: 12.0,
  route_fare: 35.0,
  stop_fees: 6.0,
  courier_bonus: 6.0,
  total_earnings: 47.0,
  total_stops: 2,
  completed_stops_count: 0,
  is_all_completed: false,
  current_stop: {
    id: 1,
    stop_sequence: 1,
    stop_type: 'pickup' as const,
    status: 'pending' as const,
    order_id: 201,
    order_status: 'assigned',
    package_description: 'Kit Ferramentas',
    address: 'Rua XV de Novembro, 1000, Centro',
    lat: -25.3954,
    lng: -51.4641,
    isolated_distance_km: 7.0,
    shared_distance_km: 5.0,
    merchant_discount: 3.0,
  },
  stops: [
    {
      id: 1,
      stop_sequence: 1,
      stop_type: 'pickup' as const,
      status: 'pending' as const,
      order_id: 201,
      order_status: 'assigned',
      package_description: 'Kit Ferramentas',
      client_name: 'Lojista Centro',
      client_phone: '42999990000',
      address: 'Rua XV de Novembro, 1000, Centro',
      lat: -25.3954,
      lng: -51.4641,
      isolated_distance_km: 7.0,
      shared_distance_km: 5.0,
      merchant_discount: 3.0,
    },
    {
      id: 2,
      stop_sequence: 2,
      stop_type: 'delivery' as const,
      status: 'pending' as const,
      order_id: 201,
      order_status: 'assigned',
      package_description: 'Kit Ferramentas',
      client_name: 'Cliente Batel',
      client_phone: '42998881111',
      address: 'Rua Saldanha Marinho, 500, Batel',
      lat: -25.399,
      lng: -51.468,
      isolated_distance_km: 7.0,
      shared_distance_km: 5.0,
      merchant_discount: 3.0,
    },
  ],
};

describe('Route Agenda Screen (Sprint 6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders route agenda with active delivery group and financial breakdown', async () => {
    jest.spyOn(courierService, 'getActiveGroup').mockResolvedValueOnce({
      active_group: mockActiveGroup as any,
    });

    const { getByText, getAllByText, getByTestId } = render(<RouteAgendaScreen />);

    await waitFor(() => {
      expect(getByTestId('agenda-hero-card')).toBeTruthy();
      expect(getByText('Lote #101')).toBeTruthy();
      expect(getByText('R$ 47.00')).toBeTruthy();
      expect(getByText('BÔNUS')).toBeTruthy();
      expect(getByText('+ R$ 12.00')).toBeTruthy();
      expect(getByText('14 km')).toBeTruthy();
    });

    // Validar paradas sequenciadas
    expect(getAllByText(/Kit Ferramentas/).length).toBe(2);
    expect(getByText('Coleta no Lojista')).toBeTruthy();
    expect(getByText('Entrega no Destinatário')).toBeTruthy();
  });

  it('allows courier to start batch route changing status to in_progress', async () => {
    jest.spyOn(courierService, 'getActiveGroup').mockResolvedValueOnce({
      active_group: mockActiveGroup as any,
    });

    jest.spyOn(courierService, 'startDeliveryGroup').mockResolvedValueOnce({
      success: true,
      message: 'Jornada iniciada',
      group: {
        ...mockActiveGroup,
        status: 'in_progress',
      } as any,
    });

    const { getByTestId, getByText } = render(<RouteAgendaScreen />);

    await waitFor(() => {
      expect(getByTestId('start-batch-btn')).toBeTruthy();
    });

    fireEvent.press(getByTestId('start-batch-btn'));

    await waitFor(() => {
      expect(courierService.startDeliveryGroup).toHaveBeenCalledWith(101);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Jornada Iniciada!',
        expect.any(String)
      );
    });
  });

  it('confirms pickup on stop 1 and triggers confirmPickup service', async () => {
    jest.spyOn(courierService, 'getActiveGroup').mockResolvedValue({
      active_group: {
        ...mockActiveGroup,
        status: 'in_progress',
      } as any,
    });

    jest.spyOn(courierService, 'confirmPickup').mockResolvedValueOnce({
      message: 'Coleta confirmada',
      order: { id: 201, status: 'picked_up' } as any,
    });

    const { getByTestId } = render(<RouteAgendaScreen />);

    await waitFor(() => {
      expect(getByTestId('confirm-pickup-btn-1')).toBeTruthy();
    });

    fireEvent.press(getByTestId('confirm-pickup-btn-1'));

    await waitFor(() => {
      expect(courierService.confirmPickup).toHaveBeenCalledWith(201);
    });
  });

  it('opens delivery confirmation modal and submits delivery with proof photo', async () => {
    jest.spyOn(courierService, 'getActiveGroup').mockResolvedValue({
      active_group: {
        ...mockActiveGroup,
        status: 'in_progress',
      } as any,
    });

    jest.spyOn(courierService, 'confirmDelivery').mockResolvedValueOnce({
      message: 'Entrega finalizada',
      order: { id: 201, status: 'delivered' } as any,
    });

    const { getByTestId, getByText } = render(<RouteAgendaScreen />);

    await waitFor(() => {
      expect(getByTestId('confirm-delivery-btn-2')).toBeTruthy();
    });

    fireEvent.press(getByTestId('confirm-delivery-btn-2'));

    // Verifica modal aberto com abas de Código (6 dígitos) e Foto de Comprovante
    await waitFor(() => {
      expect(getByText('Confirmar Entrega')).toBeTruthy();
      expect(getByTestId('proof-tab-code')).toBeTruthy();
      expect(getByTestId('proof-tab-photo')).toBeTruthy();
      expect(getByTestId('submit-delivery-proof-btn')).toBeTruthy();
    });

    // Alterna para a aba de Foto de Comprovante e preenche o comprovante
    fireEvent.press(getByTestId('proof-tab-photo'));
    const proofInput = await waitFor(() => getByTestId('proof-input'));
    fireEvent.changeText(proofInput, 'https://zarpa.com.br/proofs/comprovante_201.jpg');

    fireEvent.press(getByTestId('submit-delivery-proof-btn'));

    await waitFor(() => {
      expect(courierService.confirmDelivery).toHaveBeenCalledWith(
        201,
        expect.stringContaining('comprovante_201'),
        undefined,
        undefined
      );
    });
  });

  it('triggers unified multi-stop GPS navigation combining all stops and removes per-stop gps buttons', async () => {
    jest.spyOn(courierService, 'getActiveGroup').mockResolvedValueOnce({
      active_group: mockActiveGroup as any,
    });

    const { getByTestId, queryByTestId, getByText } = render(<RouteAgendaScreen />);

    await waitFor(() => {
      // 1. Botões por parada individual NÃO devem mais existir
      expect(queryByTestId('nav-gps-btn-1')).toBeNull();
      expect(queryByTestId('nav-gps-btn-2')).toBeNull();

      // 2. Botão unificado de rota completa DEVE existir
      expect(getByTestId('nav-full-route-gps-btn')).toBeTruthy();
      expect(getByTestId('header-nav-gps-btn')).toBeTruthy();
      expect(getByText('Navegar pelo GPS (Rota Completa)')).toBeTruthy();
    });

    // 3. Ao clicar no botão unificado, dispara navegação unificada com todas as paradas
    fireEvent.press(getByTestId('nav-full-route-gps-btn'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Navegar com GPS Externo',
      expect.stringContaining('todas as 2 paradas unificadas'),
      expect.any(Array)
    );
  });

  it('builds google maps url with multiple waypoints separated by pipe', () => {
    const stops = [
      { lat: -25.3954, lng: -51.4641, sequence: 1 },
      { lat: -25.398, lng: -51.466, sequence: 2 },
      { lat: -25.399, lng: -51.468, sequence: 3 },
    ];
    const url = buildGoogleMapsMultiStopUrl(stops);
    expect(url).toContain('destination=-25.399,-51.468');
    expect(url).toContain('waypoints=-25.3954,-51.4641%7C-25.398,-51.466');
    expect(url).toContain('travelmode=driving');
  });

  it('renders empty state when there is no active group', async () => {
    jest.spyOn(courierService, 'getActiveGroup').mockResolvedValueOnce({
      active_group: null,
      message: 'Nenhum lote ativo',
    });

    const { getByTestId, getByText } = render(<RouteAgendaScreen />);

    await waitFor(() => {
      expect(getByTestId('route-agenda-empty')).toBeTruthy();
      expect(getByText('Nenhuma Rota Ativa no Momento')).toBeTruthy();
    });
  });
});
