import { describe, it, expect } from 'vitest';
import {
  calculateDowelJoint,
  selectDowelDiameter,
  minDowelsForLoad,
  STANDARD_DOWEL_DIAMETERS,
} from '../../src/engine/dowel-joint';
import type { DowelJointInput } from '../../src/engine/dowel-joint';

describe('selectDowelDiameter', () => {
  it.each([
    { thickness: 12, expected: 6 },
    { thickness: 16, expected: 8 },
    { thickness: 18, expected: 8 },
    { thickness: 20, expected: 10 },
    { thickness: 22, expected: 10 },
    { thickness: 24, expected: 12 },
    { thickness: 30, expected: 12 },
  ])('$thickness mm board → $expected mm dowel', ({ thickness, expected }) => {
    expect(selectDowelDiameter(thickness)).toBe(expected);
  });

  it('returns 6mm for very thin boards', () => {
    expect(selectDowelDiameter(10)).toBe(6);
  });
});

describe('calculateDowelJoint', () => {
  const baseInput: DowelJointInput = {
    jointLengthMm: 600,
    boardThicknessMm: 18,
    orientation: 'edge_to_face',
  };

  it('computes layout for 600mm edge-to-face joint (18mm board)', () => {
    const result = calculateDowelJoint(baseInput);
    expect(result.dowelDiameterMm).toBe(8); // 18/2 = 9, largest ≤ 9 is 8
    expect(result.count).toBeGreaterThanOrEqual(2);
    expect(result.spacingMm).toBeGreaterThan(0);
    expect(result.drillDepthMm).toBe(20); // 8 × 2.5 = 20
    expect(result.dowelLengthMm).toBe(39); // 20*2 - 1
    expect(result.drillBitMm).toBe(8);
    expect(result.clampTimeMin).toBe(30);
  });

  it('positions start at edgeClearance and end at (length - edgeClearance)', () => {
    const result = calculateDowelJoint(baseInput);
    const firstPos = result.positions[0].offsetMm;
    const lastPos = result.positions[result.count - 1].offsetMm;
    expect(firstPos).toBeCloseTo(50, 0); // default edgeClearance
    expect(lastPos).toBeCloseTo(550, 0); // 600 - 50
  });

  it('uses specified dowel diameter when provided', () => {
    const result = calculateDowelJoint({ ...baseInput, dowelDiameterMm: 6 });
    expect(result.dowelDiameterMm).toBe(6);
    expect(result.drillDepthMm).toBe(15); // 6 × 2.5
  });

  it('uses custom edge clearance', () => {
    const result = calculateDowelJoint({ ...baseInput, edgeClearanceMm: 75 });
    expect(result.positions[0].offsetMm).toBeCloseTo(75, 0);
  });

  it('produces at least 2 dowels', () => {
    const result = calculateDowelJoint({
      ...baseInput,
      jointLengthMm: 150,
      edgeClearanceMm: 25,
    });
    expect(result.count).toBeGreaterThanOrEqual(2);
  });

  it('uses longer clamp time for edge-to-edge orientation', () => {
    const result = calculateDowelJoint({
      ...baseInput,
      orientation: 'edge_to_edge',
    });
    expect(result.clampTimeMin).toBe(45);
  });

  it('uses shallower depth for mitre joint', () => {
    const result = calculateDowelJoint({
      ...baseInput,
      orientation: 'mitre',
    });
    // mitre factor = 2.0, so 8 × 2 = 16
    expect(result.drillDepthMm).toBe(16);
  });

  it('has correct number of positions matching count', () => {
    const result = calculateDowelJoint(baseInput);
    expect(result.positions).toHaveLength(result.count);
  });

  it('positions are monotonically increasing', () => {
    const result = calculateDowelJoint(baseInput);
    for (let i = 1; i < result.positions.length; i++) {
      expect(result.positions[i].offsetMm).toBeGreaterThan(result.positions[i - 1].offsetMm);
    }
  });

  it.each([
    { desc: 'jointLengthMm = 0', override: { jointLengthMm: 0 } },
    { desc: 'jointLengthMm = -1', override: { jointLengthMm: -1 } },
    { desc: 'boardThicknessMm = 0', override: { boardThicknessMm: 0 } },
    { desc: 'edgeClearanceMm = -1', override: { edgeClearanceMm: -1 } },
    {
      desc: 'joint too short for clearance',
      override: { jointLengthMm: 80, edgeClearanceMm: 50 },
    },
  ])('throws RangeError when $desc', ({ override }) => {
    expect(() => calculateDowelJoint({ ...baseInput, ...override })).toThrow(RangeError);
  });
});

describe('minDowelsForLoad', () => {
  it.each([
    { load: 20, diameter: 6 as const, expected: 2 },
    { load: 50, diameter: 6 as const, expected: 2 },
    { load: 60, diameter: 6 as const, expected: 3 },
    { load: 100, diameter: 8 as const, expected: 3 },
    { load: 200, diameter: 10 as const, expected: 4 },
    { load: 300, diameter: 12 as const, expected: 4 },
  ])('$load kg with $diameter mm → $expected dowels', ({ load, diameter, expected }) => {
    expect(minDowelsForLoad(load, diameter)).toBe(expected);
  });

  it('always returns at least 2', () => {
    expect(minDowelsForLoad(1, 12)).toBe(2);
  });

  it('throws RangeError when loadKg ≤ 0', () => {
    expect(() => minDowelsForLoad(0, 8)).toThrow(RangeError);
    expect(() => minDowelsForLoad(-5, 8)).toThrow(RangeError);
  });
});

describe('STANDARD_DOWEL_DIAMETERS', () => {
  it('has 4 standard sizes', () => {
    expect(STANDARD_DOWEL_DIAMETERS).toHaveLength(4);
  });

  it('sizes are in ascending order', () => {
    for (let i = 1; i < STANDARD_DOWEL_DIAMETERS.length; i++) {
      expect(STANDARD_DOWEL_DIAMETERS[i]).toBeGreaterThan(STANDARD_DOWEL_DIAMETERS[i - 1]);
    }
  });
});
