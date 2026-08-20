import type { RawMaterial } from './menu';
import type { Supplier } from './crm';

export type PurchaseOrderStatus = 'draft' | 'approved' | 'partially_received' | 'completed' | 'cancelled';
export type GoodsReceiptStatus = 'draft' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  raw_material_id: number;
  quantity_ordered: number | string;
  quantity_received: number | string;
  unit_price: number | string;
  subtotal: number | string;
  notes?: string | null;
  raw_material?: RawMaterial;
}

export interface PurchaseOrder {
  id: number;
  tenant_id: number;
  po_number: string;
  supplier_id?: number | null;
  status: PurchaseOrderStatus;
  order_date: string;
  expected_delivery_date?: string | null;
  total_amount: number | string;
  notes?: string | null;
  approved_by?: number | null;
  approved_at?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier | null;
  items?: PurchaseOrderItem[];
  goods_receipts?: GoodsReceipt[];
  creator?: {
    id: number;
    name: string;
    email: string;
  } | null;
  approver?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface GoodsReceiptItem {
  id: number;
  goods_receipt_id: number;
  raw_material_id: number;
  purchase_order_item_id?: number | null;
  quantity_expected: number | string;
  quantity_received: number | string;
  unit_cost: number | string;
  total_cost: number | string;
  notes?: string | null;
  raw_material?: RawMaterial;
}

export interface GoodsReceipt {
  id: number;
  tenant_id: number;
  receipt_number: string;
  purchase_order_id?: number | null;
  supplier_id?: number | null;
  status: GoodsReceiptStatus;
  received_date?: string | null;
  notes?: string | null;
  received_by?: number | null;
  created_at: string;
  updated_at: string;
  purchase_order?: PurchaseOrder | null;
  supplier?: Supplier | null;
  items?: GoodsReceiptItem[];
  receiver?: {
    id: number;
    name: string;
    email: string;
  } | null;
}
