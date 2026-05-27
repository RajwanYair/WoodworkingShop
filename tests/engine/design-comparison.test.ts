import { describe, it, expect } from 'vitest';
import {
  createSnapshot,
  compareDesigns,
  validateWeights,
  getCommonCriteria,
  DEFAULT_WEIGHTS,
} from '../../src/engine/design-comparison';
import type { CriterionWeight, DesignSnapshot } from '../../src/engine/design-comparison';

function makeSnapshot(id: string, name: string, values: Partial<Record<string, number>> = {}): DesignSnapshot {
  const defaults = {
    materialCost: 200,
    materialArea: 4,
    partCount: 20,
    cutComplexity: 15,
    wastePercent: 12,
    assemblySteps: 8,
    structuralScore: 75,
    ...values,
  };
  return createSnapshot(id, name, defaults as Parameters<typeof createSnapshot>[2]);
}

describe('design-comparison', () => {
  describe('createSnapshot', () => {
    it('creates a snapshot with all criteria', () => {
      const snap = createSnapshot('d1', 'Kitchen Base', {
        materialCost: 350,
        partCount: 25,
      });
      expect(snap.id).toBe('d1');
      expect(snap.name).toBe('Kitchen Base');
      expect(snap.criteria).toHaveLength(2);
      expect(snap.criteria.find((c) => c.name === 'materialCost')?.value).toBe(350);
    });

    it('throws on empty name', () => {
      expect(() => createSnapshot('x', '', { materialCost: 100 })).toThrow('must not be empty');
    });

    it('throws on unknown criterion', () => {
      expect(() => createSnapshot('x', 'Test', { unknownField: 100 } as Parameters<typeof createSnapshot>[2])).toThrow(
        'unknown criterion',
      );
    });

    it('trims whitespace from name', () => {
      const snap = createSnapshot('x', '  Base Cabinet  ', { materialCost: 100 });
      expect(snap.name).toBe('Base Cabinet');
    });
  });

  describe('validateWeights', () => {
    it('accepts valid weights summing to 1', () => {
      expect(() => validateWeights(DEFAULT_WEIGHTS)).not.toThrow();
    });

    it('throws when weights do not sum to 1', () => {
      const bad: CriterionWeight[] = [
        { name: 'materialCost', weight: 0.5 },
        { name: 'partCount', weight: 0.3 },
      ];
      expect(() => validateWeights(bad)).toThrow('must sum to 1.0');
    });

    it('throws on negative weight', () => {
      const bad: CriterionWeight[] = [
        { name: 'materialCost', weight: -0.1 },
        { name: 'partCount', weight: 1.1 },
      ];
      expect(() => validateWeights(bad)).toThrow('must be 0–1');
    });
  });

  describe('getCommonCriteria', () => {
    it('returns criteria present in both designs', () => {
      const a = createSnapshot('a', 'A', { materialCost: 100, partCount: 10 });
      const b = createSnapshot('b', 'B', { materialCost: 120, wastePercent: 5 });
      const common = getCommonCriteria(a, b);
      expect(common).toEqual(['materialCost']);
    });
  });

  describe('compareDesigns', () => {
    it('identifies winner correctly for lower-is-better criteria', () => {
      const a = makeSnapshot('a', 'Expensive', { materialCost: 400 });
      const b = makeSnapshot('b', 'Cheap', { materialCost: 200 });
      const result = compareDesigns(a, b);
      const costComp = result.criteria.find((c) => c.name === 'materialCost')!;
      expect(costComp.winner).toBe('b');
    });

    it('identifies winner correctly for higher-is-better criteria', () => {
      const a = makeSnapshot('a', 'Weak', { structuralScore: 50 });
      const b = makeSnapshot('b', 'Strong', { structuralScore: 90 });
      const result = compareDesigns(a, b);
      const structComp = result.criteria.find((c) => c.name === 'structuralScore')!;
      expect(structComp.winner).toBe('b');
    });

    it('marks tie when values are equal', () => {
      const a = makeSnapshot('a', 'Same A', { materialCost: 300 });
      const b = makeSnapshot('b', 'Same B', { materialCost: 300 });
      const result = compareDesigns(a, b);
      const costComp = result.criteria.find((c) => c.name === 'materialCost')!;
      expect(costComp.winner).toBe('tie');
    });

    it('computes delta correctly', () => {
      const a = makeSnapshot('a', 'A', { partCount: 20 });
      const b = makeSnapshot('b', 'B', { partCount: 30 });
      const result = compareDesigns(a, b);
      const comp = result.criteria.find((c) => c.name === 'partCount')!;
      expect(comp.deltaAbsolute).toBe(10);
      expect(comp.deltaPercent).toBe(50);
    });

    it('produces total scores between 0 and 100', () => {
      const a = makeSnapshot('a', 'A');
      const b = makeSnapshot('b', 'B', { materialCost: 100, wastePercent: 5 });
      const result = compareDesigns(a, b);
      expect(result.totalScoreA).toBeGreaterThanOrEqual(0);
      expect(result.totalScoreA).toBeLessThanOrEqual(100);
      expect(result.totalScoreB).toBeGreaterThanOrEqual(0);
      expect(result.totalScoreB).toBeLessThanOrEqual(100);
    });

    it('includes design info in result', () => {
      const a = makeSnapshot('design-1', 'Kitchen Base');
      const b = makeSnapshot('design-2', 'Wardrobe');
      const result = compareDesigns(a, b);
      expect(result.designA).toEqual({ id: 'design-1', name: 'Kitchen Base' });
      expect(result.designB).toEqual({ id: 'design-2', name: 'Wardrobe' });
    });

    it('generates a non-empty summary', () => {
      const a = makeSnapshot('a', 'A');
      const b = makeSnapshot('b', 'B');
      const result = compareDesigns(a, b);
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.summary).toContain('"A"');
      expect(result.summary).toContain('"B"');
    });

    it('produces normalized scores in 0–1 range', () => {
      const a = makeSnapshot('a', 'A');
      const b = makeSnapshot('b', 'B', { materialCost: 50 });
      const result = compareDesigns(a, b);
      for (const ns of result.normalizedScores) {
        expect(ns.scoreA).toBeGreaterThanOrEqual(0);
        expect(ns.scoreA).toBeLessThanOrEqual(1);
        expect(ns.scoreB).toBeGreaterThanOrEqual(0);
        expect(ns.scoreB).toBeLessThanOrEqual(1);
      }
    });

    it('allows custom weights', () => {
      const customWeights: CriterionWeight[] = [
        { name: 'materialCost', weight: 1.0 },
        { name: 'materialArea', weight: 0 },
        { name: 'partCount', weight: 0 },
        { name: 'cutComplexity', weight: 0 },
        { name: 'wastePercent', weight: 0 },
        { name: 'assemblySteps', weight: 0 },
        { name: 'structuralScore', weight: 0 },
      ];
      // Design B has much lower cost — should win with cost-only weights
      const a = makeSnapshot('a', 'A', { materialCost: 500 });
      const b = makeSnapshot('b', 'B', { materialCost: 100 });
      const result = compareDesigns(a, b, customWeights);
      expect(result.overallWinner).toBe('b');
    });
  });
});
