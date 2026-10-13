import { api } from './api';

export interface AdminUserItem {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'client' | 'courier' | 'admin';
  created_at: string;
  client?: {
    id: number;
    business_name: string;
    cnpj_cpf: string;
    default_address: string;
    default_lat: number;
    default_lng: number;
  } | null;
  courier?: {
    id: number;
    cnh: string;
    vehicle_type: string;
    vehicle_plate: string;
    cluster_radius_km: number;
    is_online: boolean;
    is_active: boolean;
    current_lat: number | null;
    current_lng: number | null;
  } | null;
}

export interface AdminUsersMetrics {
  total: number;
  clients: number;
  couriers: number;
  admins: number;
  online_couriers: number;
}

export interface AdminOrderItem {
  id: number;
  client_id: number;
  courier_id: number | null;
  package_description: string;
  package_weight_kg: number;
  package_volume_m3: number | null;
  shipping_type: 'express' | 'economic';
  status: 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'canceled';
  is_anchor: boolean;
  individual_freight_price: number;
  final_freight_price: number | null;
  distance_km: number;
  estimated_duration_minutes: number;
  origin_address: string;
  dest_address: string;
  origin_lat: number;
  dest_lat: number;
  created_at: string;
  client?: {
    id: number;
    business_name: string;
    user?: {
      name: string;
      email: string;
      phone: string;
    };
  };
  courier?: {
    id: number;
    vehicle_type: string;
    vehicle_plate: string;
    user?: {
      name: string;
      phone: string;
    };
  } | null;
}

export interface AdminOrdersMetrics {
  total: number;
  express: number;
  economic: number;
  pending: number;
  in_progress: number;
  delivered: number;
  canceled: number;
  total_freight_value: number;
}

export const adminService = {
  /**
   * Consulta todos os usuários com suporte a filtros e métricas
   */
  async getUsers(params?: { role?: string; search?: string }): Promise<{
    users: AdminUserItem[];
    metrics: AdminUsersMetrics;
  }> {
    const res = await api.get('/admin/users', { params });
    return res.data;
  },

  /**
   * Consulta todos os pedidos com suporte a filtros e métricas
   */
  async getOrders(params?: {
    status?: string;
    shipping_type?: string;
    search?: string;
  }): Promise<{
    orders: AdminOrderItem[];
    metrics: AdminOrdersMetrics;
  }> {
    const res = await api.get('/admin/orders', { params });
    return res.data;
  },

  /**
   * Alterna ou atualiza o status de atividade (is_active) de um entregador pelo Admin
   */
  async toggleCourierStatus(courierId: number, isActive?: boolean): Promise<{
    message: string;
    courier: any;
  }> {
    const payload = isActive !== undefined ? { is_active: isActive } : {};
    const res = await api.patch(`/admin/couriers/${courierId}/status`, payload);
    return res.data;
  },
};
