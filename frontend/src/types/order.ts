import type { Customer, DeliveryArea } from './crm';
import type { MenuItem, MenuPackage } from './menu';

export type OrderStatus =
  | 'draft'
  | 'confirmed'
  | 'in_production'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

export interface OrderItem {
  id?: number;
  order_id?: number;
  item_type: 'menu_package' | 'menu_item' | 'custom';
  menu_package_id?: number | null;
  menu_item_id?: number | null;
  item_name: string;
  unit_price: number | string;
  unit_hpp: number | string;
  quantity: number;
  subtotal_price: number | string;
  subtotal_hpp: number | string;
  portion_unit: string;
  notes?: string | null;
  package?: MenuPackage;
  menu_item?: MenuItem;
}

export interface OrderStatusHistory {
  id: number;
  order_id: number;
  from_status?: string | null;
  to_status: string;
  changed_by?: number | null;
  notes?: string | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role?: string;
  };
}

export interface Order {
  id: number;
  tenant_id: number;
  customer_id: number;
  order_number: string;
  event_name?: string | null;
  event_type: string;
  delivery_date: string;
  delivery_time?: string | null;
  delivery_area_id?: number | null;
  delivery_address?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  subtotal_amount: number | string;
  delivery_fee: number | string;
  discount_amount: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  total_hpp: number | string;
  down_payment_amount: number | string;
  payment_status: PaymentStatus;
  payment_gateway_provider?: string | null;
  payment_gateway_ref?: string | null;
  snap_token?: string | null;
  tracking_code?: string | null;
  status: OrderStatus;
  cancellation_reason?: string | null;
  notes?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  delivery_area?: DeliveryArea;
  creator?: {
    id: number;
    name: string;
  };
  items?: OrderItem[];
  status_histories?: OrderStatusHistory[];
}

export interface CalendarDaySummary {
  date: string;
  total_orders: number;
  total_portions: number;
  orders: {
    id: number;
    order_number: string;
    customer_name?: string;
    event_name?: string | null;
    event_type: string;
    delivery_time?: string | null;
    status: OrderStatus;
    total_amount: number | string;
    items_count: number;
    total_pax: number;
  }[];
}
