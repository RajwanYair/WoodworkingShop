import { describe, it, expect } from 'vitest';
import {
  optimizeYield,
  groupByMaterial,
  calculateTotalArea,
  findCompatibleOffCuts,
  formatSavings,
  MAX_DEMANDS,
  DEFAULT_YIELD_CONFIG,
} from '../../src/engine/material-yield';
import type { MaterialDemand, OffCut, YieldConfig } from '../../src/engine/material-yield';

function makeDemand(overrides: Partial<MaterialDemand> = {}): MaterialDemand {
  return {
    id: `d-${Math.random().toString(36).slice(2, 8)}`,
    projectId: 'proj-1',
    projectName: 'Kitchen Base',
    materialId: 'plywood-18',
    thickness: 18,
    width: 400,
    length: 600,
    quantity: 1,
    grainLocked: false,
    ...overrides,
  };
}

function makeOffCut(overrides: Partial<OffCut> = {}): OffCut {
  return {
    id: `oc-${Math.random().toString(36).slice(2, 8)}`,
    sourceProjectId: 'proj-0',
    materialId: 'plywood-18',
    thickness: 18,
    width: 500,
    length: 700,
    grainKnown: true,
    ...overrides,
  };
}

describe('material-yield', () => {
  describe('optimizeYield', () => {
    it('allocates demand to matching off-cut', () => {
      const demands = [makeDemand({ width: 300, length: 400 })];
      const offCuts = [makeOffCut({ width: 500, length: 700 })];
      const result = optimizeYield(demands, offCuts);

      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].offCutId).toBe(offCuts[0].id);
      expect(result.metrics.fromOffCuts).toBe(1);
      expect(result.metrics.fromNewSheets).toBe(0);
      expect(result.metrics.yieldPercentage).toBe(100);
    });

    it('falls back to new sheet when no compatible off-cut', () => {
      const demands = [makeDemand({ materialId: 'oak-25', thickness: 25 })];
      const offCuts = [makeOffCut({ materialId: 'plywood-18', thickness: 18 })];
      const result = optimizeYield(demands, offCuts);

      expect(result.allocations[0].offCutId).toBeNull();
      expect(result.metrics.fromNewSheets).toBe(1);
      expect(result.metrics.areaSaved).toBe(0);
    });

    it('falls back when off-cut is too small', () => {
      const demands = [makeDemand({ width: 600, length: 800 })];
      const offCuts = [makeOffCut({ width: 200, length: 300 })];
      const result = optimizeYield(demands, offCuts);

      expect(result.allocations[0].offCutId).toBeNull();
    });

    it('rotates non-grain-locked parts to fit', () => {
      // Demand: 600w x 300l. Off-cut: 400w x 700l. Normal won't fit, but rotated (300w x 600l) fits.
      const demands = [makeDemand({ width: 600, length: 300, grainLocked: false })];
      const offCuts = [makeOffCut({ width: 400, length: 700 })];
      const result = optimizeYield(demands, offCuts);

      expect(result.allocations[0].offCutId).toBe(offCuts[0].id);
      expect(result.allocations[0].rotated).toBe(true);
    });

    it('does not rotate grain-locked parts', () => {
      const demands = [makeDemand({ width: 600, length: 300, grainLocked: true })];
      const offCuts = [makeOffCut({ width: 400, length: 700 })];
      const result = optimizeYield(demands, offCuts);

      expect(result.allocations[0].offCutId).toBeNull();
    });

    it('handles multiple demands with quantity > 1', () => {
      const demands = [makeDemand({ width: 200, length: 200, quantity: 3 })];
      const offCuts = [makeOffCut({ width: 800, length: 800 })];
      const result = optimizeYield(demands, offCuts);

      expect(result.metrics.totalDemands).toBe(3);
      expect(result.metrics.fromOffCuts).toBeGreaterThanOrEqual(1);
    });

    it('respects sawKerf when checking fit', () => {
      const config: YieldConfig = { ...DEFAULT_YIELD_CONFIG, sawKerf: 10 };
      // Demand 495w x 695l won't fit in 500x700 with 10mm kerf (needs 505x705)
      const demands = [makeDemand({ width: 495, length: 695 })];
      const offCuts = [makeOffCut({ width: 500, length: 700 })];
      const result = optimizeYield(demands, offCuts, config);

      expect(result.allocations[0].offCutId).toBeNull();
    });

    it('throws on empty demands', () => {
      expect(() => optimizeYield([], [])).toThrow('at least one demand');
    });

    it('throws on too many demands', () => {
      const demands = Array.from({ length: MAX_DEMANDS + 1 }, () => makeDemand());
      expect(() => optimizeYield(demands, [])).toThrow('exceed maximum');
    });

    it('computes cost savings estimate', () => {
      const demands = [makeDemand({ width: 1000, length: 1000 })]; // 1m²
      const offCuts = [makeOffCut({ width: 1200, length: 1200 })];
      const config: YieldConfig = { ...DEFAULT_YIELD_CONFIG, costPerSquareMeter: 50 };
      const result = optimizeYield(demands, offCuts, config);

      expect(result.metrics.costSavingsEstimate).toBe(50); // 1m² * $50
    });
  });

  describe('groupByMaterial', () => {
    it('groups demands by material:thickness key', () => {
      const demands = [
        makeDemand({ materialId: 'plywood-18', thickness: 18 }),
        makeDemand({ materialId: 'plywood-18', thickness: 18 }),
        makeDemand({ materialId: 'oak-25', thickness: 25 }),
      ];
      const groups = groupByMaterial(demands);

      expect(groups.size).toBe(2);
      expect(groups.get('plywood-18:18')).toHaveLength(2);
      expect(groups.get('oak-25:25')).toHaveLength(1);
    });
  });

  describe('calculateTotalArea', () => {
    it('sums area × quantity', () => {
      const demands = [
        makeDemand({ width: 100, length: 200, quantity: 2 }), // 40000
        makeDemand({ width: 300, length: 400, quantity: 1 }), // 120000
      ];
      expect(calculateTotalArea(demands)).toBe(160000);
    });
  });

  describe('findCompatibleOffCuts', () => {
    it('filters by material and thickness', () => {
      const demand = makeDemand({ materialId: 'oak-25', thickness: 25 });
      const offCuts = [
        makeOffCut({ materialId: 'oak-25', thickness: 25 }),
        makeOffCut({ materialId: 'plywood-18', thickness: 18 }),
        makeOffCut({ materialId: 'oak-25', thickness: 25 }),
      ];
      expect(findCompatibleOffCuts(demand, offCuts)).toHaveLength(2);
    });
  });

  describe('formatSavings', () => {
    it('formats area and cost', () => {
      const metrics = {
        totalDemands: 5,
        fromOffCuts: 3,
        fromNewSheets: 2,
        totalAreaDemanded: 2000000,
        areaSaved: 1500000,
        yieldPercentage: 75,
        costSavingsEstimate: 67.5,
      };
      const result = formatSavings(metrics);
      expect(result.area).toBe('1.500 m²');
      expect(result.cost).toBe('$67.50');
    });
  });
});
