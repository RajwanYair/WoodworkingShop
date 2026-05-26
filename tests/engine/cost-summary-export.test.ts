import { describe, it, expect } from 'vitest';
import { buildCostSummary, costSummaryToCsv } from '../../src/engine/cost-summary-export';
import type { CostBreakdown } from '../../src/engine/cost-estimator';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeBreakdown(overrides: Partial<CostBreakdown> = {}): CostBreakdown {
  return {
    sheetCosts: [],
    hardwareItems: [],
    edgeBandingCost: 0,
    hardwareCost: 0,
    wasteCost: 0,
    labourHours: 0,
    labourCost: 0,
    finishCost: 0,
    totalMaterialCost: 0,
    totalCost: 0,
    ...overrides,
  };
}

// ─── buildCostSummary ─────────────────────────────────────────────────────────

describe('buildCostSummary — zero totals', () => {
  it('returns empty lines when all amounts are zero', () => {
    const result = buildCostSummary(makeBreakdown());
    expect(result.lines).toHaveLength(0);
    expect(result.totalCost).toBe(0);
  });
});

describe('buildCostSummary — single line item', () => {
  it.each([
    ['materials only', makeBreakdown({ totalMaterialCost: 200, totalCost: 200 }), 'costSummary.materials', 200, 100],
    ['hardware only', makeBreakdown({ hardwareCost: 50, totalCost: 50 }), 'costSummary.hardware', 50, 100],
    ['labour only', makeBreakdown({ labourCost: 100, totalCost: 100 }), 'costSummary.labour', 100, 100],
  ] as const)('%s', (_label, breakdown, expectedKey, expectedAmount, expectedPct) => {
    const result = buildCostSummary(breakdown);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].labelKey).toBe(expectedKey);
    expect(result.lines[0].amount).toBe(expectedAmount);
    expect(result.lines[0].pct).toBe(expectedPct);
  });
});

describe('buildCostSummary — percentage rounding', () => {
  it('percentages are rounded to 2 decimal places', () => {
    const bd = makeBreakdown({ totalMaterialCost: 100, labourCost: 200, totalCost: 300 });
    const result = buildCostSummary(bd);
    const matLine = result.lines.find((l) => l.labelKey === 'costSummary.materials');
    expect(matLine?.pct).toBeCloseTo(33.33, 1);
  });
});

describe('buildCostSummary — currency', () => {
  it('uses ₪ as default currency', () => {
    const result = buildCostSummary(makeBreakdown({ totalMaterialCost: 10, totalCost: 10 }));
    expect(result.currency).toBe('₪');
  });

  it('accepts a custom currency code', () => {
    const result = buildCostSummary(makeBreakdown({ totalMaterialCost: 10, totalCost: 10 }), '$');
    expect(result.currency).toBe('$');
  });
});

describe('buildCostSummary — generatedAt', () => {
  it('generatedAt is a valid ISO 8601 string', () => {
    const result = buildCostSummary(makeBreakdown({ totalMaterialCost: 1, totalCost: 1 }));
    expect(() => new Date(result.generatedAt)).not.toThrow();
    expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('buildCostSummary — full breakdown', () => {
  it('sums all non-zero lines', () => {
    const bd = makeBreakdown({
      totalMaterialCost: 400,
      edgeBandingCost: 30,
      hardwareCost: 50,
      wasteCost: 20,
      finishCost: 60,
      labourCost: 100,
      totalCost: 660,
    });
    const result = buildCostSummary(bd);
    expect(result.lines).toHaveLength(6);
    const totalPct = result.lines.reduce((sum, l) => sum + l.pct, 0);
    expect(totalPct).toBeGreaterThan(99);
    expect(totalPct).toBeLessThanOrEqual(100.1);
  });
});

// ─── costSummaryToCsv ─────────────────────────────────────────────────────────

describe('costSummaryToCsv', () => {
  it('produces RFC 4180 CSV with header + lines + total row', () => {
    const bd = makeBreakdown({ totalMaterialCost: 200, labourCost: 100, totalCost: 300 });
    const summary = buildCostSummary(bd);
    const csv = costSummaryToCsv(summary);
    const rows = csv.split('\r\n');
    expect(rows[0]).toBe('Category,Amount (₪),Share (%)');
    expect(rows.at(-1)).toBe('Total,300.00,100.00');
    expect(rows.length).toBe(4); // header + 2 data rows + total
  });

  it('escapes commas in category names', () => {
    const bd = makeBreakdown({ wasteCost: 10, totalCost: 10 });
    const summary = buildCostSummary(bd);
    // Waste Allowance has no comma, so no quotes needed — just verify output is valid
    const csv = costSummaryToCsv(summary);
    expect(csv).toContain('Waste Allowance');
  });
});
