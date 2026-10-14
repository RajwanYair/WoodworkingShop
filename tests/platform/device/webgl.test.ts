import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  probeWebGLTier,
  isWebGLAvailable,
  isWebGL2Available,
  resetWebGLProbeCache,
} from '../../../src/platform/device/webgl';

describe('platform WebGL probe', () => {
  beforeEach(() => {
    resetWebGLProbeCache();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  it('reports supported tiers, derived availability, and cached results', () => {
    const tier = probeWebGLTier();
    expect(['unavailable', 'webgl1', 'webgl2']).toContain(tier);
    expect(isWebGLAvailable()).toBe(tier !== 'unavailable');
    expect(isWebGL2Available()).toBe(tier === 'webgl2');
    expect(probeWebGLTier()).toBe(tier);

    resetWebGLProbeCache();
    expect(['unavailable', 'webgl1', 'webgl2']).toContain(probeWebGLTier());
  });
});
