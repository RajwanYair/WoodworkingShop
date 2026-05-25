import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Sprint 3 / Phase 11 — Uses the Workbox-generated SW via vite-plugin-pwa.
 *
 * Detects when a new Service Worker is ready and exposes a `reload()` helper.
 * The `registerSW` call from `virtual:pwa-register` handles registration and
 * fires the `onNeedRefresh` callback when an update is waiting.
 *
 * `onNeedReload` intercepts the `controlling` → reload path so the page only
 * reloads when the USER explicitly clicks Reload — never on background
 * activations triggered by another browser tab calling skipWaiting.
 */
export function useSwUpdate(): { updateAvailable: boolean; reload: () => void } {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  // updateSW is the function returned by registerSW — calling it sends
  // SKIP_WAITING to the waiting worker. The actual page reload is handled
  // by onNeedReload below, guarded by userTriggeredRef.
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);
  // Set to true only when the user explicitly clicks Reload.
  // Prevents cross-tab or background SW activations from reloading this tab.
  const userTriggeredRef = useRef(false);

  useEffect(() => {
    const update = registerSW({
      onNeedReload() {
        // Fires when the new SW takes control (controlling event, isUpdate=true).
        // Guard: only reload if this tab's user explicitly requested the update.
        if (userTriggeredRef.current) {
          window.location.reload();
        }
      },
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
    userTriggeredRef.current = true;
    void updateSW?.();
  };

  return { updateAvailable, reload };
}
