import type { Order } from './order';
import type { Payment } from './finance';
import type { RawMaterial } from './menu';

export interface DashboardMetrics {
  revenue_this_month: number;
  total_receivables: number;
  total_invoices_count: number;
  paid_invoices_count: number;
  active_orders_count: number;
  today_orders_count: number;
  today_portions_count: number;
  completed_orders_this_month: number;
  low_stock_materials_count: number;
  pending_po_count: number;
  today_orders: Order[];
  priority_orders: Order[];
  low_stock_items: RawMaterial[];
  recent_payments: Payment[];
}
