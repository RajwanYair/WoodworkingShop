import { describe, it, expect } from 'vitest';
import {
  compensateDimension,
  compensatePart,
  estimateKerfLoss,
  kerfLossPercent,
  getKerfProfile,
  KERF_PROFILES,
} from '../../src/engine/kerf';
import type { KerfPart } from '../../src/engine/kerf';

function part(id: string, widthMm: number, lengthMm: number, quantity = 1): KerfPart {
  return { id, widthMm, lengthMm, quantity };
}

describe('KERF_PROFILES catalogue', () => {
  it('contains all expected profiles', () => {
    expect(Object.keys(KERF_PROFILES)).toContain('panel-saw');
    expect(Object.keys(KERF_PROFILES)).toContain('cnc-router');
    expect(Object.keys(KERF_PROFILES)).toContain('laser');
  });

  it('all profiles have bilingual names', () => {
    for (const p of Object.values(KERF_PROFILES)) {
      expect(p.name.en.length).toBeGreaterThan(0);
      expect(p.name.he.length).toBeGreaterThan(0);
    }
  });
});

describe('compensateDimension', () => {
  it('adds kerf and rounds to 0.5 mm', () => {
    // 600 + 3.2 = 603.2 → rounds to 603.5
    expect(compensateDimension(600, 3.2)).toBe(603.5);
  });

  it('handles exact 0.5mm kerf without rounding', () => {
    expect(compensateDimension(600, 0.5)).toBe(600.5);
  });

  it('returns original when kerf is 0', () => {
    expect(compensateDimension(500, 0)).toBe(500);
  });
});

describe('compensatePart', () => {
  it('expands both dimensions by kerf', () => {
    const result = compensatePart(part('1', 600, 720), 3.2);
    expect(result.compensatedWidthMm).toBeGreaterThan(600);
    expect(result.compensatedLengthMm).toBeGreaterThan(720);
  });

  it('records the added mm', () => {
    const result = compensatePart(part('1', 600, 720), 3.2);
    expect(result.widthAddedMm).toBeGreaterThan(0);
    expect(result.lengthAddedMm).toBeGreaterThan(0);
  });

  it('does not mutate input part', () => {
    const original = part('1', 600, 720);
    compensatePart(original, 3.2);
    expect(original.widthMm).toBe(600);
  });

  it('preserves quantity', () => {
    const result = compensatePart(part('1', 600, 720, 3), 3.2);
    expect(result.quantity).toBe(3);
  });
});

describe('estimateKerfLoss', () => {
  it('returns a positive loss for typical parts', () => {
    const parts = [part('1', 600, 720), part('2', 400, 500)];
    const loss = estimateKerfLoss(parts, 3.2);
    expect(loss).toBeGreaterThan(0);
  });

  it('returns 0 for empty parts list', () => {
    expect(estimateKerfLoss([], 3.2)).toBe(0);
  });

  it('scales with quantity', () => {
    const single = estimateKerfLoss([part('1', 600, 720, 1)], 3.2);
    const triple = estimateKerfLoss([part('1', 600, 720, 3)], 3.2);
    expect(triple).toBeCloseTo(single * 3, 0);
  });
});

describe('kerfLossPercent', () => {
  it('returns 0 for zero sheet area', () => {
    expect(kerfLossPercent(1000, 0)).toBe(0);
  });

  it('calculates correct percentage', () => {
    // 100 000 mm² loss on 1 000 000 mm² sheet = 10%
    expect(kerfLossPercent(100_000, 1_000_000)).toBe(10);
  });
});

describe('getKerfProfile', () => {
  it('returns a profile by id', () => {
    const p = getKerfProfile('panel-saw');
    expect(p?.kerfMm).toBe(3.2);
  });

  it('returns undefined for unknown id', () => {
    expect(getKerfProfile('hand-saw')).toBeUndefined();
  });
});
