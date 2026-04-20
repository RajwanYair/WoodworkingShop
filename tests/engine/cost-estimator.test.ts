import { describe, it, expect } from 'vitest';
import { estimateCost } from '../../src/engine/cost-estimator';
import type { OptimizationResult } from '../../src/engine/types';
import { mockSheet } from '../helpers';

function mockOptimization(overrides: Partial<OptimizationResult> = {}): OptimizationResult {
  return {
    sheets: [mockSheet],
    totalSheets: 1,
    overallYield: 85,
    totalWaste: 50000,
    ...overrides,
  };
}

describe('estimateCost', () => {
  it('returns correct sheet costs for a single material', () => {
    const result = estimateCost(mockOptimization(), [], 0);
    expect(result.sheetCosts).toHaveLength(1);
    expect(result.sheetCosts[0].material).toBe('melamine-18');
    expect(result.sheetCosts[0].qty).toBe(1);
    expect(result.sheetCosts[0].pricePerSheet).toBe(165);
    expect(result.sheetCosts[0].subtotal).toBe(165);
  });

  it('groups duplicate sheets by material+thickness', () => {
    const opt = mockOptimization({
      sheets: [mockSheet, { ...mockSheet, sheetIndex: 1 }],
      totalSheets: 2,
    });
    const result = estimateCost(opt, [], 0);
    expect(result.sheetCosts).toHaveLength(1);
    expect(result.sheetCosts[0].qty).toBe(2);
    expect(result.sheetCosts[0].subtotal).toBe(330);
  });

  it('separates different materials into distinct sheet cost entries', () => {
    const plywoodSheet = { ...mockSheet, material: 'plywood-17', thickness: 17, sheetIndex: 1 };
    const opt = mockOptimization({ sheets: [mockSheet, plywoodSheet], totalSheets: 2 });
    const result = estimateCost(opt, [], 0);
    expect(result.sheetCosts).toHaveLength(2);
    const keys = result.sheetCosts.map((s) => s.material).sort();
    expect(keys).toEqual(['melamine-18', 'plywood-17']);
  });

  it('calculates edge banding cost from mm to meters', () => {
    const result = estimateCost(mockOptimization(), [], 5000);
    // 5000mm = 5m × 3₪/m = 15₪
    expect(result.edgeBandingCost).toBe(15);
  });

  it('rounds edge banding cost', () => {
    const result = estimateCost(mockOptimization(), [], 1500);
    // 1500mm = 1.5m × 3 = 4.5 → rounded to 5 (or 4 depending on Math.round)
    expect(result.edgeBandingCost).toBe(Math.round(1.5 * 3));
  });

  it('calculates hardware cost for known items', () => {
    const hardware = [
      { id: 'hinge', qty: 4 },
      { id: 'handle', qty: 2 },
    ];
    const result = estimateCost(mockOptimization(), hardware, 0);
    // 4×12 + 2×15 = 78
    expect(result.hardwareCost).toBe(78);
  });

  it('treats unknown hardware IDs as zero cost', () => {
    const hardware = [{ id: 'unknown-part', qty: 10 }];
    const result = estimateCost(mockOptimization(), hardware, 0);
    expect(result.hardwareCost).toBe(0);
  });

  it('calculates waste cost based on yield', () => {
    const result = estimateCost(mockOptimization({ overallYield: 80 }), [], 0);
    // waste = 20% of 165 = 33
    expect(result.wasteCost).toBe(33);
  });

  it('handles zero sheets without division errors', () => {
    const result = estimateCost(mockOptimization({ sheets: [], totalSheets: 0 }), [], 0);
    expect(result.sheetCosts).toHaveLength(0);
    expect(result.totalMaterialCost).toBe(0);
    expect(result.wasteCost).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it('totalCost = materialCost + edgeBandingCost + hardwareCost', () => {
    const hardware = [{ id: 'hinge', qty: 2 }];
    const result = estimateCost(mockOptimization(), hardware, 2000);
    expect(result.totalCost).toBe(result.totalMaterialCost + result.edgeBandingCost + result.hardwareCost);
  });

  it('includes bilingual material names', () => {
    const result = estimateCost(mockOptimization(), [], 0);
    expect(result.sheetCosts[0].materialName.en).toContain('Melamine');
    expect(result.sheetCosts[0].materialName.he).toBeTruthy();
  });

  it('calculates all HARDWARE_PRICES entries correctly', () => {
    const allHardware = [
      { id: 'hinge', qty: 1 },
      { id: 'mounting-plate', qty: 1 },
      { id: 'shelf-pin', qty: 1 },
      { id: 'confirmat', qty: 1 },
      { id: 'handle', qty: 1 },
      { id: 'L-bracket', qty: 1 },
      { id: 'wood-glue', qty: 1 },
    ];
    const result = estimateCost(mockOptimization(), allHardware, 0);
    // 12 + 6 + 0.5 + 0.8 + 15 + 4 + 25 = 63.3
    expect(result.hardwareCost).toBeCloseTo(63.3);
  });
});
