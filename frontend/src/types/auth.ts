export interface BankAccount {
  bank_name: string;
  account_number: string;
  account_name: string;
}

export interface OperatingHours {
  open: string;
  close: string;
  days: string[];
}

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  domain?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logo_url?: string | null;
  subscription_plan?: string;
  business_type?: string[] | null;
  service_areas?: string[] | null;
  operating_hours?: OperatingHours | null;
  bank_accounts?: BankAccount[] | null;
  is_active: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'owner' | 'admin' | 'sales' | 'kitchen' | 'warehouse' | 'courier' | 'customer';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  current_tenant_id?: number | null;
  current_tenant?: Tenant | null;
  tenants?: Tenant[];
  created_at: string;
  updated_at: string;
}

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  currentTenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string, tenant?: Tenant) => void;
  logout: () => void;
  setCurrentTenant: (tenant: Tenant) => void;
  setUser: (user: User) => void;
}
