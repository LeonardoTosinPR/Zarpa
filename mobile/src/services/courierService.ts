import { api } from './api';

export interface ExpressOrder {
  id: number;
  client_id: number;
  courier_id: number | null;
  package_description: string;
  package_weight_kg: number;
  shipping_type: 'express' | 'economic';
  status: 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'canceled';
  individual_freight_price: string | number;
  final_freight_price: string | number | null;
  distance_km: number;
  estimated_duration_minutes: number;
  route_geometry: string | null;
  origin_address: string;
  dest_address: string;
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  pickup_distance_km?: number;
  client?: {
    id: number;
    business_name: string;
    cnpj_cpf?: string;
    user?: {
      id: number;
      name: string;
      email: string;
      phone?: string;
    };
  };
  created_at: string;
}

export interface RadarResponse {
  courier: {
    id: number;
    is_online: boolean;
    current_lat: number;
    current_lng: number;
    cluster_radius_km: number;
  };
  orders_count: number;
  orders: ExpressOrder[];
  timestamp: string;
}

export interface AcceptExpressResponse {
  success: boolean;
  message: string;
  order: ExpressOrder;
}

export const courierService = {
  /**
   * Consulta os pedidos expressos pendentes no raio do entregador.
   */
  async getRadar(lat?: number, lng?: number): Promise<RadarResponse> {
    const params = lat !== undefined && lng !== undefined ? { lat, lng } : {};
    const response = await api.get<RadarResponse>('/courier/radar', { params });
    return response.data;
  },

  /**
   * Aceita uma corrida expressa no radar com tratamento de concorrência pessimista.
   */
  async acceptExpressOrder(orderId: number): Promise<AcceptExpressResponse> {
    const response = await api.post<AcceptExpressResponse>(
      `/orders/${orderId}/accept-express`
    );
    return response.data;
  },

  /**
   * Recusa uma corrida expressa no radar, impedindo que ela reapareça para o condutor.
   */
  async rejectExpressOrder(orderId: number, reason?: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(
      `/orders/${orderId}/reject-express`,
      { reason }
    );
    return response.data;
  },

  /**
   * Atualiza o status online/offline do entregador no radar.
   */
  async updateStatus(isOnline: boolean): Promise<{ message: string; is_online: boolean }> {
    const response = await api.patch<{ message: string; is_online: boolean }>(
      '/courier/status',
      { is_online: isOnline }
    );
    return response.data;
  },

  /**
   * Atualiza as coordenadas GPS atuais do condutor.
   */
  async updateLocation(lat: number, lng: number): Promise<any> {
    const response = await api.post('/courier/location', { lat, lng });
    return response.data;
  },

  /**
   * Busca detalhes completos do pedido pelo ID.
   */
  async getOrderDetails(orderId: number): Promise<{ order: ExpressOrder }> {
    const response = await api.get<{ order: ExpressOrder }>(`/orders/${orderId}`);
    return response.data;
  },

  /**
   * Obtém os dados de perfil do entregador logado.
   */
  async getProfile(): Promise<{
    message: string;
    courier: {
      id: number;
      cluster_radius_km: number | string;
      vehicle_type: 'motorcycle' | 'bicycle' | 'car';
      vehicle_plate?: string;
      cnh?: string;
      is_online: boolean;
      current_lat?: number;
      current_lng?: number;
    };
    user: {
      id: number;
      name: string;
      email: string;
      phone?: string;
      role: string;
    };
  }> {
    const response = await api.get('/courier/profile');
    return response.data;
  },

  /**
   * Atualiza dados de perfil do entregador (como raio de atuação em km, veículo, etc).
   */
  async updateProfile(data: {
    cluster_radius_km?: number;
    vehicle_type?: 'motorcycle' | 'bicycle' | 'car';
    vehicle_plate?: string;
    cnh?: string;
    name?: string;
    phone?: string;
  }): Promise<{
    message: string;
    courier: any;
    user: any;
  }> {
    const response = await api.patch('/courier/profile', data);
    return response.data;
  },
};
