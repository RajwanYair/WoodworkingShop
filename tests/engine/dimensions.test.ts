import { describe, it, expect } from 'vitest';
import {
  computeDimensions,
  computeHingesPerDoor,
  computeHingePositions,
  computeEqualShelfPositions,
  computeShelfDeflection,
} from '../../src/engine/dimensions';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

describe('computeDimensions', () => {
  it('computes internal dimensions from default config', () => {
    const d = computeDimensions(DEFAULT_CONFIG);
    // plywood-17: thickness = 17
    expect(d.internalWidth).toBe(1000 - 2 * 17); // 966
    expect(d.internalHeight).toBe(2000 - 2 * 17); // 1966
    expect(d.shelfDepth).toBe(600 - 20); // 580
    expect(d.shelfWidth).toBe(966 - 2); // 964
  });

  it('computes door dimensions for double doors', () => {
    const d = computeDimensions(DEFAULT_CONFIG);
    // doorHeight = H - 2*reveal = 2000 - 6 = 1994
    expect(d.doorHeight).toBe(2000 - 3 - 3);
    // doorWidth = (W - r - r - (r-1)) / 2 = (1000-3-3-2)/2 = 496
    expect(d.doorWidth).toBe((1000 - 3 - 3 - 2) / 2);
  });

  it('computes single door dimensions', () => {
    const cfg = { ...DEFAULT_CONFIG, doorCount: 1 as const };
    const d = computeDimensions(cfg);
    expect(d.doorWidth).toBe(1000 - 3 - 3); // 994
  });

  it('computes back panel dimensions', () => {
    const d = computeDimensions(DEFAULT_CONFIG);
    expect(d.backPanelHeight).toBe(1980);
    expect(d.backPanelWidth).toBe(980);
  });

  it('responds to material thickness changes', () => {
    const cfg = { ...DEFAULT_CONFIG, carcassMaterial: 'melamine-16' };
    const d = computeDimensions(cfg);
    expect(d.internalWidth).toBe(1000 - 2 * 16); // 968
    expect(d.internalHeight).toBe(2000 - 2 * 16); // 1968
  });
});

describe('computeHingesPerDoor', () => {
  it('returns 2 for short doors ≤600mm', () => {
    expect(computeHingesPerDoor(400)).toBe(2);
    expect(computeHingesPerDoor(600)).toBe(2);
  });

  it('returns 3 for doors 601–1200mm', () => {
    expect(computeHingesPerDoor(601)).toBe(3);
    expect(computeHingesPerDoor(1200)).toBe(3);
  });

  it('returns 4 for doors 1201–1800mm', () => {
    expect(computeHingesPerDoor(1201)).toBe(4);
    expect(computeHingesPerDoor(1800)).toBe(4);
  });

  it('returns 5 for doors 1801–2200mm', () => {
    expect(computeHingesPerDoor(1994)).toBe(5);
  });

  it('returns 6 for very tall doors >2200mm', () => {
    expect(computeHingesPerDoor(2300)).toBe(6);
  });
});

describe('computeHingePositions', () => {
  it('distributes hinges evenly with 100mm inset', () => {
    const positions = computeHingePositions(1994, 5);
    expect(positions).toHaveLength(5);
    expect(positions[0]).toBe(100); // top inset
    expect(positions[positions.length - 1]).toBe(1994 - 100); // bottom inset
  });

  it('returns empty for 0 count', () => {
    expect(computeHingePositions(1000, 0)).toEqual([]);
  });

  it('returns midpoint for single hinge', () => {
    expect(computeHingePositions(1000, 1)).toEqual([500]);
  });
});

describe('computeEqualShelfPositions', () => {
  it('distributes shelves equally', () => {
    const positions = computeEqualShelfPositions(1966, 4);
    expect(positions).toHaveLength(4);
    expect(positions[0]).toBe(Math.round((1966 / 5) * 1));
    expect(positions[3]).toBe(Math.round((1966 / 5) * 4));
  });

  it('returns empty for 0 shelves', () => {
    expect(computeEqualShelfPositions(1966, 0)).toEqual([]);
  });
});

