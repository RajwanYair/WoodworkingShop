/**
 * Cost comparison engine — Sprint 23 tests
 */
import { describe, it, expect } from 'vitest';
import { cfg } from '../helpers';
import {
  estimateScenario,
  compareScenarios,
  compareMaterialCosts,
  formatCost,
  costDeltaPercent,
} from '../../src/utils/cost-comparison';

describe('estimateScenario', () => {
  it('returns a result with the correct label', () => {
    const result = estimateScenario('Base', cfg());
    expect(result.label).toBe('Base');
  });

  it('returns a non-negative totalCost', () => {
    const result = estimateScenario('Test', cfg());
    expect(result.estimate.totalCost).toBeGreaterThanOrEqual(0);
  });

  it('materialKey matches config.carcassMaterial', () => {
    const result = estimateScenario('Test', cfg({ carcassMaterial: 'melamine-18' }));
    expect(result.materialKey).toBe('melamine-18');
  });

  it('currencyCode is a non-empty string', () => {
    const result = estimateScenario('Test', cfg());
    expect(typeof result.currencyCode).toBe('string');
    expect(result.currencyCode.length).toBeGreaterThan(0);
  });
});

describe('compareScenarios', () => {
  it('returns empty report for empty scenarios array', () => {
    const report = compareScenarios([]);
    expect(report.scenarios).toHaveLength(0);
    expect(report.costSpread).toBe(0);
    expect(report.sameCurrency).toBe(true);
  });

  it('identifies cheapest scenario', () => {
    const small = cfg({ width: 300, height: 600, depth: 400 });
    const large = cfg({ width: 1200, height: 2400, depth: 600 });
    const report = compareScenarios([
      { label: 'Large', config: large },
      { label: 'Small', config: small },
    ]);
    expect(report.scenarios[report.cheapestIndex]!.label).toBe('Small');
  });

  it('identifies most expensive scenario', () => {
    const small = cfg({ width: 300, height: 600, depth: 400 });
    const large = cfg({ width: 1200, height: 2400, depth: 600 });
    const report = compareScenarios([
      { label: 'Small', config: small },
      { label: 'Large', config: large },
    ]);
    expect(report.scenarios[report.mostExpensiveIndex]!.label).toBe('Large');
  });

  it('costSpread >= 0', () => {
    const a = cfg({ width: 600 });
    const b = cfg({ width: 900 });
    const report = compareScenarios([
      { label: 'A', config: a },
      { label: 'B', config: b },
    ]);
    expect(report.costSpread).toBeGreaterThanOrEqual(0);
  });

  it('sameCurrency is true when all use the same material', () => {
    const report = compareScenarios([
      { label: 'A', config: cfg({ width: 600 }) },
      { label: 'B', config: cfg({ width: 900 }) },
    ]);
    expect(report.sameCurrency).toBe(true);
  });

  it('handles a single scenario', () => {
    const report = compareScenarios([{ label: 'Only', config: cfg() }]);
    expect(report.cheapestIndex).toBe(0);
    expect(report.mostExpensiveIndex).toBe(0);
    expect(report.costSpread).toBe(0);
  });
});

describe('compareMaterialCosts', () => {
  it('returns a report with at least one variant', () => {
    const report = compareMaterialCosts(cfg());
    expect(report.variants.length).toBeGreaterThan(0);
  });

  it('cheapestKey is in the variants list', () => {
    const report = compareMaterialCosts(cfg());
    const keys = report.variants.map((v) => v.materialKey);
    expect(keys).toContain(report.cheapestKey);
  });

  it('mostExpensiveKey is in the variants list', () => {
    const report = compareMaterialCosts(cfg());
    const keys = report.variants.map((v) => v.materialKey);
    expect(keys).toContain(report.mostExpensiveKey);
  });

  it('variants are sorted cheapest first', () => {
    const report = compareMaterialCosts(cfg());
    for (let i = 0; i < report.variants.length - 1; i++) {
      expect(report.variants[i]!.estimate.totalCost).toBeLessThanOrEqual(report.variants[i + 1]!.estimate.totalCost);
    }
  });

  it('filters to provided materialKeys', () => {
    const report = compareMaterialCosts(cfg(), ['melamine-18', 'plywood-18']);
    const keys = report.variants.map((v) => v.materialKey);
    for (const k of keys) {
      expect(['melamine-18', 'plywood-18']).toContain(k);
    }
  });

  it('baseMaterialKey matches config.carcassMaterial', () => {
    const report = compareMaterialCosts(cfg({ carcassMaterial: 'melamine-18' }));
    expect(report.baseMaterialKey).toBe('melamine-18');
  });
});

describe('formatCost', () => {
  it('returns a string containing the amount', () => {
    const s = formatCost(123.45, 'USD');
    expect(s).toContain('123');
  });

  it('handles ILS currency', () => {
    const s = formatCost(200, 'ILS');
    expect(s).toContain('200');
  });

  it('falls back gracefully for unknown currency', () => {
    const s = formatCost(99.9, 'ZZZ');
    expect(s).toContain('99');
    expect(s).toContain('ZZZ');
  });
});

describe('costDeltaPercent', () => {
  it('returns 0 when base is 0', () => {
    expect(costDeltaPercent(0, 100)).toBe(0);
  });

  it('returns 0 when costs are equal', () => {
    expect(costDeltaPercent(100, 100)).toBe(0);
  });

  it('returns positive when target > base', () => {
    expect(costDeltaPercent(100, 150)).toBe(50);
  });

  it('returns negative when target < base', () => {
    expect(costDeltaPercent(100, 80)).toBe(-20);
  });
});
