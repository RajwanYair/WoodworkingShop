import { describe, it, expect } from 'vitest';
import {
  estimateCabinetWeight,
  categorizeFastener,
  maxShelfLoad,
  MATERIAL_DENSITIES,
} from '../../src/engine/cabinet-weight';
import type { WeightPanel, WeightHardware } from '../../src/engine/cabinet-weight';

const sidePanel: WeightPanel = {
  label: 'Side Panel',
  widthMm: 600,
  heightMm: 720,
  thicknessMm: 18,
  material: 'particle_board',
  quantity: 2,
};

const shelf: WeightPanel = {
  label: 'Shelf',
  widthMm: 564,
  heightMm: 300,
  thicknessMm: 18,
  material: 'particle_board',
  quantity: 2,
};

const hinges: WeightHardware = {
  label: 'Concealed Hinge',
  weightGrams: 85,
  quantity: 4,
};

describe('estimateCabinetWeight', () => {
  it('estimates weight for a simple cabinet (2 sides + 2 shelves + hinges)', () => {
    const result = estimateCabinetWeight([sidePanel, shelf], [hinges]);
    // Side: 0.6 * 0.72 * 0.018 * 650 = 5.0544 kg each, × 2 = 10.1088
    // Shelf: 0.564 * 0.3 * 0.018 * 650 = 1.9796 kg each, × 2 = 3.9593
    // Panels total ≈ 14.07 kg
    // Hardware: 85g × 4 = 340g = 0.34 kg
    expect(result.panelWeightKg).toBeCloseTo(14.07, 0);
    expect(result.hardwareWeightKg).toBeCloseTo(0.34, 2);
    expect(result.totalEmptyKg).toBeCloseTo(14.41, 0);
    expect(result.totalLoadedKg).toBeCloseTo(14.41, 0);
    expect(result.fastenerCategory).toBe('light');
    expect(result.reinforcementNeeded).toBe(false);
  });

  it('includes contents weight in loaded total', () => {
    const result = estimateCabinetWeight([sidePanel], [hinges], 30);
    expect(result.totalLoadedKg).toBeCloseTo(result.totalEmptyKg + 30, 1);
  });

  it('returns panel breakdown with per-panel weights', () => {
    const result = estimateCabinetWeight([sidePanel, shelf], []);
    expect(result.panelBreakdown).toHaveLength(2);
    expect(result.panelBreakdown[0].label).toBe('Side Panel');
    expect(result.panelBreakdown[0].quantity).toBe(2);
    expect(result.panelBreakdown[0].weightKg).toBeGreaterThan(0);
    expect(result.panelBreakdown[0].totalKg).toBeCloseTo(result.panelBreakdown[0].weightKg * 2, 2);
  });

  it('accepts custom numeric density', () => {
    const customPanel: WeightPanel = {
      label: 'Custom',
      widthMm: 1000,
      heightMm: 1000,
      thicknessMm: 10,
      material: 500,
      quantity: 1,
    };
    const result = estimateCabinetWeight([customPanel], []);
    // 1m × 1m × 0.01m × 500 = 5 kg
    expect(result.panelWeightKg).toBeCloseTo(5, 1);
  });

  it('recommends reinforcement when loaded weight exceeds 50kg', () => {
    const result = estimateCabinetWeight([sidePanel, shelf], [hinges], 40);
    expect(result.reinforcementNeeded).toBe(true);
  });

  it.each([
    { desc: 'empty panels', panels: [] as WeightPanel[], hw: [], contents: 0 },
    {
      desc: 'panel with zero width',
      panels: [{ ...sidePanel, widthMm: 0 }],
      hw: [],
      contents: 0,
    },
    {
      desc: 'panel with negative height',
      panels: [{ ...sidePanel, heightMm: -1 }],
      hw: [],
      contents: 0,
    },
    {
      desc: 'panel with zero thickness',
      panels: [{ ...sidePanel, thicknessMm: 0 }],
      hw: [],
      contents: 0,
    },
    {
      desc: 'panel with quantity 0',
      panels: [{ ...sidePanel, quantity: 0 }],
      hw: [],
      contents: 0,
    },
    {
      desc: 'negative contents',
      panels: [sidePanel],
      hw: [],
      contents: -1,
    },
  ])('throws RangeError when $desc', ({ panels, hw, contents }) => {
    expect(() => estimateCabinetWeight(panels, hw, contents)).toThrow(RangeError);
  });
});

describe('categorizeFastener', () => {
  it.each([
    { kg: 5, expected: 'light' },
    { kg: 15, expected: 'light' },
    { kg: 16, expected: 'medium' },
    { kg: 35, expected: 'medium' },
    { kg: 36, expected: 'heavy' },
    { kg: 70, expected: 'heavy' },
    { kg: 71, expected: 'structural' },
    { kg: 200, expected: 'structural' },
  ])('$kg kg → $expected', ({ kg, expected }) => {
    expect(categorizeFastener(kg)).toBe(expected);
  });
});

describe('maxShelfLoad', () => {
  it('computes load for 18mm plywood at 800mm span', () => {
    const load = maxShelfLoad(800, 300, 18, 'plywood_birch');
    // Should be around 25kg per formula calibration
    expect(load).toBeGreaterThan(15);
    expect(load).toBeLessThan(100);
  });

  it('returns higher load for thicker shelves', () => {
    const thin = maxShelfLoad(600, 300, 16, 'solid_oak');
    const thick = maxShelfLoad(600, 300, 22, 'solid_oak');
    expect(thick).toBeGreaterThan(thin);
  });

  it('returns lower load for longer spans', () => {
    const short = maxShelfLoad(400, 300, 18, 'mdf');
    const long = maxShelfLoad(900, 300, 18, 'mdf');
    expect(short).toBeGreaterThan(long);
  });

  it('accepts custom numeric stiffness factor', () => {
    const load = maxShelfLoad(600, 300, 18, 1.0);
    expect(load).toBeGreaterThan(0);
  });

  it.each([
    { desc: 'spanMm = 0', args: [0, 300, 18, 'mdf' as const] },
    { desc: 'depthMm = -1', args: [600, -1, 18, 'mdf' as const] },
    { desc: 'thicknessMm = 0', args: [600, 300, 0, 'mdf' as const] },
  ])('throws RangeError when $desc', ({ args }) => {
    expect(() => maxShelfLoad(args[0] as number, args[1] as number, args[2] as number, args[3] as 'mdf')).toThrow(
      RangeError,
    );
  });
});

describe('MATERIAL_DENSITIES', () => {
  it('has 13 materials defined', () => {
    expect(Object.keys(MATERIAL_DENSITIES)).toHaveLength(13);
  });

  it.each(Object.entries(MATERIAL_DENSITIES))('%s density is between 300 and 1000 kg/m³', (_material, density) => {
    expect(density).toBeGreaterThan(300);
    expect(density).toBeLessThan(1000);
  });
});
