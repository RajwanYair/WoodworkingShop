import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, action?: ToastAction) => void;
  removeToast: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'info', action) => {
    const id = nextId++;
    const toast: Toast = action ? { id, message, type, action } : { id, message, type };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), action ? 10_000 : 3500);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
