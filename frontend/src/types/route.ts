export interface OptimizedStop {
  stop_number: number;
  delivery_id: number;
  delivery_number: string;
  order_number?: string;
  recipient_name: string;
  recipient_phone?: string;
  destination_address: string;
  target_delivery_time: string;
  status: string;
  courier_name: string;
  leg_estimated_distance_km: number;
  leg_estimated_duration_minutes: number;
}

export interface OptimizedRouteResult {
  target_date: string;
  origin: {
    branch_id?: number;
    name: string;
    address: string;
  };
  total_stops: number;
  total_estimated_distance_km: number;
  total_estimated_duration_minutes: number;
  google_maps_directions_url: string | null;
  ordered_stops: OptimizedStop[];
}
