interface XRSystemLike {
  isSessionSupported(mode: 'inline' | 'immersive-vr' | 'immersive-ar'): Promise<boolean>;
}

function getXRSystem(): XRSystemLike | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { xr?: XRSystemLike }).xr ?? null;
}

export function isWebXRSupported(): boolean {
  return getXRSystem() !== null;
}

export async function isImmersiveARSupported(): Promise<boolean> {
  const xr = getXRSystem();
  if (!xr) return false;
  try {
    return await xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}
