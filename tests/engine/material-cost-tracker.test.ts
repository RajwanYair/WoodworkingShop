import { describe, it, expect } from 'vitest';

import {
  findBestPrice,
  computePriceTrend,
  estimateProjectCost,
  detectPriceAnomalies,
} from '../../src/engine/material-cost-tracker';
import type { PriceEntry, MaterialDemand } from '../../src/engine/material-cost-tracker';

const entries: PriceEntry[] = [
  { materialId: 'plywood-18', supplierId: 'sup-a', pricePerUnit: 45, date: '2025-01-01', currency: 'USD' },
  { materialId: 'plywood-18', supplierId: 'sup-a', pricePerUnit: 48, date: '2025-03-01', currency: 'USD' },
  { materialId: 'plywood-18', supplierId: 'sup-b', pricePerUnit: 42, date: '2025-02-01', currency: 'USD' },
  { materialId: 'plywood-18', supplierId: 'sup-b', pricePerUnit: 44, date: '2025-04-01', currency: 'USD' },
  { materialId: 'mdf-12', supplierId: 'sup-a', pricePerUnit: 25, date: '2025-01-01', currency: 'USD' },
  { materialId: 'mdf-12', supplierId: 'sup-c', pricePerUnit: 23, date: '2025-02-01', currency: 'USD' },
];

describe('findBestPrice', () => {
  it('returns undefined for unknown material', () => {
    expect(findBestPrice(entries, 'unknown')).toBeUndefined();
  });

  it('returns the cheapest most-recent per-supplier price', () => {
    const best = findBestPrice(entries, 'plywood-18');
    // sup-a latest: 48, sup-b latest: 44 → best is sup-b at 44
    expect(best).toBeDefined();
    expect(best!.supplierId).toBe('sup-b');
    expect(best!.pricePerUnit).toBe(44);
  });

  it('selects most recent entry per supplier before comparing', () => {
    const best = findBestPrice(entries, 'mdf-12');
    // sup-a: 25 (only), sup-c: 23 (only) → best is sup-c at 23
    expect(best!.supplierId).toBe('sup-c');
    expect(best!.pricePerUnit).toBe(23);
  });
});

describe('computePriceTrend', () => {
  it('returns undefined for unknown material', () => {
    expect(computePriceTrend(entries, 'unknown')).toBeUndefined();
  });

  it('returns undefined for material with only one entry', () => {
    const single: PriceEntry[] = [
      { materialId: 'x', supplierId: 's', pricePerUnit: 10, date: '2025-01-01', currency: 'USD' },
    ];
    expect(computePriceTrend(single, 'x')).toBeUndefined();
  });

  it('detects rising trend', () => {
    const rising: PriceEntry[] = [
      { materialId: 'm', supplierId: 's', pricePerUnit: 100, date: '2025-01-01', currency: 'USD' },
      { materialId: 'm', supplierId: 's', pricePerUnit: 120, date: '2025-06-01', currency: 'USD' },
    ];
    const trend = computePriceTrend(rising, 'm');
    expect(trend!.direction).toBe('rising');
    expect(trend!.changePercent).toBe(20);
  });

  it('detects falling trend', () => {
    const falling: PriceEntry[] = [
      { materialId: 'm', supplierId: 's', pricePerUnit: 100, date: '2025-01-01', currency: 'USD' },
      { materialId: 'm', supplierId: 's', pricePerUnit: 80, date: '2025-06-01', currency: 'USD' },
    ];
    const trend = computePriceTrend(falling, 'm');
    expect(trend!.direction).toBe('falling');
    expect(trend!.changePercent).toBe(-20);
  });

  it('detects stable trend within ±5%', () => {
    const stable: PriceEntry[] = [
      { materialId: 'm', supplierId: 's', pricePerUnit: 100, date: '2025-01-01', currency: 'USD' },
      { materialId: 'm', supplierId: 's', pricePerUnit: 103, date: '2025-06-01', currency: 'USD' },
    ];
    const trend = computePriceTrend(stable, 'm');
    expect(trend!.direction).toBe('stable');
  });

  it('sorts entries by date for correct oldest/newest', () => {
    // plywood-18 has 4 entries: 45, 48, 42, 44
    // sorted: 45 (Jan), 42 (Feb), 48 (Mar), 44 (Apr)
    // change: (44 - 45) / 45 = -2.22% → stable
    const trend = computePriceTrend(entries, 'plywood-18');
    expect(trend!.direction).toBe('stable');
    expect(trend!.entries).toBe(4);
  });
});

