import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import ClientFinancialScreen from '../app/(client)/financial';
import CourierFinancialScreen from '../app/(courier)/financial';
import { financialService, ClientFinancialResponse, CourierFinancialResponse } from '../src/services/financialService';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('Financial Statement Modules (Sprint 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockClientData: ClientFinancialResponse = {
    success: true,
    client: {
      id: 1,
      business_name: 'Supermercado Dal Pozzo',
    },
    summary: {
      total_orders_count: 2,
      economic_orders_count: 1,
      express_orders_count: 1,
      total_original_freight: 33.50,
      total_final_freight: 31.55,
      total_savings: 1.95,
      average_savings_percent: 5.8,
    },
    orders: [
      {
        id: 101,
        package_description: 'Caixa de Alimentos',
        shipping_type: 'economic',
        status: 'assigned',
        individual_freight_price: 18.50,
        final_freight_price: 16.55,
        discount_amount: 1.95,
        discount_percent: 10.5,
        has_batch_discount: true,
        distance_km: 5.0,
        created_at: '2026-10-10T10:00:00Z',
        origin_address: 'Rua Saldanha Marinho, 1000',
        dest_address: 'Rua XV de Novembro, 500',
        delivery_group_id: 1,
      },
      {
        id: 102,
        package_description: 'Remédios Rápidos',
        shipping_type: 'express',
        status: 'delivered',
        individual_freight_price: 15.00,
        final_freight_price: 15.00,
        discount_amount: 0.0,
        discount_percent: 0.0,
        has_batch_discount: false,
        distance_km: 3.5,
        created_at: '2026-10-10T11:00:00Z',
        origin_address: 'Rua Saldanha Marinho, 1000',
        dest_address: 'Av. Manoel Ribas, 200',
        delivery_group_id: null,
      },
    ],
  };

  const mockCourierData: CourierFinancialResponse = {
    success: true,
    courier: {
      id: 2,
      cnh: '12345678900',
      vehicle_type: 'motorcycle',
    },
    summary: {
      total_deliveries_count: 4,
      economic_batches_count: 1,
      express_deliveries_count: 1,
      total_distance_km: 15.0,
      total_base_earnings: 43.50,
      total_batch_bonus: 6.25,
      total_earnings: 49.75,
      earnings_per_km: 3.32,
    },
    batches: [
      {
        id: 1,
        scheduled_date: '2026-10-10',
        status: 'completed',
        total_distance_km: 11.0,
        total_duration_minutes: 40,
        orders_count: 3,
        base_earnings: 27.50,
        courier_bonus: 6.25,
        total_earnings: 33.75,
        savings_generated: 12.50,
      },
    ],
    express_orders: [
      {
        id: 201,
        dest_address: 'Vila Carli, Guarapuava',
        package_description: 'Pizza Família',
        status: 'delivered',
        distance_km: 4.0,
        freight_price: 16.00,
        created_at: '2026-10-10T14:00:00Z',
      },
    ],
  };

  it('renders merchant financial statement with savings hero card and order list', async () => {
    jest.spyOn(financialService, 'getClientStatement').mockResolvedValue(mockClientData);

    const { getByText } = render(<ClientFinancialScreen />);

    await waitFor(() => {
      // Verifica cabeçalho
      expect(getByText('Extrato Financeiro')).toBeTruthy();

      // Hero Card de Economia Total
      expect(getByText('Economia Total com o Zarpa')).toBeTruthy();
      expect(getByText('R$ 1,95')).toBeTruthy();
      expect(getByText('5.8% de economia média')).toBeTruthy();

      // Comparativo de Tabela vs Pago
      expect(getByText('R$ 33,50')).toBeTruthy();
      expect(getByText('R$ 31,55')).toBeTruthy();

      // Pedidos
      expect(getByText('Caixa de Alimentos')).toBeTruthy();
      expect(getByText('-R$ 1,95 (10.5%)')).toBeTruthy();
      expect(getByText('Remédios Rápidos')).toBeTruthy();
    });
  });

  it('allows merchant to filter orders between rateio and express', async () => {
    jest.spyOn(financialService, 'getClientStatement').mockResolvedValue(mockClientData);

    const { getByText, queryByText } = render(<ClientFinancialScreen />);

    await waitFor(() => {
      expect(getByText('Caixa de Alimentos')).toBeTruthy();
      expect(getByText('Remédios Rápidos')).toBeTruthy();
    });

    // Filtra apenas com rateio (desconto)
    const rateioFilter = getByText('Com Rateio (1)');
    fireEvent.press(rateioFilter);

    expect(getByText('Caixa de Alimentos')).toBeTruthy();
    expect(queryByText('Remédios Rápidos')).toBeNull();

    // Filtra apenas expressos
    const expressFilter = getByText('Expressos (1)');
    fireEvent.press(expressFilter);

    expect(queryByText('Caixa de Alimentos')).toBeNull();
    expect(getByText('Remédios Rápidos')).toBeTruthy();
  });

  it('renders courier financial statement with earnings hero card and rpm efficiency metric', async () => {
    jest.spyOn(financialService, 'getCourierStatement').mockResolvedValue(mockCourierData);

    const { getByText } = render(<CourierFinancialScreen />);

    await waitFor(() => {
      expect(getByText('Extrato de Ganhos')).toBeTruthy();
      // Faturamento e Rendimento
      expect(getByText('Faturamento Total Acumulado')).toBeTruthy();
      expect(getByText('R$ 49,75')).toBeTruthy();
      expect(getByText('R$ 3,32 / km rodado')).toBeTruthy();
      expect(getByText('15 km percorridos')).toBeTruthy();

      // Frete base e bônus de rateio
      expect(getByText('R$ 43,50')).toBeTruthy();
      expect(getByText('+R$ 6,25')).toBeTruthy();

      // Aba de Lote Econômico
      expect(getByText('Lote #1')).toBeTruthy();
      expect(getByText('+R$ 6,25 Bônus')).toBeTruthy();
      expect(getByText('Total: R$ 33,75')).toBeTruthy();
    });
  });

  it('allows courier to toggle between economic batches and express orders tabs', async () => {
    jest.spyOn(financialService, 'getCourierStatement').mockResolvedValue(mockCourierData);

    const { getByText, queryByText } = render(<CourierFinancialScreen />);

    await waitFor(() => {
      expect(getByText('Lote #1')).toBeTruthy();
    });

    // Alterna para aba de entregas expressas
    const expressTab = getByText('Entregas Expressas (1)');
    fireEvent.press(expressTab);

    expect(queryByText('Lote #1')).toBeNull();
    expect(getByText('Pizza Família')).toBeTruthy();
    expect(getByText('R$ 16,00')).toBeTruthy();
  });
});
