import { describe, it, expect, beforeEach } from 'vitest';
import { probeWebGLTier, isWebGLAvailable, isWebGL2Available, resetWebGLProbeCache } from '../../src/engine/webgl-probe';

describe('webgl-probe', () => {
  beforeEach(() => {
    resetWebGLProbeCache();
  });

  it('returns a valid tier string', () => {
    const tier = probeWebGLTier();
    expect(['unavailable', 'webgl1', 'webgl2']).toContain(tier);
  });

  it('isWebGLAvailable() returns boolean', () => {
    expect(typeof isWebGLAvailable()).toBe('boolean');
  });

  it('isWebGL2Available() returns boolean', () => {
    expect(typeof isWebGL2Available()).toBe('boolean');
  });

  it('isWebGLAvailable() matches tier !== unavailable', () => {
    const tier = probeWebGLTier();
    expect(isWebGLAvailable()).toBe(tier !== 'unavailable');
  });

  it('isWebGL2Available() matches tier === webgl2', () => {
    const tier = probeWebGLTier();
    expect(isWebGL2Available()).toBe(tier === 'webgl2');
  });

  it('caches the result (consistent on repeated calls)', () => {
    const first = probeWebGLTier();
    const second = probeWebGLTier();
    expect(first).toBe(second);
  });

  it('resetWebGLProbeCache() allows fresh probe', () => {
    probeWebGLTier(); // prime cache
    resetWebGLProbeCache();
    // After reset, a new call should still return a valid tier
    const tier = probeWebGLTier();
    expect(['unavailable', 'webgl1', 'webgl2']).toContain(tier);
  });
});
