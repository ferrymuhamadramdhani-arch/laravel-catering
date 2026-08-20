import type { Order, OrderItem } from './order';
import type { MenuItem, MenuPackage } from './menu';

export type ProductionPlanStatus = 'draft' | 'in_progress' | 'ready_for_packing' | 'completed' | 'cancelled';
export type ProductionTaskStage = 'prep' | 'cooking' | 'packing' | 'qc' | 'completed';

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
  stage: ProductionTaskStage;
  assigned_to?: number | null;
  notes?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  order?: Order;
  order_item?: OrderItem;
  menu_item?: MenuItem;
  menu_package?: MenuPackage;
  assignee?: {
    id: number;
    name: string;
    email: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface ProductionPlan {
  id: number;
  tenant_id: number;
  plan_code: string;
  plan_date: string;
  total_orders: number;
  total_portions: number;
  status: ProductionPlanStatus;
  notes?: string | null;
  created_by?: number | null;
  completed_at?: string | null;
  creator?: {
    id: number;
    name: string;
  } | null;
  tasks?: ProductionTask[];
  created_at: string;
  updated_at: string;
}

export interface KitchenBOMRequirement {
  raw_material_id: number;
  name: string;
  category: string;
  unit: string;
  total_required: number;
  current_stock: number;
  shortage: number;
}
