export interface Branch {
  id: number;
  tenant_id: number;
  name: string;
  code?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  pic_name?: string;
  is_main: boolean;
  is_active: boolean;
  orders_count?: number;
  outgoing_transfers_count?: number;
  incoming_transfers_count?: number;
  created_at: string;
  updated_at: string;
}

export interface StockTransferItem {
  id: number;
  stock_transfer_id: number;
  raw_material_id: number;
  quantity: number;
  unit: string;
  notes?: string;
  raw_material?: {
    id: number;
    name: string;
    code?: string;
    unit: string;
    current_stock: number;
  };
}

export interface StockTransfer {
  id: number;
  tenant_id: number;
  transfer_number: string;
  from_branch_id: number;
  to_branch_id: number;
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  notes?: string;
  created_by?: number;
  received_by?: number;
  transferred_at?: string;
  received_at?: string;
  created_at: string;
  from_branch?: Branch;
  to_branch?: Branch;
  creator?: {
    id: number;
    name: string;
  };
  receiver?: {
    id: number;
    name: string;
  };
  items: StockTransferItem[];
}
