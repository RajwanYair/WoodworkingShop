import { describe, it, expect } from 'vitest';
import { calculateShelfPins, totalPinsNeeded, SHELF_PIN_DIAMETERS } from '../../src/engine/shelf-pin';

describe('calculateShelfPins', () => {
  const baseInput = {
    cabinetHeightMm: 700,
    positions: 10,
    pinDiameterMm: 5 as const,
  };

  it('computes evenly spaced holes within usable height', () => {
    const result = calculateShelfPins(baseInput);
    expect(result.holeCount).toBe(10);
    expect(result.spacingMm).toBeGreaterThan(0);
    expect(result.holes).toHaveLength(10);
    expect(result.isEuro32).toBe(false);
  });

  it('first hole starts at edge clearance', () => {
    const result = calculateShelfPins(baseInput);
    expect(result.holes[0].y).toBe(50); // default edgeClearanceMm
  });

  it('last hole does not exceed cabinet height', () => {
    const result = calculateShelfPins(baseInput);
    const lastHole = result.holes[result.holes.length - 1];
    expect(lastHole.y).toBeLessThanOrEqual(700);
  });

  it('respects custom edge clearance', () => {
    const result = calculateShelfPins({ ...baseInput, edgeClearanceMm: 100 });
    expect(result.holes[0].y).toBe(100);
    expect(result.adjustmentRangeMm).toBeLessThan(calculateShelfPins(baseInput).adjustmentRangeMm);
  });

  it('euro_32 pattern uses 32mm spacing', () => {
    const result = calculateShelfPins({ ...baseInput, pattern: 'euro_32' });
    expect(result.spacingMm).toBe(32);
    expect(result.isEuro32).toBe(true);
    // Check consecutive holes are 32mm apart
    for (let i = 1; i < result.holes.length; i++) {
      expect(result.holes[i].y - result.holes[i - 1].y).toBeCloseTo(32, 0);
    }
  });

  it('drill depth limited to 2/3 panel thickness', () => {
    const result = calculateShelfPins({ ...baseInput, panelThicknessMm: 12 });
    expect(result.drillDepthMm).toBeLessThanOrEqual(8); // 2/3 of 12
  });

  it('drill depth uses pin diameter + 2 when panel is thick', () => {
    const result = calculateShelfPins({ ...baseInput, pinDiameterMm: 5, panelThicknessMm: 25 });
    expect(result.drillDepthMm).toBe(7); // 5 + 2
  });

  it.each([
    { desc: 'cabinetHeightMm = 0', override: { cabinetHeightMm: 0 } },
    { desc: 'positions = 1', override: { positions: 1 } },
    { desc: 'edgeClearanceMm = -10', override: { edgeClearanceMm: -10 } },
    { desc: 'panelThicknessMm = 0', override: { panelThicknessMm: 0 } },
    { desc: 'usable height too small', override: { cabinetHeightMm: 50, edgeClearanceMm: 30 } },
  ])('throws RangeError for $desc', ({ override }) => {
    expect(() => calculateShelfPins({ ...baseInput, ...override })).toThrow(RangeError);
  });
});

describe('totalPinsNeeded', () => {
  it('calculates base pins for 3 shelves × 4 pins', () => {
    expect(totalPinsNeeded(3, 4, 0)).toBe(12);
  });

  it('adds 10% spare by default', () => {
    // 5 shelves × 4 = 20, +10% = 22
    expect(totalPinsNeeded(5)).toBe(22);
  });

  it('handles custom spare percentage', () => {
    // 4 shelves × 4 = 16, +25% = 20
    expect(totalPinsNeeded(4, 4, 25)).toBe(20);
  });

  it.each([
    { desc: 'shelves = 0', args: [0, 4, 10] as const },
    { desc: 'pinsPerShelf = 0', args: [3, 0, 10] as const },
    { desc: 'sparePercent = -1', args: [3, 4, -1] as const },
    { desc: 'sparePercent = 101', args: [3, 4, 101] as const },
  ])('throws RangeError for $desc', ({ args }) => {
    expect(() => totalPinsNeeded(...(args as unknown as Parameters<typeof totalPinsNeeded>))).toThrow(RangeError);
  });
});

describe('SHELF_PIN_DIAMETERS', () => {
  it('has 5 standard sizes', () => {
    expect(SHELF_PIN_DIAMETERS).toHaveLength(5);
  });

  it('all values are positive', () => {
    for (const d of SHELF_PIN_DIAMETERS) {
      expect(d).toBeGreaterThan(0);
    }
  });
});
