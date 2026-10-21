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
  delivery_code?: string | null;
  proof_photo_url?: string | null;
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

export interface AdminBatchGroupItem {
  id: number;
  courier_id: number | null;
  scheduled_date: string;
  total_distance_km: number;
  total_duration_minutes: number;
  status: string;
  total_combined_cost: number;
  total_savings_generated: number;
  courier_bonus: number;
  courier?: {
    id: number;
    user?: {
      name: string;
    };
  } | null;
  orders?: Array<{ id: number }>;
}

export interface AdminBatchSummary {
  pending_economic_orders: number;
  total_weight_kg: number;
  next_batch_scheduled: string;
  recent_groups: AdminBatchGroupItem[];
}

export interface ProcessBatchResult {
  success: boolean;
  message: string;
  scheduled_date?: string;
  orders_processed: number;
  groups_created: number;
  unassigned_orders?: number;
  total_savings_generated: number;
  groups?: any[];
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

  /**
   * Consulta o resumo da fila de pedidos econômicos pendentes e lotes recentes
   */
  async getBatchSummary(): Promise<AdminBatchSummary> {
    const res = await api.get('/batch/summary');
    return res.data;
  },

  /**
   * Dispara manualmente o processamento do lote econômico noturno (Rateio 50/50)
   */
  async processEconomicBatch(params?: {
    scheduled_date?: string;
    radius?: number;
    dry_run?: boolean;
  }): Promise<ProcessBatchResult> {
    const res = await api.post('/batch/process-economic', params || {});
    return res.data;
  },
};
