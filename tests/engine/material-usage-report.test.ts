import { describe, expect, it } from 'vitest';

import {
  costPerSquareMetre,
  generateUsageReport,
  mostExpensiveMaterial,
  mostWastefulMaterial,
} from '../../src/engine/material-usage-report';

import type { SheetStock, UsagePart } from '../../src/engine/material-usage-report';

const stock: SheetStock[] = [
  { material: 'plywood-18', sheetWidthMm: 2440, sheetHeightMm: 1220, thicknessMm: 18, costPerSheet: 45 },
  { material: 'mdf-12', sheetWidthMm: 2440, sheetHeightMm: 1220, thicknessMm: 12, costPerSheet: 30 },
];

describe('generateUsageReport', () => {
  it('returns empty report for no parts', () => {
    const result = generateUsageReport([], stock);
    expect(result.materials).toHaveLength(0);
    expect(result.totalCost).toBe(0);
    expect(result.totalPartCount).toBe(0);
    expect(result.overallWastePercent).toBe(0);
  });

  it('computes usage for a single material', () => {
    const parts: UsagePart[] = [
      {
        partId: 'p1',
        label: 'Shelf',
        material: 'plywood-18',
        widthMm: 600,
        heightMm: 400,
        thicknessMm: 18,
        quantity: 4,
      },
    ];

    const result = generateUsageReport(parts, stock);

    expect(result.materials).toHaveLength(1);
    const m = result.materials[0];
    expect(m.material).toBe('plywood-18');
    // 600*400*4 = 960000 mm²
    expect(m.partAreaMm2).toBe(960000);
    // sheet area = 2440*1220 = 2976800, 960000/2976800 < 1 → 1 sheet
    expect(m.sheetsRequired).toBe(1);
    expect(m.totalCost).toBe(45);
    expect(m.partCount).toBe(4);
    expect(m.wastePercent).toBeGreaterThan(0);
    expect(m.volumeMm3).toBe(960000 * 18);
  });

  it('computes usage for multiple materials', () => {
    const parts: UsagePart[] = [
      {
        partId: 'p1',
        label: 'Side',
        material: 'plywood-18',
        widthMm: 2400,
        heightMm: 600,
        thicknessMm: 18,
        quantity: 2,
      },
      { partId: 'p2', label: 'Back', material: 'mdf-12', widthMm: 800, heightMm: 600, thicknessMm: 12, quantity: 1 },
    ];

    const result = generateUsageReport(parts, stock);

    expect(result.materials).toHaveLength(2);
    expect(result.totalPartCount).toBe(3);
    expect(result.totalSheetsRequired).toBeGreaterThanOrEqual(2);
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.overallWastePercent).toBeGreaterThan(0);
  });

  it('requires multiple sheets when parts exceed sheet area', () => {
    const parts: UsagePart[] = [
      {
        partId: 'p1',
        label: 'Large',
        material: 'plywood-18',
        widthMm: 2440,
        heightMm: 1220,
        thicknessMm: 18,
        quantity: 3,
      },
    ];

    const result = generateUsageReport(parts, stock);

    expect(result.materials[0].sheetsRequired).toBe(3);
    expect(result.materials[0].totalCost).toBe(135);
    expect(result.materials[0].wastePercent).toBe(0); // exact fit
  });

  it('sorts materials by cost descending', () => {
    const parts: UsagePart[] = [
      { partId: 'p1', label: 'A', material: 'mdf-12', widthMm: 2440, heightMm: 1220, thicknessMm: 12, quantity: 5 },
      { partId: 'p2', label: 'B', material: 'plywood-18', widthMm: 600, heightMm: 400, thicknessMm: 18, quantity: 1 },
    ];

    const result = generateUsageReport(parts, stock);

    // mdf: 5 sheets * 30 = 150, plywood: 1 sheet * 45 = 45
    expect(result.materials[0].material).toBe('mdf-12');
    expect(result.materials[1].material).toBe('plywood-18');
  });

  it.each([
    {
      desc: 'unknown material',
      parts: [
        { partId: 'x', label: 'X', material: 'unknown', widthMm: 100, heightMm: 100, thicknessMm: 10, quantity: 1 },
      ],
    },
  ])('throws RangeError for $desc', ({ parts }) => {
    expect(() => generateUsageReport(parts, stock)).toThrow(RangeError);
  });

  it.each([
    {
      desc: 'zero width',
      parts: [
        { partId: 'x', label: 'X', material: 'plywood-18', widthMm: 0, heightMm: 100, thicknessMm: 10, quantity: 1 },
      ],
    },
    {
      desc: 'negative height',
      parts: [
        { partId: 'x', label: 'X', material: 'plywood-18', widthMm: 100, heightMm: -1, thicknessMm: 10, quantity: 1 },
      ],
    },
    {
      desc: 'zero quantity',
      parts: [
        { partId: 'x', label: 'X', material: 'plywood-18', widthMm: 100, heightMm: 100, thicknessMm: 10, quantity: 0 },
      ],
    },
  ])('throws RangeError for $desc', ({ parts }) => {
    expect(() => generateUsageReport(parts, stock)).toThrow(RangeError);
  });
});

describe('costPerSquareMetre', () => {
  it('computes cost per m² for standard plywood sheet', () => {
    const result = costPerSquareMetre(stock[0]);
    // 2440*1220 = 2976800 mm² = 2.9768 m², 45/2.9768 ≈ 15.12
    expect(result).toBeCloseTo(15.12, 1);
  });

  it('returns 0 for zero-area sheet', () => {
    expect(
      costPerSquareMetre({ material: 'x', sheetWidthMm: 0, sheetHeightMm: 1000, thicknessMm: 10, costPerSheet: 50 }),
    ).toBe(0);
  });
});

describe('mostWastefulMaterial', () => {
  it('returns undefined for empty report', () => {
    const report = generateUsageReport([], stock);
    expect(mostWastefulMaterial(report)).toBeUndefined();
  });

  it('returns material with highest waste percent', () => {
    const parts: UsagePart[] = [
      {
        partId: 'p1',
        label: 'Small',
        material: 'plywood-18',
        widthMm: 100,
        heightMm: 100,
        thicknessMm: 18,
        quantity: 1,
      },
      { partId: 'p2', label: 'Full', material: 'mdf-12', widthMm: 2440, heightMm: 1220, thicknessMm: 12, quantity: 1 },
    ];

    const report = generateUsageReport(parts, stock);
    const worst = mostWastefulMaterial(report);

    expect(worst?.material).toBe('plywood-18'); // tiny part on full sheet = most waste
  });
});

describe('mostExpensiveMaterial', () => {
  it('returns undefined for empty report', () => {
    const report = generateUsageReport([], stock);
    expect(mostExpensiveMaterial(report)).toBeUndefined();
  });

  it('returns material with highest total cost', () => {
    const parts: UsagePart[] = [
      { partId: 'p1', label: 'A', material: 'plywood-18', widthMm: 2440, heightMm: 1220, thicknessMm: 18, quantity: 3 },
      { partId: 'p2', label: 'B', material: 'mdf-12', widthMm: 2440, heightMm: 1220, thicknessMm: 12, quantity: 1 },
    ];

    const report = generateUsageReport(parts, stock);
    const expensive = mostExpensiveMaterial(report);

    expect(expensive?.material).toBe('plywood-18'); // 3*45=135 vs 1*30=30
  });
});
