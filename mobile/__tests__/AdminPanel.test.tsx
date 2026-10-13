import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { AdminPanelScreen } from '../src/screens/AdminPanelScreen';
import { adminService, AdminUserItem, AdminOrderItem } from '../src/services/adminService';
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

describe('Admin Panel Modules (Gestão Global do App)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUsers: AdminUserItem[] = [
    {
      id: 1,
      name: 'Supermercado Compre Mais',
      email: 'compremais@zarpa.com.br',
      phone: '(42) 3622-1000',
      role: 'client',
      created_at: '2026-10-01T10:00:00Z',
      client: {
        id: 1,
        business_name: 'Supermercado Compre Mais',
        cnpj_cpf: '01.234.567/0001-89',
        default_address: 'Rua Saldanha Marinho, 1500 - Centro',
        default_lat: -25.3905,
        default_lng: -51.4628,
      },
    },
    {
      id: 2,
      name: 'Lucas Motoboy Guarapuava',
      email: 'lucas.moto@zarpa.com.br',
      phone: '(42) 99888-1234',
      role: 'courier',
      created_at: '2026-10-02T10:00:00Z',
      courier: {
        id: 1,
        cnh: '12345678901',
        vehicle_type: 'Honda CG 160',
        vehicle_plate: 'BRA2E19',
        cluster_radius_km: 10,
        is_online: true,
        is_active: true,
        current_lat: -25.395,
        current_lng: -51.46,
      },
    },
    {
      id: 3,
      name: 'Administrador Master',
      email: 'admin@zarpa.com.br',
      phone: '(42) 99999-0000',
      role: 'admin',
      created_at: '2026-09-20T10:00:00Z',
    },
  ];

  const mockOrders: AdminOrderItem[] = [
    {
      id: 501,
      client_id: 1,
      courier_id: 2,
      package_description: 'Cesta de Produtos Farmácia',
      package_weight_kg: 1.5,
      package_volume_m3: null,
      shipping_type: 'express',
      status: 'assigned',
      is_anchor: false,
      individual_freight_price: 15.0,
      final_freight_price: 15.0,
      distance_km: 3.5,
      estimated_duration_minutes: 10,
      origin_address: 'Rua Saldanha Marinho, 1200 - Centro',
      dest_address: 'Av. Professora Laura, 500 - Bonsucesso',
      origin_lat: -25.3905,
      dest_lat: -25.3582,
      created_at: '2026-10-05T14:00:00Z',
      client: {
        id: 1,
        business_name: 'Farmácia Trajano',
        user: {
          name: 'Farmácia Trajano',
          email: 'trajano@zarpa.com.br',
          phone: '(42) 3623-1111',
        },
      },
      courier: {
        id: 1,
        vehicle_type: 'Honda CG 160',
        vehicle_plate: 'BRA2E19',
        user: {
          name: 'Lucas Motoboy Guarapuava',
          phone: '(42) 99888-1234',
        },
      },
    },
    {
      id: 502,
      client_id: 1,
      courier_id: null,
      package_description: 'Pedido Econômico Doces',
      package_weight_kg: 2.0,
      package_volume_m3: null,
      shipping_type: 'economic',
      status: 'pending',
      is_anchor: false,
      individual_freight_price: 18.0,
      final_freight_price: 15.5,
      distance_km: 5.2,
      estimated_duration_minutes: 15,
      origin_address: 'Rua XV de Novembro, 7000 - Centro',
      dest_address: 'Rua Salvatore, 100 - Bonsucesso',
      origin_lat: -25.395,
      dest_lat: -25.3582,
      created_at: '2026-10-05T14:30:00Z',
      client: {
        id: 1,
        business_name: 'Sorveteria Emy',
        user: {
          name: 'Sorveteria Emy',
          email: 'emy@zarpa.com.br',
          phone: '(42) 3624-2222',
        },
      },
      courier: null,
    },
  ];

  it('renders admin panel and displays all system users and metric indicators', async () => {
    jest.spyOn(adminService, 'getUsers').mockResolvedValue({
      users: mockUsers,
      metrics: {
        total: 3,
        clients: 1,
        couriers: 1,
        admins: 1,
        online_couriers: 1,
      },
    });

    const { findByText, getByText, getAllByText, getByTestId } = render(
      <AuthProvider>
        <AdminPanelScreen />
      </AuthProvider>
    );

    // Valida cabeçalho
    expect(getByText('Painel Administrativo Master')).toBeTruthy();
    expect(getByText('Auditoria e Gestão Operacional Global')).toBeTruthy();

    // Valida métricas
    const totalUsers = await findByText('Total Usuários');
    expect(totalUsers).toBeTruthy();
    expect(getAllByText('Lojistas').length).toBeGreaterThan(0);
    expect(getAllByText('Entregadores').length).toBeGreaterThan(0);

    // Valida cartões de usuários
    expect(getByText('Supermercado Compre Mais')).toBeTruthy();
    expect(getByText('Lucas Motoboy Guarapuava')).toBeTruthy();
    expect(getByText('Administrador Master')).toBeTruthy();

    // Valida dados específicos
    expect(getByText('CNPJ/CPF: 01.234.567/0001-89')).toBeTruthy();
    expect(getByText('Disponível no Radar')).toBeTruthy();
    expect(getByTestId('admin-user-card-1')).toBeTruthy();
    expect(getByTestId('admin-user-card-2')).toBeTruthy();
  });

  it('switches to orders tab and displays all system orders with metrics and filters', async () => {
    jest.spyOn(adminService, 'getUsers').mockResolvedValue({
      users: mockUsers,
      metrics: {
        total: 3,
        clients: 1,
        couriers: 1,
        admins: 1,
        online_couriers: 1,
      },
    });

    jest.spyOn(adminService, 'getOrders').mockResolvedValue({
      orders: mockOrders,
      metrics: {
        total: 2,
        express: 1,
        economic: 1,
        pending: 1,
        in_progress: 1,
        delivered: 0,
        canceled: 0,
        total_freight_value: 33.0,
      },
    });

    const { getByTestId, findByText, getByText, getAllByText } = render(
      <AuthProvider>
        <AdminPanelScreen />
      </AuthProvider>
    );

    // Clica na aba de pedidos
    const ordersTabBtn = getByTestId('admin-tab-orders');
    fireEvent.press(ordersTabBtn);

    // Valida métricas de pedidos
    const totalOrdersLbl = await findByText('Total Pedidos');
    expect(totalOrdersLbl).toBeTruthy();
    expect(getByText('Expressos')).toBeTruthy();
    expect(getByText('Econômicos')).toBeTruthy();

    // Valida pedidos listados
    expect(getByText('#501')).toBeTruthy();
    expect(getByText('Cesta de Produtos Farmácia')).toBeTruthy();
    expect(getAllByText('⚡ Expresso').length).toBeGreaterThan(0);

    expect(getByText('#502')).toBeTruthy();
    expect(getByText('Pedido Econômico Doces')).toBeTruthy();
    expect(getAllByText('🌙 Econômico').length).toBeGreaterThan(0);

    // Valida lojistas e entregadores dos pedidos
    expect(getByText('Farmácia Trajano')).toBeTruthy();
    expect(getByText('Lucas Motoboy Guarapuava')).toBeTruthy();
    expect(getByText('Aguardando atribuição')).toBeTruthy();
  });
});
