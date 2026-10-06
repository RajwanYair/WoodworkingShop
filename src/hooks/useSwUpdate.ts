import { useEffect, useRef, useState } from 'react';

/**
 * Sprint 3 / Phase 11 — Registers the Workbox-generated service worker with
 * the browser API, keeping update prompts under explicit user control.
 *
 * Detects when a new service worker is waiting and exposes a `reload()` helper.
 *
 * The worker receives SKIP_WAITING only after the user clicks Reload. A
 * controller change reloads this tab only when that same user action occurred.
 */
export function useSwUpdate(): { updateAvailable: boolean; reload: () => void } {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const userTriggeredRef = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const serviceWorkerContainer = navigator.serviceWorker;
    let mounted = true;
    let registration: ServiceWorkerRegistration | undefined;
    let installingWorker: ServiceWorker | null = null;

    const handleControllerChange = () => {
      if (userTriggeredRef.current) window.location.reload();
    };

    const handleInstallingStateChange = () => {
      if (installingWorker?.state !== 'installed' || !registration?.active) return;
      setWaitingWorker(installingWorker);
      installingWorker.removeEventListener('statechange', handleInstallingStateChange);
      installingWorker = null;
    };

    const handleUpdateFound = () => {
      installingWorker = registration?.installing ?? null;
      installingWorker?.addEventListener('statechange', handleInstallingStateChange);
      handleInstallingStateChange();
    };

    const handleRegistered = (serviceWorkerRegistration: ServiceWorkerRegistration) => {
      if (!mounted) return;
      registration = serviceWorkerRegistration;
      if (registration.waiting && registration.active) setWaitingWorker(registration.waiting);
      registration.addEventListener('updatefound', handleUpdateFound);
      handleUpdateFound();
    };

    serviceWorkerContainer.addEventListener('controllerchange', handleControllerChange);
    void serviceWorkerContainer
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then(handleRegistered)
      .catch(() => undefined);

    return () => {
      mounted = false;
      serviceWorkerContainer.removeEventListener('controllerchange', handleControllerChange);
      registration?.removeEventListener('updatefound', handleUpdateFound);
      installingWorker?.removeEventListener('statechange', handleInstallingStateChange);
    };
  }, []);

  const reload = () => {
    if (!waitingWorker) return;
    userTriggeredRef.current = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  return { updateAvailable: waitingWorker !== null, reload };
}
