import { describe, it, expect } from 'vitest';
import {
  calculateClampPressure,
  isPressureAdequate,
  GLUE_PRESSURE_PSI,
  CLAMP_FORCE_LBS,
} from '../../src/engine/clamp-pressure';
import type { ClampPressureInput } from '../../src/engine/clamp-pressure';

const baseInput: ClampPressureInput = {
  areaWidthMm: 100,
  areaLengthMm: 600,
  glueType: 'pva',
  clampType: 'parallel',
};

describe('calculateClampPressure', () => {
  it('computes valid result for standard PVA edge glue-up', () => {
    const result = calculateClampPressure(baseInput);
    expect(result.clampCount).toBeGreaterThanOrEqual(2);
    expect(result.totalForceLbs).toBeGreaterThan(0);
    expect(result.forcePerClampLbs).toBe(900);
    expect(result.achievedPsi).toBeGreaterThan(0);
    expect(result.targetPsi).toBe(150); // (100+200)/2
    expect(result.areaSqIn).toBeGreaterThan(0);
    expect(result.openTimeMin).toBe(8);
    expect(result.clampTimeMin).toBe(30);
  });

  it('uses higher clamp count when spacing demands it', () => {
    const longJoint = calculateClampPressure({
      ...baseInput,
      areaLengthMm: 1200,
      maxSpacingMm: 150,
    });
    expect(longJoint.clampCount).toBeGreaterThanOrEqual(9);
  });

  it('uses custom clamp force when provided', () => {
    const result = calculateClampPressure({
      ...baseInput,
      clampForceLbs: 500,
    });
    expect(result.forcePerClampLbs).toBe(500);
  });

  it('returns longer open/clamp times for polyurethane', () => {
    const result = calculateClampPressure({
      ...baseInput,
      glueType: 'polyurethane',
    });
    expect(result.openTimeMin).toBe(15);
    expect(result.clampTimeMin).toBe(60);
  });

  it('returns zero clamp time for contact cement', () => {
    const result = calculateClampPressure({
      ...baseInput,
      glueType: 'contact',
    });
    expect(result.clampTimeMin).toBe(0);
  });

  it('respects custom max spacing', () => {
    const tight = calculateClampPressure({ ...baseInput, maxSpacingMm: 75 });
    const loose = calculateClampPressure({ ...baseInput, maxSpacingMm: 300 });
    expect(tight.clampCount).toBeGreaterThanOrEqual(loose.clampCount);
  });

  it('achieves pressure within expected range for adequate clamping', () => {
    const result = calculateClampPressure(baseInput);
    expect(result.achievedPsi).toBeGreaterThanOrEqual(GLUE_PRESSURE_PSI.pva.min);
  });

  it.each([
    { desc: 'areaWidthMm = 0', override: { areaWidthMm: 0 } },
    { desc: 'areaWidthMm = -1', override: { areaWidthMm: -1 } },
    { desc: 'areaLengthMm = 0', override: { areaLengthMm: 0 } },
  ])('throws RangeError for $desc', ({ override }) => {
    expect(() => calculateClampPressure({ ...baseInput, ...override })).toThrow(RangeError);
  });
});

describe('isPressureAdequate', () => {
  it.each([
    { psi: 150, glue: 'pva' as const, expected: true },
    { psi: 100, glue: 'pva' as const, expected: true },
    { psi: 50, glue: 'pva' as const, expected: false },
    { psi: 350, glue: 'pva' as const, expected: false },
    { psi: 75, glue: 'polyurethane' as const, expected: true },
    { psi: 30, glue: 'epoxy' as const, expected: true },
  ])('$psi PSI for $glue → $expected', ({ psi, glue, expected }) => {
    expect(isPressureAdequate(psi, glue)).toBe(expected);
  });
});

describe('GLUE_PRESSURE_PSI', () => {
  it('has 5 glue types defined', () => {
    expect(Object.keys(GLUE_PRESSURE_PSI)).toHaveLength(5);
  });

  it('all ranges have min < max', () => {
    for (const range of Object.values(GLUE_PRESSURE_PSI)) {
      expect(range.min).toBeLessThan(range.max);
    }
  });
});

describe('CLAMP_FORCE_LBS', () => {
  it('has 6 clamp types defined', () => {
    expect(Object.keys(CLAMP_FORCE_LBS)).toHaveLength(6);
  });

  it('all forces are positive', () => {
    for (const force of Object.values(CLAMP_FORCE_LBS)) {
      expect(force).toBeGreaterThan(0);
    }
  });
});
