export type UserRole = 'client' | 'courier' | 'admin';

export type VehicleType = 'motorcycle' | 'bicycle' | 'car';

export interface ClientProfile {
  id: number;
  user_id: number;
  business_name: string;
  cnpj_cpf: string;
  default_address?: string | null;
  default_lat?: number | string | null;
  default_lng?: number | string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CourierProfile {
  id: number;
  user_id: number;
  cnh: string;
  vehicle_type: VehicleType;
  vehicle_plate?: string | null;
  current_lat?: number | string | null;
  current_lng?: number | string | null;
  cluster_radius_km: number | string;
  is_online: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  client?: ClientProfile | null;
  courier?: CourierProfile | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterClientPayload {
  name: string;
  email: string;
  password: string;
  role: 'client';
  phone?: string;
  business_name: string;
  cnpj_cpf: string;
  default_address?: string;
  default_lat?: number;
  default_lng?: number;
}

export interface RegisterCourierPayload {
  name: string;
  email: string;
  password: string;
  role: 'courier';
  phone?: string;
  cnh: string;
  vehicle_type: VehicleType;
  vehicle_plate?: string;
  cluster_radius_km?: number;
}

export type RegisterPayload = RegisterClientPayload | RegisterCourierPayload;
