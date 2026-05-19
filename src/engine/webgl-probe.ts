/**
 * WebGL capability probe utility.
 *
 * Provides lightweight feature-detection for WebGL without importing any
 * rendering library. Used as a gating check before offering the optional
 * 3-D material-texture preview (Phase 7 evaluation item).
 *
 * Results are cached after the first call to avoid repeated canvas creation.
 */

type WebGLTier = 'unavailable' | 'webgl1' | 'webgl2';

let cachedTier: WebGLTier | undefined;

/**
 * Returns the highest WebGL context tier supported by the current browser.
 *
 * - `'webgl2'`      → Full WebGL 2 available (preferred for material shaders).
 * - `'webgl1'`      → Only WebGL 1 available (limited shader support).
 * - `'unavailable'` → No WebGL support (CPU canvas fallback should be used).
 */
export function probeWebGLTier(): WebGLTier {
  if (cachedTier !== undefined) return cachedTier;

  // SSR / non-browser environment guard
  if (typeof document === 'undefined') {
    cachedTier = 'unavailable';
    return cachedTier;
  }

  try {
    const canvas = document.createElement('canvas');

    // Try WebGL 2 first
    const ctx2 = canvas.getContext('webgl2');
    if (ctx2) {
      cachedTier = 'webgl2';
      return cachedTier;
    }

    // Fall back to WebGL 1
    const ctx1 =
      canvas.getContext('webgl') ??
      (canvas.getContext as (id: string) => WebGLRenderingContext | null)('experimental-webgl');
    if (ctx1) {
      cachedTier = 'webgl1';
      return cachedTier;
    }
  } catch {
    // Some browsers throw when creating a context (e.g. privacy-hardened builds)
  }

  cachedTier = 'unavailable';
  return cachedTier;
}

/** Returns `true` if any level of WebGL is supported. */
export function isWebGLAvailable(): boolean {
  return probeWebGLTier() !== 'unavailable';
}

/** Returns `true` if WebGL 2 is specifically available. */
export function isWebGL2Available(): boolean {
  return probeWebGLTier() === 'webgl2';
}

/**
 * Reset the cached tier — intended for unit tests that mock canvas contexts.
 * Not for production use.
 */
export function resetWebGLProbeCache(): void {
  cachedTier = undefined;
}
