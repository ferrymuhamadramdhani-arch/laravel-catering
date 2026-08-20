import type { Order } from './order';
import type { DeliveryArea } from './crm';

export interface DeliveryProof {
  id: number;
  tenant_id: number;
  delivery_id: number;
  order_id: number;
  receiver_name: string;
  photo_url?: string;
  signature_data?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  delivered_at: string;
  created_at: string;
}

export interface Delivery {
  id: number;
  tenant_id: number;
  order_id: number;
  delivery_number: string;
  delivery_batch_code?: string;
  delivery_area_id?: number;
  courier_name: string;
  courier_phone?: string;
  vehicle_type: 'motorcycle' | 'car' | 'van' | 'truck';
  vehicle_plate_number?: string;
  destination_address?: string;
  recipient_name?: string;
  recipient_phone?: string;
  delivery_time_target?: string;
  status: 'assigned' | 'dispatched' | 'arrived' | 'delivered' | 'failed';
  dispatched_at?: string;
  delivered_at?: string;
  assigned_by?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  order?: Order;
  delivery_area?: DeliveryArea;
  proof?: DeliveryProof;
}

export interface TodayDeliveriesResponse {
  date: string;
  total_deliveries: number;
  unassigned_orders_count: number;
  deliveries: Delivery[];
  unassigned_orders: Order[];
}

export interface OfflineDeliveryRecord {
  id: string; // client local uuid
  delivery_id?: number;
  order_id?: number;
  order_number?: string;
  status?: 'assigned' | 'dispatched' | 'arrived' | 'delivered' | 'failed';
  receiver_name?: string;
  signature_data?: string;
  photo_url?: string;
  notes?: string;
  delivered_at?: string;
  synced: boolean;
  timestamp: number;
}