// Sprint 126 — shelf deflection
describe('computeShelfDeflection', () => {
  it('returns overLimit=false for a short, thick plywood shelf', () => {
    // 600 mm span, 18 mm birch plywood, 300 mm depth
    const result = computeShelfDeflection(600, 18, 300, 'plywood-18');
    expect(result.overLimit).toBe(false);
    expect(result.deflectionMm).toBeGreaterThan(0);
  });

  it('returns overLimit=true for a very long, thin chipboard shelf', () => {
    // 1100 mm span, 16 mm chipboard — known to sag
    const result = computeShelfDeflection(1100, 16, 400, 'chipboard-16');
    expect(result.overLimit).toBe(true);
    expect(result.deflectionMm).toBeGreaterThan(result.limitMm);
  });

  it('limitMm equals span/360', () => {
    const result = computeShelfDeflection(900, 18, 300, 'mdf-18');
    expect(result.limitMm).toBeCloseTo(900 / 360, 2);
  });

  it('uses default modulus for unknown material key', () => {
    // Should not throw and should return a numeric result
    const result = computeShelfDeflection(800, 18, 300, 'custom-exotic-wood');
    expect(typeof result.deflectionMm).toBe('number');
    expect(typeof result.overLimit).toBe('boolean');
  });
});

// Sprint 173 — deflection rating (three-tier: safe / warning / danger)
describe('computeShelfDeflection — deflectionRating', () => {
  it('rates a short thick plywood shelf as safe', () => {
    const result = computeShelfDeflection(600, 18, 300, 'plywood-18');
    expect(result.deflectionRating).toBe('safe');
    expect(result.overLimit).toBe(false);
  });

  it('rates a very long thin chipboard shelf as danger', () => {
    // 1400 mm span, 16 mm chipboard, 400 mm depth: δ ≈8.3 mm > L/240 = 5.83 mm
    const result = computeShelfDeflection(1400, 16, 400, 'chipboard-16');
    expect(result.deflectionRating).toBe('danger');
    expect(result.deflectionMm).toBeGreaterThan(1400 / 240);
  });

  it('rates a borderline shelf in the warning zone (L/360 < δ ≤ L/240)', () => {
    // 1200 mm span, 16 mm MDF, 400 mm depth: δ ≈3.95 mm is between L/360 (3.33) and L/240 (5.0)
    const result = computeShelfDeflection(1200, 16, 400, 'mdf-16');
    expect(result.deflectionRating).toBe('warning');
    expect(result.overLimit).toBe(true);
    expect(result.deflectionMm).toBeGreaterThan(1200 / 360);
    expect(result.deflectionMm).toBeLessThanOrEqual(1200 / 240);
  });

  it('deflectionRating is consistent with overLimit', () => {
    const cases: Array<[number, number, number, string]> = [
      [600, 18, 300, 'plywood-18'],
      [900, 18, 350, 'melamine-18'],
      [1100, 16, 400, 'chipboard-16'],
      [700, 16, 280, 'mdf-16'],
    ];
    for (const [span, thick, depth, mat] of cases) {
      const r = computeShelfDeflection(span, thick, depth, mat);
      if (r.deflectionRating === 'safe') {
        expect(r.overLimit).toBe(false);
      } else {
        expect(r.overLimit).toBe(true);
      }
    }
  });
});

// Sprint 173 — computeDimensions includes shelfDeflections
describe('computeDimensions — shelfDeflections', () => {
  it('returns shelfDeflections array matching shelfCount', () => {
    const cfg = { ...DEFAULT_CONFIG, shelfCount: 3 };
    const d = computeDimensions(cfg);
    expect(d.shelfDeflections).toHaveLength(3);
  });

  it('returns empty shelfDeflections when shelfCount is 0', () => {
    const cfg = { ...DEFAULT_CONFIG, shelfCount: 0 };
    const d = computeDimensions(cfg);
    expect(d.shelfDeflections).toHaveLength(0);
  });

  it('each shelfDeflection entry has required fields', () => {
    const d = computeDimensions(DEFAULT_CONFIG);
    for (const entry of d.shelfDeflections) {
      expect(typeof entry.deflectionMm).toBe('number');
      expect(typeof entry.limitMm).toBe('number');
      expect(typeof entry.overLimit).toBe('boolean');
      expect(['safe', 'warning', 'danger']).toContain(entry.deflectionRating);
    }
  });

  it('wide cabinet with thin chipboard gets warning or danger shelves', () => {
    // width=1434: shelfWidth = 1434-2*16-2 = 1400 mm, chipboard-16 at 580 mm depth
    // δ ≈5.7 mm between L/360 (3.89) and L/240 (5.83) → 'warning'
    const cfg = { ...DEFAULT_CONFIG, width: 1434, carcassMaterial: 'chipboard-16', shelfCount: 2 };
    const d = computeDimensions(cfg);
    const hasIssue = d.shelfDeflections.some((s) => s.deflectionRating !== 'safe');
    expect(hasIssue).toBe(true);
  });
});
