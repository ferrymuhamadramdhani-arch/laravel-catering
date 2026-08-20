export interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  max_orders_per_month: number;
  max_branches: number;
  max_staff_users: number;
  features: string[];
  is_active: boolean;
  subscriptions_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TenantSubscription {
  id: number;
  tenant_id: number;
  subscription_plan_id: number;
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'suspended';
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  trial_ends_at?: string;
  plan?: SubscriptionPlan;
}

export interface TenantListItem {
  id: number;
  name: string;
  slug: string;
  domain?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active: boolean;
  onboarding_completed: boolean;
  subscription_plan?: string;
  created_at: string;
  users_count?: number;
  monthly_orders_count?: number;
  subscription?: TenantSubscription;
}

export interface SaaSMetrics {
  mrr: number;
  arr: number;
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  total_platform_orders: number;
  total_platform_gmv: number;
  plan_distribution: {
    id: number;
    name: string;
    slug: string;
    active_subscribers_count: number;
  }[];
  system_health: {
    database: string;
    queue_workers: string;
    redis_cache: string;
    uptime: string;
  };
}
