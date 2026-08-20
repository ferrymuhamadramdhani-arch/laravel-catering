import { create } from 'zustand';
import type { CartItem, PublicTenantProfile } from '../types/portal';

interface CartState {
  tenantSlug: string | null;
  tenantProfile: PublicTenantProfile | null;
  items: CartItem[];
  deliveryDate: string;
  deliveryTime: string;
  setTenantSlug: (slug: string) => void;
  setTenantProfile: (profile: PublicTenantProfile) => void;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateNotes: (id: string, notes: string) => void;
  setSchedule: (date: string, time: string) => void;
  clearCart: () => void;
  getTotalCount: () => number;
  getTotalPortions: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  tenantSlug: null,
  tenantProfile: null,
  items: [],
  deliveryDate: '',
  deliveryTime: '11:30',

  setTenantSlug: (slug) => {
    if (get().tenantSlug !== slug) {
      set({ tenantSlug: slug, items: [] });
    }
  },

  setTenantProfile: (tenantProfile) => {
    set({ tenantProfile });
  },

  addItem: (newItem) => {
    const existingIndex = get().items.findIndex(
      (it) => it.item_type === newItem.item_type && it.item_id === newItem.item_id
    );

    if (existingIndex > -1) {
      const updatedItems = [...get().items];
      updatedItems[existingIndex].quantity += newItem.quantity;
      set({ items: updatedItems });
    } else {
      const id = `${newItem.item_type}-${newItem.item_id}-${Date.now()}`;
      set({ items: [...get().items, { ...newItem, id }] });
    }
  },

  removeItem: (id) => {
    set({ items: get().items.filter((it) => it.id !== id) });
  },

  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(id);
      return;
    }
    set({
      items: get().items.map((it) => (it.id === id ? { ...it, quantity } : it)),
    });
  },

  updateNotes: (id, notes) => {
    set({
      items: get().items.map((it) => (it.id === id ? { ...it, notes } : it)),
    });
  },

  setSchedule: (deliveryDate, deliveryTime) => {
    set({ deliveryDate, deliveryTime });
  },

  clearCart: () => {
    set({ items: [] });
  },

  getTotalCount: () => {
    return get().items.length;
  },

  getTotalPortions: () => {
    return get().items.reduce((acc, it) => acc + it.quantity, 0);
  },

  getSubtotal: () => {
    return get().items.reduce((acc, it) => acc + it.price * it.quantity, 0);
  },
}));
