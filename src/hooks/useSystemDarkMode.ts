import { useEffect } from 'react';
import { useCabinetStore } from '../store/cabinet-store';

/**
 * Sprint 48 — Listens to the OS `(prefers-color-scheme: dark)` media query and
 * keeps the store's `darkMode` in sync, but only when the user has not manually
 * overridden the preference (i.e. store value still mirrors what the OS was
 * before the change).
 */
export function useSystemDarkMode(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent): void => {
      // prevOsValue is what the OS WAS before this transition
      const prevOsValue = !e.matches;
      const { darkMode } = useCabinetStore.getState();
      // Sync only when the store was following the OS (no manual override)
      if (darkMode === prevOsValue) {
        useCabinetStore.setState({ darkMode: e.matches });
      }
    };

    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);
}
