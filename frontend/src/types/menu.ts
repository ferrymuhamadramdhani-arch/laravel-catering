export interface RawMaterial {
  id: number;
  tenant_id: number;
  name: string;
  code?: string | null;
  category: string;
  unit: string;
  default_purchase_price: number | string;
  minimum_stock: number | string;
  current_stock: number | string;
  notes?: string | null;
  created_at: string;
}

export interface MenuCategory {
  id: number;
  tenant_id: number;
  name: string;
  slug: string;
  description?: string | null;
  sort_order: number;
  menu_items_count?: number;
  created_at: string;
}

export interface MenuRecipeBom {
  id?: number;
  raw_material_id: number;
  quantity: number | string;
  unit: string;
  cost_per_unit?: number | string;
  subtotal_cost?: number | string;
  raw_material?: RawMaterial;
}

export interface MenuItem {
  id: number;
  tenant_id: number;
  menu_category_id?: number | null;
  name: string;
  slug: string;
  code?: string | null;
  image_url?: string | null;
  description?: string | null;
  selling_price: number | string;
  calculated_hpp: number | string;
  margin_percentage: number | string;
  portion_unit: string;
  is_active: boolean;
  category?: MenuCategory | null;
  recipes?: MenuRecipeBom[];
  created_at: string;
}

export interface MenuPackageItem {
  id?: number;
  menu_item_id: number;
  quantity: number;
  notes?: string | null;
  menu_item?: MenuItem;
}

export interface MenuPackage {
  id: number;
  tenant_id: number;
  name: string;
  slug: string;
  code?: string | null;
  package_type: string;
  image_url?: string | null;
  description?: string | null;
  selling_price: number | string;
  calculated_hpp: number | string;
  margin_percentage: number | string;
  min_order_quantity: number;
  is_active: boolean;
  package_items?: MenuPackageItem[];
  created_at: string;
}