describe('estimateProjectCost', () => {
  it('throws on empty demands', () => {
    expect(() => estimateProjectCost([], entries, 'USD')).toThrow(RangeError);
  });

  it('computes total cost from best prices', () => {
    const demands: MaterialDemand[] = [
      { materialId: 'plywood-18', quantity: 3 },
      { materialId: 'mdf-12', quantity: 5 },
    ];
    const result = estimateProjectCost(demands, entries, 'USD');
    // plywood-18 best: 44 × 3 = 132, mdf-12 best: 23 × 5 = 115
    expect(result.totalCost).toBe(247);
    expect(result.lines).toHaveLength(2);
    expect(result.materialsWithoutPrice).toHaveLength(0);
  });

  it('reports materials without price data', () => {
    const demands: MaterialDemand[] = [
      { materialId: 'unknown-material', quantity: 2 },
      { materialId: 'mdf-12', quantity: 1 },
    ];
    const result = estimateProjectCost(demands, entries, 'USD');
    expect(result.materialsWithoutPrice).toContain('unknown-material');
    expect(result.lines).toHaveLength(1);
    expect(result.totalCost).toBe(23);
  });

  it('filters by currency', () => {
    const eurEntries: PriceEntry[] = [
      { materialId: 'plywood-18', supplierId: 'eu-sup', pricePerUnit: 40, date: '2025-01-01', currency: 'EUR' },
    ];
    const demands: MaterialDemand[] = [{ materialId: 'plywood-18', quantity: 2 }];
    const result = estimateProjectCost(demands, [...entries, ...eurEntries], 'EUR');
    expect(result.totalCost).toBe(80);
    expect(result.currency).toBe('EUR');
  });
});

describe('detectPriceAnomalies', () => {
  it('returns empty for fewer than 3 entries per material', () => {
    const few: PriceEntry[] = [
      { materialId: 'x', supplierId: 's', pricePerUnit: 10, date: '2025-01-01', currency: 'USD' },
      { materialId: 'x', supplierId: 's', pricePerUnit: 100, date: '2025-02-01', currency: 'USD' },
    ];
    expect(detectPriceAnomalies(few)).toEqual([]);
  });

  it('detects anomalous entries exceeding threshold', () => {
    const data: PriceEntry[] = [
      { materialId: 'x', supplierId: 's1', pricePerUnit: 50, date: '2025-01-01', currency: 'USD' },
      { materialId: 'x', supplierId: 's2', pricePerUnit: 52, date: '2025-02-01', currency: 'USD' },
      { materialId: 'x', supplierId: 's3', pricePerUnit: 48, date: '2025-03-01', currency: 'USD' },
      { materialId: 'x', supplierId: 's4', pricePerUnit: 100, date: '2025-04-01', currency: 'USD' }, // anomaly
    ];
    const anomalies = detectPriceAnomalies(data, 30);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].pricePerUnit).toBe(100);
  });

  it('respects custom threshold', () => {
    const data: PriceEntry[] = [
      { materialId: 'x', supplierId: 's1', pricePerUnit: 50, date: '2025-01-01', currency: 'USD' },
      { materialId: 'x', supplierId: 's2', pricePerUnit: 52, date: '2025-02-01', currency: 'USD' },
      { materialId: 'x', supplierId: 's3', pricePerUnit: 48, date: '2025-03-01', currency: 'USD' },
      { materialId: 'x', supplierId: 's4', pricePerUnit: 60, date: '2025-04-01', currency: 'USD' },
    ];
    // median ~50, deviation of 60 from 50 = 20% → passes 10% threshold
    const anomalies = detectPriceAnomalies(data, 10);
    expect(anomalies.length).toBeGreaterThan(0);
  });
});
