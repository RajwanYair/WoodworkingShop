import { describe, it, expect } from 'vitest';
import {
  calculatePocketHole,
  selectScrewLength,
  selectThreadType,
  POCKET_SCREW_LENGTHS,
} from '../../src/engine/pocket-hole';
import type { PocketHoleInput } from '../../src/engine/pocket-hole';

describe('selectScrewLength', () => {
  it.each([
    { workpiece: 12, mating: 18, desc: '12mm → 18mm' },
    { workpiece: 18, mating: 18, desc: '18mm → 18mm' },
    { workpiece: 25, mating: 25, desc: '25mm → 25mm' },
  ])('returns valid screw length for $desc', ({ workpiece, mating }) => {
    const len = selectScrewLength(workpiece, mating);
    expect(POCKET_SCREW_LENGTHS).toContain(len);
    // Screw should not exceed combined thickness minus 3mm safety
    expect(len * 25.4).toBeLessThanOrEqual(workpiece + mating - 3);
  });

  it('throws RangeError for zero workpiece thickness', () => {
    expect(() => selectScrewLength(0, 18)).toThrow(RangeError);
  });

  it('throws RangeError for negative mating thickness', () => {
    expect(() => selectScrewLength(18, -1)).toThrow(RangeError);
  });
});

describe('selectThreadType', () => {
  it.each([
    { hardness: 'softwood' as const, expected: 'coarse' },
    { hardness: 'hardwood' as const, expected: 'fine' },
    { hardness: 'plywood' as const, expected: 'fine' },
    { hardness: 'mdf' as const, expected: 'washer_head' },
  ])('$hardness → $expected', ({ hardness, expected }) => {
    expect(selectThreadType(hardness)).toBe(expected);
  });
});

describe('calculatePocketHole', () => {
  const baseInput: PocketHoleInput = {
    workpieceThicknessMm: 18,
    matingThicknessMm: 18,
    jointLengthMm: 600,
    materialHardness: 'plywood',
    jointType: 'butt',
  };

  it('computes valid result for standard 18mm plywood butt joint', () => {
    const result = calculatePocketHole(baseInput);
    expect(result.drillAngleDeg).toBe(15);
    expect(result.threadType).toBe('fine');
    expect(result.screwCount).toBeGreaterThanOrEqual(2);
    expect(result.spacingMm).toBeGreaterThan(0);
    expect(result.pocketBoreMm).toBe(9.5);
    expect(result.pilotHoleMm).toBe(4.0);
    expect(result.clampTimeMin).toBe(30);
    expect(POCKET_SCREW_LENGTHS).toContain(result.screwLengthInches);
  });

  it('uses 8mm pocket bore for thin (≤15mm) stock', () => {
    const result = calculatePocketHole({
      ...baseInput,
      workpieceThicknessMm: 12,
      matingThicknessMm: 12,
    });
    expect(result.pocketBoreMm).toBe(8);
    expect(result.pilotHoleMm).toBe(3.5);
  });

  it('uses longer clamp time for MDF', () => {
    const result = calculatePocketHole({
      ...baseInput,
      materialHardness: 'mdf',
    });
    expect(result.clampTimeMin).toBe(60);
    expect(result.threadType).toBe('washer_head');
  });

  it('uses tighter spacing for mitre joints', () => {
    const butt = calculatePocketHole(baseInput);
    const mitre = calculatePocketHole({ ...baseInput, jointType: 'mitre' });
    expect(mitre.screwCount).toBeGreaterThanOrEqual(butt.screwCount);
  });

  it('handles short joints with minimum 2 screws', () => {
    const result = calculatePocketHole({
      ...baseInput,
      jointLengthMm: 100,
      edgeDistanceMm: 25,
    });
    expect(result.screwCount).toBeGreaterThanOrEqual(2);
  });

  it('handles very short joint with 1 screw', () => {
    const result = calculatePocketHole({
      ...baseInput,
      jointLengthMm: 40,
      edgeDistanceMm: 25,
    });
    expect(result.screwCount).toBe(1);
  });

  it('collar depth accounts for 15° drill angle', () => {
    const result = calculatePocketHole(baseInput);
    // collarDepth = thickness / cos(15°) ≈ 18 / 0.9659 ≈ 18.6
    expect(result.collarDepthMm).toBeCloseTo(18.6, 0);
  });

  it.each([
    { desc: 'workpieceThicknessMm = 0', override: { workpieceThicknessMm: 0 } },
    { desc: 'matingThicknessMm = -1', override: { matingThicknessMm: -1 } },
    { desc: 'jointLengthMm = 0', override: { jointLengthMm: 0 } },
  ])('throws RangeError when $desc', ({ override }) => {
    expect(() => calculatePocketHole({ ...baseInput, ...override })).toThrow(RangeError);
  });
});

describe('POCKET_SCREW_LENGTHS', () => {
  it('has 6 standard lengths', () => {
    expect(POCKET_SCREW_LENGTHS).toHaveLength(6);
  });

  it('lengths are in ascending order', () => {
    for (let i = 1; i < POCKET_SCREW_LENGTHS.length; i++) {
      expect(POCKET_SCREW_LENGTHS[i]).toBeGreaterThan(POCKET_SCREW_LENGTHS[i - 1]);
    }
  });
});
