/**
 * Test stub for the vite-plugin-pwa virtual module.
 * In production the real module is provided by VitePWA; in Vitest we return a
 * no-op update function so components that import this module can be tested.
 */
export function registerSW(opts?: {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
}): (reloadPage?: boolean) => Promise<void> {
  opts?.onOfflineReady?.();
  return async () => undefined;
}
