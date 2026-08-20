export interface ProductionPlan {
  id: number;
  tenant_id: number;
  plan_code: string;
  plan_date: string;
  total_orders: number;
  total_portions: number;
  status: 'draft' | 'in_progress' | 'ready_for_packing' | 'completed' | 'cancelled';
  notes?: string | null;
  created_by?: number | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductionTask {
  id: number;
  tenant_id: number;
  production_plan_id: number;
  order_id?: number | null;
  order_item_id?: number | null;
  menu_item_id?: number | null;
  menu_package_id?: number | null;
  item_name: string;
  quantity: number;
  portion_unit: string;
  stage: 'prep' | 'cooking' | 'packing' | 'qc' | 'completed';
  assigned_to?: number | null;
  notes?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  order?: {
    id: number;
    order_number: string;
    customer?: {
      name: string;
      phone: string;
    };
  };
  assignee?: {
    id: number;
    name: string;
  };
}

export interface BomRequirementItem {
  raw_material_id: number;
  name: string;
  category: string;
  unit: string;
  required_qty: number;
  current_stock: number;
  difference: number;
  status: 'sufficient' | 'low_stock' | 'out_of_stock';
}

export interface ProductionPlanDetailResponse {
  plan: ProductionPlan;
  bom_requirements: BomRequirementItem[];
  tasks: ProductionTask[];
  orders_count: number;
}

export interface KitchenLabelPayload {
  order_id: number;
  order_number: string;
  tracking_code: string;
  tenant_name: string;
  customer_name: string;
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  delivery_date: string;
  delivery_time: string;
  event_type: string;
  event_name?: string | null;
  total_portions: number;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string | null;
  }>;
  special_notes?: string | null;
  printed_at: string;
}
