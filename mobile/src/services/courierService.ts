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

  /**
   * Confirma a coleta do pacote no remetente.
   */
  async confirmPickup(orderId: number): Promise<{ message: string; order: ExpressOrder }> {
    const response = await api.post<{ message: string; order: ExpressOrder }>(
      `/orders/${orderId}/pickup`
    );
    return response.data;
  },

  /**
   * Confirma a entrega do pacote ao destinatário final com comprovante opcional.
   */
  async confirmDelivery(orderId: number, proofPhotoUrl?: string): Promise<{ message: string; order: ExpressOrder }> {
    const response = await api.post<{ message: string; order: ExpressOrder }>(
      `/orders/${orderId}/deliver`,
      proofPhotoUrl ? { proof_photo_url: proofPhotoUrl } : {}
    );
    return response.data;
  },

  /**
   * Atualiza o status do pedido com validação de transição estrita.
   */
  async updateOrderStatus(
    orderId: number,
    status: 'picked_up' | 'delivered' | 'canceled',
    proofPhotoUrl?: string
  ): Promise<{ success: boolean; message: string; order: ExpressOrder }> {
    const response = await api.patch<{ success: boolean; message: string; order: ExpressOrder }>(
      `/orders/${orderId}/status`,
      { status, proof_photo_url: proofPhotoUrl }
    );
    return response.data;
  },

  /**
   * Envia foto ou URL de comprovante de entrega para o pedido.
   */
  async uploadProof(
    orderId: number,
    data: { photo_base64?: string; proof_url?: string }
  ): Promise<{ success: boolean; message: string; proof_photo_url: string; order: ExpressOrder }> {
    const response = await api.post<{ success: boolean; message: string; proof_photo_url: string; order: ExpressOrder }>(
      `/orders/${orderId}/proof`,
      data
    );
    return response.data;
  },

  /**
   * Consulta o lote econômico ativo para o condutor autenticado.
   */
  async getActiveGroup(): Promise<{ active_group: ActiveDeliveryGroup | null; message?: string }> {
    const response = await api.get<{ active_group: ActiveDeliveryGroup | null; message?: string }>(
      '/courier/active-group'
    );
    return response.data;
  },

  /**
   * Inicia a jornada de entregas do lote econômico.
   */
  async startDeliveryGroup(id: number): Promise<{ success: boolean; message: string; group: ActiveDeliveryGroup }> {
    const response = await api.post<{ success: boolean; message: string; group: ActiveDeliveryGroup }>(
      `/courier/delivery-groups/${id}/start`
    );
    return response.data;
  },

  /**
   * Conclui a jornada do lote econômico após todas as entregas realizadas.
   */
  async completeDeliveryGroup(id: number): Promise<{ success: boolean; message: string; group: ActiveDeliveryGroup }> {
    const response = await api.post<{ success: boolean; message: string; group: ActiveDeliveryGroup }>(
      `/courier/delivery-groups/${id}/complete`
    );
    return response.data;
  },

  /**
   * Cancela uma entrega em andamento pelo entregador.
   */
  async cancelActiveDelivery(
    orderId: number,
    reason?: string
  ): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      `/orders/${orderId}/cancel-delivery`,
      { reason }
    );
    return response.data;
  },

  /**
   * Consulta os lotes econômicos atribuídos ou disponíveis para o entregador.
   */
  async getDeliveryGroups(): Promise<{
    courier_id: number;
    total_groups: number;
    groups: any[];
  }> {
    const response = await api.get('/courier/delivery-groups');
    return response.data;
  },

  /**
   * Obtém detalhes completos de um lote econômico com a lista de paradas sequenciadas.
   */
  async getDeliveryGroupDetail(id: number): Promise<ActiveDeliveryGroup> {
    const response = await api.get(`/courier/delivery-groups/${id}`);
    return response.data;
  },

  /**
   * Dispara o processamento do lote econômico sob demanda (para testes manuais).
   */
  async processEconomicBatch(params?: {
    scheduled_date?: string;
    radius?: number;
    dry_run?: boolean;
  }): Promise<any> {
    const response = await api.post('/batch/process-economic', params || {});
    return response.data;
  },
};

export interface SequencedStop {
  id: number;
  stop_sequence: number;
  stop_type: 'pickup' | 'delivery';
  status: 'pending' | 'completed';
  completed_at?: string | null;
  order_id: number;
  order_status?: string;
  package_description?: string;
  package_weight_kg?: number;
  client_name?: string;
  client_phone?: string;
  address: string;
  lat: number;
  lng: number;
  isolated_distance_km: number;
  shared_distance_km: number;
  merchant_discount: number;
  proof_photo_url?: string | null;
}

export interface ActiveDeliveryGroup {
  id: number;
  courier_id: number;
  courier_name?: string;
  scheduled_date: string;
  total_distance_km: number;
  total_duration_minutes: number;
  status: 'created' | 'assigned' | 'in_progress' | 'completed' | 'canceled';
  total_combined_cost: number;
  total_savings_generated: number;
  route_fare: number;
  stop_fees: number;
  courier_bonus: number;
  total_earnings: number;
  route_geometry?: string | null;
  total_stops: number;
  completed_stops_count: number;
  current_stop?: SequencedStop;
  is_all_completed: boolean;
  stops: SequencedStop[];
}


