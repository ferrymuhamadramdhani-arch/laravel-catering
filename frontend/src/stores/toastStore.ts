import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = toast.duration || 3500;

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

// Quick helper functions for easy import
export const toast = {
  success: (message: string, title: string = 'Berhasil') => {
    useToastStore.getState().addToast({ type: 'success', title, message });
  },
  error: (message: string, title: string = 'Gagal') => {
    useToastStore.getState().addToast({ type: 'error', title, message, duration: 5000 });
  },
  info: (message: string, title: string = 'Informasi') => {
    useToastStore.getState().addToast({ type: 'info', title, message });
  },
  warning: (message: string, title: string = 'Peringatan') => {
    useToastStore.getState().addToast({ type: 'warning', title, message });
  },
};
