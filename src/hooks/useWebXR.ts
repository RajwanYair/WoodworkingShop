import { useEffect, useState } from 'react';

/**
 * WebXR AR session availability states.
 */
export type XrAvailability = 'checking' | 'supported' | 'not-supported';

/**
 * Probe browser WebXR immersive-ar support.
 *
 * Returns `'checking'` on initial render, then resolves to `'supported'` or
 * `'not-supported'` based on `navigator.xr?.isSessionSupported`.
 */
export function useWebXR(): XrAvailability {
  const [availability, setAvailability] = useState<XrAvailability>('checking');

  useEffect(() => {
    type XrNav = Navigator & { xr?: { isSessionSupported(mode: string): Promise<boolean> } };
    const xr = (navigator as XrNav).xr;
    if (!xr) {
      setAvailability('not-supported');
      return;
    }

    let cancelled = false;
    xr.isSessionSupported('immersive-ar')
      .then((supported: boolean) => {
        if (!cancelled) setAvailability(supported ? 'supported' : 'not-supported');
      })
      .catch(() => {
        if (!cancelled) setAvailability('not-supported');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return availability;
}
