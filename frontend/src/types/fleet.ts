export type VehicleType = 'motorcycle' | 'car' | 'van' | 'truck';
export type VehicleCondition = 'good' | 'maintenance' | 'repairing';

export interface Courier {
  id: number;
  tenant_id: number;
  name: string;
  phone: string;
  license_type: string;
  license_number?: string | null;
  vehicle_type_preference: VehicleType;
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Vehicle {
  id: number;
  tenant_id: number;
  name: string;
  vehicle_type: VehicleType;
  license_plate: string;
  max_capacity_box: number;
  is_active: boolean;
  condition_status: VehicleCondition;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AvailableCourierResource {
  id: number;
  name: string;
  phone: string;
  license_type: string;
  vehicle_type_preference: VehicleType;
  is_available: boolean;
  status_label: 'Tersedia' | 'Sedang Mengantar';
  current_job?: {
    delivery_number: string;
    order_number: string;
    time_target: string;
  } | null;
}

export interface AvailableVehicleResource {
  id: number;
  name: string;
  vehicle_type: VehicleType;
  license_plate: string;
  max_capacity_box: number;
  condition_status: VehicleCondition;
  is_available: boolean;
  status_label: 'Tersedia' | 'Sedang Digunakan' | 'Dalam Perbaikan';
  current_job?: {
    delivery_number: string;
    order_number: string;
    time_target: string;
  } | null;
}

export interface AvailableResourcesResponse {
  date: string;
  time?: string | null;
  couriers: AvailableCourierResource[];
  vehicles: AvailableVehicleResource[];
  available_couriers_count: number;
  available_vehicles_count: number;
}
