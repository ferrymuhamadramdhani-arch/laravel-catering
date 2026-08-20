import type { MenuCategory, MenuItem, MenuPackage } from './menu';
import type { DeliveryArea } from './crm';
import type { Order } from './order';
import type { Invoice } from './finance';

export interface PublicTenantProfile {
  id: number;
  name: string;
  slug: string;
  logo_url?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  description?: string | null;
  bank_accounts?: Array<{
    bank_name: string;
    account_number: string;
    account_name: string;
  }>;
}

export interface PublicCatalogData {
  tenant: PublicTenantProfile;
  categories: MenuCategory[];
  packages: MenuPackage[];
  menu_items: MenuItem[];
  delivery_areas: DeliveryArea[];
}

export interface CartItem {
  id: string; // unique cart item key
  item_type: 'menu_package' | 'menu_item';
  item_id: number;
  name: string;
  price: number;
  portion_unit: string;
  quantity: number;
  notes?: string;
  package_items?: string[];
}

export interface PublicCheckoutPayload {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  event_name?: string;
  event_type: string;
  delivery_date: string;
  delivery_time?: string;
  delivery_area_id?: number;
  delivery_address: string;
  recipient_name?: string;
  recipient_phone?: string;
  items: Array<{
    item_type: 'menu_package' | 'menu_item';
    item_id: number;
    quantity: number;
    notes?: string;
  }>;
  notes?: string;
}

export interface PublicCheckoutResponse {
  order: Order;
  tracking_code: string;
  invoice: Invoice;
  bank_accounts?: Array<{
    bank_name: string;
    account_number: string;
    account_name: string;
  }>;
}
