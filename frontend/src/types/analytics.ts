export interface AnalyticsOverview {
  start_date: string;
  end_date: string;
  total_orders: number;
  gross_revenue: number;
  paid_revenue: number;
  total_hpp: number;
  gross_profit: number;
  gross_margin_percentage: number;
  average_order_value: number;
  daily_trends: {
    date: string;
    total_orders: number;
    total_revenue: number;
  }[];
}

export interface MenuItemPerformance {
  name: string;
  type: string;
  total_portions_sold: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  selling_price: number;
  unit_hpp: number;
  margin_percentage: number;
}

export interface CustomerAnalytics {
  total_customers: number;
  active_customers: number;
  repeat_customers: number;
  single_order_customers: number;
  repeat_order_rate_percentage: number;
  top_vip_clients: {
    id: number;
    name: string;
    phone: string;
    email?: string;
    company_name?: string;
    total_orders: number;
    total_spend: number;
    average_spend_per_order: number;
  }[];
}

export interface ForecastDailyTimeline {
  date: string;
  day_name: string;
  estimated_portions: number;
}

export interface ForecastRawMaterial {
  raw_material_id: number;
  material_name: string;
  unit: string;
  daily_average_usage: number;
  projected_total_quantity: number;
  unit_price: number;
  estimated_total_cost: number;
}

export interface DemandForecast {
  forecast_period_days: number;
  historical_avg_daily_portions: number;
  forecast_daily_portions_baseline: number;
  total_estimated_procurement_cost: number;
  daily_timeline: ForecastDailyTimeline[];
  forecasted_materials: ForecastRawMaterial[];
}

export interface FinancialReport {
  tenant_name: string;
  start_date: string;
  end_date: string;
  revenue: {
    gross_sales: number;
    realized_cash_in: number;
    accounts_receivable: number;
  };
  cost_of_goods_sold: {
    total_cogs: number;
    breakdown_by_category: {
      category: string;
      total_cost: number;
      percentage: number;
    }[];
  };
  profitability: {
    gross_profit: number;
    gross_margin_percentage: number;
    net_operating_income: number;
  };
}
