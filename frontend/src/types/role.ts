export interface PermissionItem {
  key: string;
  label: string;
  description: string;
}

export interface PermissionGroup {
  module: string;
  label: string;
  description: string;
  permissions: PermissionItem[];
}

export interface Role {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  permissions: string[];
  permissions_count: number;
  is_system: boolean;
  users_count: number;
  created_at: string;
}
