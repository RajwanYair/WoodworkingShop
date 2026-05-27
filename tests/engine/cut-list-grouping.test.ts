import { describe, it, expect } from 'vitest';
import {
  buildGroupKey,
  buildGroupLabel,
  groupParts,
  mergeGrainFlexible,
  estimateToolChanges,
} from '../../src/engine/cut-list-grouping';
import type { CutPart, GroupingCriterion } from '../../src/engine/cut-list-grouping';

function makePart(overrides: Partial<CutPart> = {}): CutPart {
  return {
    id: 'p1',
    label: 'Side Panel',
    material: 'plywood-birch',
    thickness: 18,
    width: 400,
    length: 600,
    grain: 'along-length',
    qty: 2,
    ...overrides,
  };
}

describe('cut-list-grouping', () => {
  describe('buildGroupKey', () => {
    it.each([
      { criteria: ['material'] as GroupingCriterion[], expected: 'plywood-birch' },
      { criteria: ['material', 'thickness'] as GroupingCriterion[], expected: 'plywood-birch|18' },
      {
        criteria: ['material', 'thickness', 'grain'] as GroupingCriterion[],
        expected: 'plywood-birch|18|along-length',
      },
      { criteria: ['cabinet'] as GroupingCriterion[], expected: '_mixed' },
    ])('produces "$expected" for criteria $criteria', ({ criteria, expected }) => {
      expect(buildGroupKey(makePart(), criteria)).toBe(expected);
    });

    it('includes cabinetId when set', () => {
      const part = makePart({ cabinetId: 'cab-1' });
      expect(buildGroupKey(part, ['cabinet'])).toBe('cab-1');
    });
  });

  describe('buildGroupLabel', () => {
    it('generates readable label from criteria', () => {
      const part = makePart();
      const label = buildGroupLabel(part, ['material', 'thickness', 'grain']);
      expect(label).toBe('plywood-birch · 18mm · along-length');
    });

    it('omits grain=none from label', () => {
      const part = makePart({ grain: 'none' });
      const label = buildGroupLabel(part, ['material', 'thickness', 'grain']);
      expect(label).toBe('plywood-birch · 18mm');
    });
  });

  describe('groupParts', () => {
    it('groups parts by material + thickness + grain', () => {
      const parts = [
        makePart({ id: 'a', material: 'plywood-birch', thickness: 18 }),
        makePart({ id: 'b', material: 'plywood-birch', thickness: 18 }),
        makePart({ id: 'c', material: 'mdf', thickness: 18 }),
      ];
      const result = groupParts(parts);
      expect(result.groupCount).toBe(2);
      expect(result.totalParts).toBe(3);
    });

    it('separates parts with different thickness', () => {
      const parts = [makePart({ id: 'a', thickness: 18 }), makePart({ id: 'b', thickness: 12 })];
      const result = groupParts(parts);
      expect(result.groupCount).toBe(2);
    });

    it('sorts parts within group by area descending', () => {
      const parts = [
        makePart({ id: 'small', width: 100, length: 100 }),
        makePart({ id: 'large', width: 800, length: 1200 }),
      ];
      const result = groupParts(parts);
      expect(result.groups[0].parts[0].id).toBe('large');
    });

    it('calculates totalCuts as sum of qty', () => {
      const parts = [makePart({ id: 'a', qty: 3 }), makePart({ id: 'b', qty: 5 })];
      const result = groupParts(parts);
      expect(result.totalCuts).toBe(8);
    });

    it('calculates totalAreaMm2 correctly', () => {
      const parts = [makePart({ width: 400, length: 600, qty: 2 })];
      const result = groupParts(parts);
      expect(result.groups[0].totalAreaMm2).toBe(400 * 600 * 2);
    });

    it('supports cabinet grouping criterion', () => {
      const parts = [makePart({ id: 'a', cabinetId: 'cab-1' }), makePart({ id: 'b', cabinetId: 'cab-2' })];
      const result = groupParts(parts, ['material', 'thickness', 'grain', 'cabinet']);
      expect(result.groupCount).toBe(2);
    });

    it('throws on empty parts', () => {
      expect(() => groupParts([])).toThrow(RangeError);
    });

    it('throws on empty criteria', () => {
      expect(() => groupParts([makePart()], [])).toThrow(RangeError);
    });

    it('sorts groups by total area descending', () => {
      const parts = [
        makePart({ id: 'small', material: 'mdf', width: 100, length: 100, qty: 1 }),
        makePart({ id: 'large', material: 'plywood-birch', width: 1000, length: 2000, qty: 4 }),
      ];
      const result = groupParts(parts);
      expect(result.groups[0].material).toBe('plywood-birch');
    });
  });

  describe('mergeGrainFlexible', () => {
    it('merges grain=none parts into the largest compatible group', () => {
      const parts = [
        makePart({ id: 'a', grain: 'along-length', width: 500, length: 800, qty: 2 }),
        makePart({ id: 'b', grain: 'none', width: 200, length: 300, qty: 1 }),
      ];
      const result = groupParts(parts);
      expect(result.groupCount).toBe(2);

      const merged = mergeGrainFlexible(result);
      expect(merged.groupCount).toBe(1);
      expect(merged.groups[0].parts).toHaveLength(2);
    });

    it('returns unchanged result when no grain criterion', () => {
      const parts = [makePart({ id: 'a' }), makePart({ id: 'b', grain: 'none' })];
      const result = groupParts(parts, ['material', 'thickness']);
      const merged = mergeGrainFlexible(result);
      expect(merged).toEqual(result);
    });

    it('creates new group for unmatched flexible parts', () => {
      const parts = [
        makePart({ id: 'a', material: 'oak', grain: 'along-length' }),
        makePart({ id: 'b', material: 'mdf', grain: 'none' }),
      ];
      const result = groupParts(parts);
      const merged = mergeGrainFlexible(result);
      // mdf grain=none can't merge with oak group → stays separate
      expect(merged.groupCount).toBe(2);
    });
  });

  describe('estimateToolChanges', () => {
    it('returns 0 for single group', () => {
      const parts = [makePart()];
      const result = groupParts(parts);
      expect(estimateToolChanges(result)).toBe(0);
    });

    it('returns groupCount - 1 for multiple groups', () => {
      const parts = [
        makePart({ id: 'a', material: 'plywood' }),
        makePart({ id: 'b', material: 'mdf' }),
        makePart({ id: 'c', material: 'oak' }),
      ];
      const result = groupParts(parts);
      expect(estimateToolChanges(result)).toBe(2);
    });
  });
});
