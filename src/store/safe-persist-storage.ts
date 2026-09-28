import { createJSONStorage } from 'zustand/middleware';

export const safePersistStorage = createJSONStorage(() => ({
  getItem(name: string): string | null {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name: string, value: string): void {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Keep in-memory edits usable when storage is blocked or full.
    }
  },
  removeItem(name: string): void {
    try {
      localStorage.removeItem(name);
    } catch {
      // Storage cleanup is best-effort; the live store remains authoritative.
    }
  },
}));
