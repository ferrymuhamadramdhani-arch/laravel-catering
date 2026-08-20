import type { RawMaterial } from './menu';
export type { RawMaterial };

export type StockMovementType = 'in' | 'out' | 'adjustment';

export type StockReferenceType =
  | 'manual'
  | 'purchase_receipt'
  | 'order_usage'
  | 'stock_opname'
  | 'waste_damage'
  | 'expired';

export interface StockLedger {
  id: number;
  tenant_id: number;
  raw_material_id: number;
  type: StockMovementType;
  quantity: number | string;
  stock_before: number | string;
  stock_after: number | string;
  unit_cost?: number | string | null;
  total_cost?: number | string | null;
  reference_type: string;
  reference_id?: number | null;
  notes?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  raw_material?: RawMaterial;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface InventorySummary {
  total_items: number;
  total_valuation: number;
  safe_items_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

export interface StockInPayload {
  raw_material_id: number;
  quantity: number;
  unit_cost?: number;
  notes?: string;
  reference_type?: string;
}

export interface StockOutPayload {
  raw_material_id: number;
  quantity: number;
  notes?: string;
  reference_type?: string;
}

export interface StockOpnamePayload {
  raw_material_id: number;
  physical_stock: number;
  notes?: string;
}
