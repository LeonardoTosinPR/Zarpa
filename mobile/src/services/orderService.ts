import { api } from './api';

export interface GeocodeResult {
  display_name: string;
  place_name?: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  source: string;
}

export interface RouteEstimate {
  distance_km: number;
  duration_minutes: number;
  polyline_geometry: string | null;
  source: string;
}

export interface PricingEstimate {
  base_fee: number;
  price_per_km: number;
  distance_km: number;
  distance_cost: number;
  weight_kg: number;
  overweight_kg: number;
  weight_cost: number;
  shipping_type: 'express' | 'economic';
  individual_price: number;
  estimated_discount: number;
  estimated_final_price: number;
  estimated_savings_percent: number;
  modalities: {
    express: {
      title: string;
      price: number;
      description: string;
      savings: number;
    };
    economic: {
      title: string;
      price: number;
      projected_price: number;
      projected_savings: number;
      description: string;
    };
  };
}

export interface EstimateResponse {
  route: RouteEstimate;
  pricing: PricingEstimate;
}

export interface CreateOrderPayload {
  package_description: string;
  package_weight_kg: number;
  package_volume_m3?: number | null;
  shipping_type: 'express' | 'economic';
  origin_address: string;
  dest_address: string;
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
}

export interface OrderItem {
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
  route_geometry: string | null;
  origin_address: string;
  dest_address: string;
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  created_at: string;
  courier?: {
    id: number;
    user?: {
      name: string;
      phone: string;
    };
  } | null;
}

export const orderService = {
  /**
   * Autocomplete de endereços para Guarapuava
   */
  async geocode(query: string): Promise<GeocodeResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    const response = await api.get<{ query: string; results: GeocodeResult[] }>(
      '/orders/geocode',
      { params: { q: query.trim() } }
    );
    return response.data.results || [];
  },

  /**
   * Cotação de frete e roteamento OSRM
   */
  async estimate(payload: {
    origin_lat: number;
    origin_lng: number;
    dest_lat: number;
    dest_lng: number;
    package_weight_kg?: number;
    shipping_type?: 'express' | 'economic';
  }): Promise<EstimateResponse> {
    const response = await api.post<EstimateResponse>('/orders/estimate', payload);
    return response.data;
  },

  /**
   * Criação do pedido pelo lojista
   */
  async create(payload: CreateOrderPayload): Promise<{ message: string; order: OrderItem }> {
    const response = await api.post<{ message: string; order: OrderItem }>('/orders', payload);
    return response.data;
  },

  /**
   * Lista os pedidos do lojista autenticado
   */
  async getMyOrders(status?: string): Promise<{ data: OrderItem[] }> {
    const response = await api.get<{ data: OrderItem[] }>('/orders/my-orders', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  /**
   * Detalhes de um pedido específico
   */
  async getById(id: number): Promise<{ order: OrderItem }> {
    const response = await api.get<{ order: OrderItem }>(`/orders/${id}`);
    return response.data;
  },
};
