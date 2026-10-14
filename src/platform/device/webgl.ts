type WebGLTier = 'unavailable' | 'webgl1' | 'webgl2';

let cachedTier: WebGLTier | undefined;

export function probeWebGLTier(): WebGLTier {
  if (cachedTier !== undefined) return cachedTier;
  if (typeof document === 'undefined') return (cachedTier = 'unavailable');

  try {
    const canvas = document.createElement('canvas');
    const context2 = canvas.getContext('webgl2');
    if (context2) return (cachedTier = 'webgl2');

    const context1 =
      canvas.getContext('webgl') ??
      (canvas.getContext as (id: string) => WebGLRenderingContext | null)('experimental-webgl');
    if (context1) return (cachedTier = 'webgl1');
  } catch {
    // Context creation can throw in privacy-hardened browser configurations.
  }

  return (cachedTier = 'unavailable');
}

export function isWebGLAvailable(): boolean {
  return probeWebGLTier() !== 'unavailable';
}

export function isWebGL2Available(): boolean {
  return probeWebGLTier() === 'webgl2';
}

export function resetWebGLProbeCache(): void {
  cachedTier = undefined;
}
