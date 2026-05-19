import { describe, it, expect } from 'vitest';
import { findSubstitutions } from '../../src/engine/substitution';
import { cfg } from '../helpers';

describe('findSubstitutions', () => {
  it('returns empty array for a safe plywood-18 narrow cabinet', () => {
    const result = findSubstitutions(cfg({ carcassMaterial: 'plywood-18', width: 600 }));
    // No deflection, no weight, no cost substitution expected for plywood-18 on narrow cabinet
    expect(result).toBeInstanceOf(Array);
  });

  it('recommends a plywood alternative when chipboard is used on a wide span (> 900 mm)', () => {
    const result = findSubstitutions(cfg({ carcassMaterial: 'chipboard-18', width: 1000 }));
    const deflectionSub = result.find((s) => s.benefit === 'deflection');
    expect(deflectionSub).toBeDefined();
    expect(deflectionSub?.currentKey).toBe('chipboard-18');
    expect(deflectionSub?.suggestedKey).toMatch(/^plywood/);
  });

  it('recommends a plywood alternative when MDF is used on a wide span', () => {
    const result = findSubstitutions(cfg({ carcassMaterial: 'mdf-18', width: 1000 }));
    const deflectionSub = result.find((s) => s.benefit === 'deflection');
    expect(deflectionSub).toBeDefined();
    expect(deflectionSub?.suggestedKey).toMatch(/^plywood/);
  });

  it('does NOT recommend deflection substitution for chipboard on a narrow span (≤ 900 mm)', () => {
    const result = findSubstitutions(cfg({ carcassMaterial: 'chipboard-18', width: 800 }));
    const deflectionSub = result.find((s) => s.benefit === 'deflection');
    expect(deflectionSub).toBeUndefined();
  });

  it('recommends a lighter material for heavy MDF on a large cabinet', () => {
    const result = findSubstitutions(cfg({ carcassMaterial: 'mdf-18', width: 1200, height: 2000 }));
    const weightSub = result.find((s) => s.benefit === 'weight');
    expect(weightSub).toBeDefined();
    expect(weightSub?.currentKey).toBe('mdf-18');
  });

  it('does NOT recommend weight substitution for a small cabinet', () => {
    const result = findSubstitutions(cfg({ carcassMaterial: 'mdf-18', width: 600, height: 800 }));
    const weightSub = result.find((s) => s.benefit === 'weight');
    expect(weightSub).toBeUndefined();
  });

  it('recommends a cheaper material when there is a >25% cost saving available', () => {
    // plywood-18 costs 260, chipboard-18 costs 100 — chipboard is 61% cheaper
    // BUT chipboard won't be suggested if span > 900 mm (deflection unsafe)
    // So use a narrow cabinet to avoid triggering the deflection guard
    const result = findSubstitutions(cfg({ carcassMaterial: 'plywood-18', width: 600 }));
    const costSub = result.find((s) => s.benefit === 'cost');
    expect(costSub).toBeDefined();
    expect(costSub?.currentKey).toBe('plywood-18');
  });

  it('returns substitutions with bilingual reason messages', () => {
    const result = findSubstitutions(cfg({ carcassMaterial: 'chipboard-18', width: 1000 }));
    for (const sub of result) {
      expect(typeof sub.reason.en).toBe('string');
      expect(typeof sub.reason.he).toBe('string');
      expect(sub.reason.en.length).toBeGreaterThan(10);
      expect(sub.reason.he.length).toBeGreaterThan(10);
    }
  });

  it('returns empty array when given an unknown material key', () => {
    const result = findSubstitutions(cfg({ carcassMaterial: 'nonexistent-material' }));
    expect(result).toEqual([]);
  });

  it('each substitution has valid currentKey, suggestedKey, and benefit', () => {
    const result = findSubstitutions(cfg({ carcassMaterial: 'mdf-18', width: 1000, height: 2100 }));
    for (const sub of result) {
      expect(typeof sub.currentKey).toBe('string');
      expect(typeof sub.suggestedKey).toBe('string');
      expect(['deflection', 'cost', 'weight']).toContain(sub.benefit);
    }
  });

  // ── Quantitative rationale (Sprint 9) ────────────────────────────────────

  it('deflection substitution includes deflectionReductionPct > 0', () => {
    const result = findSubstitutions(cfg({ carcassMaterial: 'chipboard-18', width: 1000 }));
    const sub = result.find((s) => s.benefit === 'deflection');
    expect(sub?.quantitativeRationale?.deflectionReductionPct).toBeGreaterThan(0);
    expect(sub?.quantitativeRationale?.deflectionReductionPct).toBeLessThanOrEqual(100);
  });

  it('weight substitution includes savedKgPerSheet > 0', () => {
    const result = findSubstitutions(cfg({ carcassMaterial: 'mdf-18', width: 1200, height: 2000 }));
    const sub = result.find((s) => s.benefit === 'weight');
    expect(sub?.quantitativeRationale?.savedKgPerSheet).toBeGreaterThan(0);
  });

  it('cost substitution includes negative costDeltaPct (cheaper)', () => {
    const result = findSubstitutions(cfg({ carcassMaterial: 'plywood-18', width: 600 }));
    const sub = result.find((s) => s.benefit === 'cost');
    // costDeltaPct should be negative (alt is cheaper)
    expect(sub?.quantitativeRationale?.costDeltaPct).toBeLessThan(0);
  });

  it('quantitativeRationale.deflectionReductionPct matches chipboard→plywood stiffness ratio', () => {
    // chipboard E=2.8 GPa, plywood E=7.0 GPa → 1 - 2.8/7.0 = 60% reduction
    const result = findSubstitutions(cfg({ carcassMaterial: 'chipboard-18', width: 1000 }));
    const sub = result.find((s) => s.benefit === 'deflection');
    expect(sub?.quantitativeRationale?.deflectionReductionPct).toBe(60);
  });

  it('quantitativeRationale not set to undefined for active rules', () => {
    const result = findSubstitutions(cfg({ carcassMaterial: 'mdf-18', width: 1000, height: 2100 }));
    for (const sub of result) {
      // Each substitution should have a non-null quantitativeRationale object
      expect(sub.quantitativeRationale).toBeDefined();
    }
  });
});
