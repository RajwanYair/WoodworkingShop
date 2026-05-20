import { useEffect, useState } from 'react';

/**
 * Detects when a new Service Worker is waiting to take over.
 * Returns `true` once a waiting SW is found, and exposes a `reload()` helper
 * that sends the SKIP_WAITING message to activate the new SW and reloads.
 */
export function useSwUpdate(): { updateAvailable: boolean; reload: () => void } {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const checkRegistration = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setUpdateAvailable(true);
        return;
      }
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(installing);
            setUpdateAvailable(true);
          }
        });
      });
    };

    navigator.serviceWorker.ready.then(checkRegistration).catch(() => {
      // SW not available — silently ignore
    });
  }, []);

  const reload = () => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  };

  return { updateAvailable, reload };
}
