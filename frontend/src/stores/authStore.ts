import { create } from 'zustand';
import type { AuthState, Tenant, User } from '../types/auth';

const savedToken = localStorage.getItem('cateros_token');
const savedUser = localStorage.getItem('cateros_user')
  ? JSON.parse(localStorage.getItem('cateros_user')!)
  : null;
const savedTenant = localStorage.getItem('cateros_tenant')
  ? JSON.parse(localStorage.getItem('cateros_tenant')!)
  : null;

export const useAuthStore = create<AuthState>((set) => ({
  user: savedUser,
  token: savedToken,
  currentTenant: savedTenant,
  isAuthenticated: !!savedToken,
  isLoading: false,

  login: (user: User, token: string, tenant?: Tenant) => {
    const activeTenant = tenant || user.current_tenant || (user.tenants && user.tenants[0]) || null;
    localStorage.setItem('cateros_token', token);
    localStorage.setItem('cateros_user', JSON.stringify(user));
    if (activeTenant) {
      localStorage.setItem('cateros_tenant', JSON.stringify(activeTenant));
      localStorage.setItem('cateros_tenant_id', String(activeTenant.id));
    }
    set({
      user,
      token,
      currentTenant: activeTenant,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem('cateros_token');
    localStorage.removeItem('cateros_user');
    localStorage.removeItem('cateros_tenant');
    localStorage.removeItem('cateros_tenant_id');
    set({
      user: null,
      token: null,
      currentTenant: null,
      isAuthenticated: false,
    });
  },

  setCurrentTenant: (tenant: Tenant) => {
    localStorage.setItem('cateros_tenant', JSON.stringify(tenant));
    localStorage.setItem('cateros_tenant_id', String(tenant.id));
    set({ currentTenant: tenant });
  },

  setUser: (user: User) => {
    localStorage.setItem('cateros_user', JSON.stringify(user));
    set({ user });
  },
}));
