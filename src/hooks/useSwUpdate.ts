import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Sprint 3 / Phase 11 — Uses the Workbox-generated SW via vite-plugin-pwa.
 *
 * Detects when a new Service Worker is ready and exposes a `reload()` helper.
 * The `registerSW` call from `virtual:pwa-register` handles registration and
 * fires the `onNeedRefresh` callback when an update is waiting.
 */
export function useSwUpdate(): { updateAvailable: boolean; reload: () => void } {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  // updateSW is the function returned by registerSW — calling it triggers
  // skipWaiting on the waiting worker then reloads the page.
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setUpdateAvailable(true);
        setUpdateSW(() => update);
      },
      onOfflineReady() {
        // App is ready for offline use — no user action needed.
      },
    });
    return () => {
      // registerSW doesn't expose a cleanup, but effect cleanup is required.
    };
  }, []);

  const reload = () => {
    void updateSW?.(true);
  };

  return { updateAvailable, reload };
}
