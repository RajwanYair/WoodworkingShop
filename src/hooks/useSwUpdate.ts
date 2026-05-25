import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Sprint 3 / Phase 11 — Uses the Workbox-generated SW via vite-plugin-pwa.
 *
 * Detects when a new Service Worker is ready and exposes a `reload()` helper.
 * The `registerSW` call from `virtual:pwa-register` handles registration and
 * fires the `onNeedRefresh` callback when an update is waiting.
 *
 * `onNeedReload` is the SOLE reload trigger — it fires when the new SW takes
 * control and is guarded by `userTriggeredRef` to prevent cross-tab or
 * background SW activations from reloading this tab without user consent.
 *
 * `updateSW` is intentionally called with `reloadPage = false` so that
 * `virtual:pwa-register`'s internal `window.location.reload()` path is
 * suppressed. All reloads go through the `onNeedReload` guard below.
 */
export function useSwUpdate(): { updateAvailable: boolean; reload: () => void } {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  // updateSW is the function returned by registerSW — calling it sends
  // SKIP_WAITING to the waiting worker. We pass reloadPage=false so the
  // virtual module does NOT call window.location.reload() internally.
  // The reload is handled exclusively by onNeedReload + userTriggeredRef.
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);
  // Set to true only when the user explicitly clicks Reload in this tab.
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
    // Pass false so virtual:pwa-register does NOT call window.location.reload()
    // on its own. The reload fires exclusively via onNeedReload above once the
    // new SW fires the `controlling` event.
    void updateSW?.(false);
  };

  return { updateAvailable, reload };
}
