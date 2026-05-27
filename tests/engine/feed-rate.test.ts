import { describe, it, expect } from 'vitest';
import {
  calculateFeedRate,
  recommendDepthPerPass,
  recommendStepover,
  MATERIAL_HARDNESS,
  CUTTER_TYPES,
} from '../../src/engine/feed-rate';
import type { FeedRateInput } from '../../src/engine/feed-rate';

describe('calculateFeedRate', () => {
  const baseInput: FeedRateInput = {
    cutterDiameterMm: 6,
    flutes: 2,
    material: 'hardwood',
    cutterType: 'spiral_upcut',
    depthOfCutMm: 3,
    stepoverMm: 3,
    maxSpindleRpm: 24000,
  };

  it('computes feed rate for hardwood with 6mm 2-flute spiral', () => {
    const result = calculateFeedRate(baseInput);
    // ideal RPM = (350 * 0.85 * 1000) / (π * 6) ≈ 15786
    expect(result.spindleRpm).toBeCloseTo(15786, -1);
    expect(result.chipLoadMm).toBeCloseTo(0.115, 3);
    expect(result.feedRateMmPerMin).toBeGreaterThan(0);
    expect(result.plungeRateMmPerMin).toBe(Math.round(result.feedRateMmPerMin * 0.5));
    expect(result.rpmClamped).toBe(false);
    expect(result.mrrCm3PerMin).toBeGreaterThan(0);
  });

  it('clamps RPM to maxSpindleRpm when ideal exceeds it', () => {
    const result = calculateFeedRate({ ...baseInput, maxSpindleRpm: 10000 });
    expect(result.spindleRpm).toBe(10000);
    expect(result.rpmClamped).toBe(true);
  });

  it('does not clamp when maxSpindleRpm is higher than ideal', () => {
    const result = calculateFeedRate({ ...baseInput, maxSpindleRpm: 50000 });
    expect(result.rpmClamped).toBe(false);
    expect(result.spindleRpm).toBeLessThan(50000);
  });

  it('returns higher feed rate for MDF than hardwood (softer material)', () => {
    const mdfResult = calculateFeedRate({ ...baseInput, material: 'mdf' });
    const hardResult = calculateFeedRate(baseInput);
    expect(mdfResult.feedRateMmPerMin).toBeGreaterThan(hardResult.feedRateMmPerMin);
  });

  it('returns chip load range matching material data', () => {
    const result = calculateFeedRate(baseInput);
    expect(result.chipLoadRange).toEqual(MATERIAL_HARDNESS.hardwood.chipLoadRange);
  });

  it('scales feed rate with number of flutes', () => {
    const twoFlute = calculateFeedRate(baseInput);
    const threeFlute = calculateFeedRate({ ...baseInput, flutes: 3 });
    // More flutes = higher feed rate at same RPM
    expect(threeFlute.feedRateMmPerMin).toBeGreaterThan(twoFlute.feedRateMmPerMin);
  });

  it('computes MRR correctly (feed × depth × stepover / 1000)', () => {
    const result = calculateFeedRate(baseInput);
    const expectedMrr = (result.feedRateMmPerMin * 3 * 3) / 1000;
    expect(result.mrrCm3PerMin).toBeCloseTo(expectedMrr, 1);
  });

  it.each([
    { desc: 'cutterDiameterMm = 0', override: { cutterDiameterMm: 0 } },
    { desc: 'cutterDiameterMm = -1', override: { cutterDiameterMm: -1 } },
    { desc: 'flutes = 0', override: { flutes: 0 } },
    { desc: 'flutes = 1.5', override: { flutes: 1.5 } },
    { desc: 'depthOfCutMm = 0', override: { depthOfCutMm: 0 } },
    { desc: 'stepoverMm = -2', override: { stepoverMm: -2 } },
    { desc: 'maxSpindleRpm = 0', override: { maxSpindleRpm: 0 } },
  ])('throws RangeError when $desc', ({ override }) => {
    expect(() => calculateFeedRate({ ...baseInput, ...override })).toThrow(RangeError);
  });

  it.each(Object.keys(MATERIAL_HARDNESS) as Array<keyof typeof MATERIAL_HARDNESS>)(
    'produces valid result for material "%s"',
    (material) => {
      const result = calculateFeedRate({ ...baseInput, material });
      expect(result.spindleRpm).toBeGreaterThan(0);
      expect(result.feedRateMmPerMin).toBeGreaterThan(0);
    },
  );

  it.each(Object.keys(CUTTER_TYPES) as Array<keyof typeof CUTTER_TYPES>)(
    'produces valid result for cutter type "%s"',
    (cutterType) => {
      const result = calculateFeedRate({ ...baseInput, cutterType });
      expect(result.spindleRpm).toBeGreaterThan(0);
      expect(result.feedRateMmPerMin).toBeGreaterThan(0);
    },
  );
});

describe('recommendDepthPerPass', () => {
  it('recommends full depth when within limit for softwood', () => {
    const result = recommendDepthPerPass({
      cutterDiameterMm: 6,
      material: 'softwood',
      totalDepthMm: 5,
    });
    // Softwood factor = 1.0 → max depth = 6mm, total = 5mm → 1 pass
    expect(result.depthPerPassMm).toBe(5);
    expect(result.numberOfPasses).toBe(1);
    expect(result.finalPassDepthMm).toBe(5);
  });

  it('splits into multiple passes for hardwood', () => {
    const result = recommendDepthPerPass({
      cutterDiameterMm: 6,
      material: 'hardwood',
      totalDepthMm: 18,
    });
    // Hardwood factor = 0.5 → max depth = 3mm per pass → 6 passes
    expect(result.depthPerPassMm).toBe(3);
    expect(result.numberOfPasses).toBe(6);
    expect(result.finalPassDepthMm).toBe(3);
  });

  it('handles non-even division with smaller final pass', () => {
    const result = recommendDepthPerPass({
      cutterDiameterMm: 6,
      material: 'hardwood',
      totalDepthMm: 10,
    });
    // 3mm per pass → 4 passes: 3+3+3+1
    expect(result.numberOfPasses).toBe(4);
    expect(result.finalPassDepthMm).toBe(1);
  });

  it.each([
    { desc: 'cutterDiameterMm = 0', input: { cutterDiameterMm: 0, material: 'softwood' as const, totalDepthMm: 5 } },
    { desc: 'totalDepthMm = -1', input: { cutterDiameterMm: 6, material: 'softwood' as const, totalDepthMm: -1 } },
  ])('throws RangeError when $desc', ({ input }) => {
    expect(() => recommendDepthPerPass(input)).toThrow(RangeError);
  });
});

describe('recommendStepover', () => {
  it('returns 45% for roughing pass', () => {
    expect(recommendStepover(6, false)).toBeCloseTo(2.7, 1);
  });

  it('returns 10% for finishing pass', () => {
    expect(recommendStepover(6, true)).toBeCloseTo(0.6, 1);
  });

  it('throws RangeError for zero diameter', () => {
    expect(() => recommendStepover(0, false)).toThrow(RangeError);
  });

  it('throws RangeError for negative diameter', () => {
    expect(() => recommendStepover(-3, true)).toThrow(RangeError);
  });
});
