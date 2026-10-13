import { api } from './api';

export interface ClientFinancialOrder {
  id: number;
  package_description: string;
  shipping_type: 'express' | 'economic';
  status: string;
  individual_freight_price: number;
  final_freight_price: number;
  discount_amount: number;
  discount_percent: number;
  has_batch_discount: boolean;
  distance_km: number;
  created_at: string;
  origin_address: string;
  dest_address: string;
  delivery_group_id?: number | null;
}

export interface ClientFinancialSummary {
  total_orders_count: number;
  economic_orders_count: number;
  express_orders_count: number;
  total_original_freight: number;
  total_final_freight: number;
  total_savings: number;
  average_savings_percent: number;
}

export interface ClientFinancialResponse {
  success: boolean;
  client: {
    id: number;
    business_name: string;
  };
  summary: ClientFinancialSummary;
  orders: ClientFinancialOrder[];
}

export interface CourierBatchItem {
  id: number;
  scheduled_date: string;
  status: string;
  total_distance_km: number;
  total_duration_minutes: number;
  orders_count: number;
  route_fare?: number;
  stop_fee_total?: number;
  base_earnings: number;
  courier_bonus: number;
  total_earnings: number;
  savings_generated: number;
}

export interface CourierExpressItem {
  id: number;
  dest_address: string;
  package_description: string;
  status: string;
  distance_km: number;
  freight_price: number;
  created_at: string;
}

export interface CourierFinancialSummary {
  total_deliveries_count: number;
  economic_batches_count: number;
  express_deliveries_count: number;
  total_distance_km: number;
  total_base_earnings: number;
  total_stop_fees?: number;
  total_batch_bonus: number;
  total_earnings: number;
  earnings_per_km: number;
}


export interface CourierFinancialResponse {
  success: boolean;
  courier: {
    id: number;
    cnh: string;
    vehicle_type: string;
  };
  summary: CourierFinancialSummary;
  batches: CourierBatchItem[];
  express_orders: CourierExpressItem[];
}

export const financialService = {
  /**
   * Consulta o extrato financeiro transparente do Lojista.
   */
  async getClientStatement(): Promise<ClientFinancialResponse> {
    const response = await api.get<ClientFinancialResponse>('/client/financial-statement');
    return response.data;
  },

  /**
   * Consulta o extrato financeiro detalhado do Entregador com bônus e rendimento por km.
   */
  async getCourierStatement(): Promise<CourierFinancialResponse> {
    const response = await api.get<CourierFinancialResponse>('/courier/financial-statement');
    return response.data;
  },
};
