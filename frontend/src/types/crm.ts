export interface Customer {
  id: number;
  tenant_id: number;
  name: string;
  type: 'individual' | 'corporate';
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  pic_name?: string | null;
  npwp?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Supplier {
  id: number;
  tenant_id: number;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  products_supplied?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DeliveryArea {
  id: number;
  tenant_id: number;
  name: string;
  city?: string | null;
  district?: string | null;
  postal_code?: string | null;
  delivery_fee: number | string;
  min_order_amount: number | string;
  estimated_delivery_minutes?: number | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}
