import { createJSONStorage } from 'zustand/middleware';
import { browserLocalStorage } from '../platform/storage/index';

export const safePersistStorage = createJSONStorage(() => ({
  getItem(name: string): string | null {
    try {
      return browserLocalStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name: string, value: string): void {
    try {
      browserLocalStorage.setItem(name, value);
    } catch {
      // Keep in-memory edits usable when storage is blocked or full.
    }
  },
  removeItem(name: string): void {
    try {
      browserLocalStorage.removeItem(name);
    } catch {
      // Storage cleanup is best-effort; the live store remains authoritative.
    }
  },
}));
