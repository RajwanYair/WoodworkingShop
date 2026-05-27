import { describe, expect, it } from 'vitest';
import { calculateRouterDepth, getRecommendedRpm } from '../../src/engine/router-depth';

describe('calculateRouterDepth', () => {
  const baseInput = {
    bitDiameterMm: 12,
    targetDepthMm: 18,
    material: 'hardwood' as const,
    routerPowerW: 1400,
    operation: 'dado' as const,
  };

  it('returns a valid pass schedule', () => {
    const result = calculateRouterDepth(baseInput);

    expect(result.maxDepthPerPassMm).toBeGreaterThan(0);
    expect(result.totalPasses).toBeGreaterThan(0);
    expect(result.passes).toHaveLength(result.totalPasses);
    expect(result.passes[result.passes.length - 1]?.cumulativeDepthMm).toBeCloseTo(18, 1);
  });

  it('harder materials reduce depth per pass', () => {
    const soft = calculateRouterDepth({ ...baseInput, material: 'softwood' });
    const hard = calculateRouterDepth({ ...baseInput, material: 'hardPlastic' });
    expect(soft.maxDepthPerPassMm).toBeGreaterThan(hard.maxDepthPerPassMm);
  });

  it('higher router power increases depth per pass', () => {
    const low = calculateRouterDepth({ ...baseInput, routerPowerW: 900 });
    const high = calculateRouterDepth({ ...baseInput, routerPowerW: 2200 });
    expect(high.maxDepthPerPassMm).toBeGreaterThan(low.maxDepthPerPassMm);
  });

  it('calculates chip load when feed is provided', () => {
    const result = calculateRouterDepth({
      ...baseInput,
      feedRateMmPerSec: 40,
      flutes: 2,
      rpm: 18000,
    });

    expect(result.chipLoadMm).not.toBeNull();
    expect(result.chipLoadSafe).not.toBeNull();
    expect(result.chipLoadMm).toBeGreaterThan(0);
  });

  it('returns null chip load fields when feed is omitted', () => {
    const result = calculateRouterDepth(baseInput);
    expect(result.chipLoadMm).toBeNull();
    expect(result.chipLoadSafe).toBeNull();
  });

  it.each([
    { desc: 'bitDiameterMm <= 0', input: { ...baseInput, bitDiameterMm: 0 } },
    { desc: 'targetDepthMm <= 0', input: { ...baseInput, targetDepthMm: 0 } },
    { desc: 'routerPowerW <= 0', input: { ...baseInput, routerPowerW: 0 } },
    { desc: 'flutes < 1', input: { ...baseInput, flutes: 0 } },
  ])('throws RangeError when $desc', ({ input }) => {
    expect(() => calculateRouterDepth(input)).toThrow(RangeError);
  });
});

describe('getRecommendedRpm', () => {
  it('returns expected RPM for diameter bands', () => {
    expect(getRecommendedRpm(6)).toBe(24000);
    expect(getRecommendedRpm(12)).toBe(22000);
    expect(getRecommendedRpm(22)).toBe(16000);
    expect(getRecommendedRpm(65)).toBe(10000);
    expect(getRecommendedRpm(80)).toBe(8000);
  });

  it('throws RangeError when diameter <= 0', () => {
    expect(() => getRecommendedRpm(0)).toThrow(RangeError);
  });
});
