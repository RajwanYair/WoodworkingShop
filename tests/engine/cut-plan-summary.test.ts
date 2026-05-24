import { describe, it, expect } from 'vitest';
import { buildCutPlanSummary, formatCutPlanSummary } from '../../src/engine/cut-plan-summary';
import type { SheetPlanInput } from '../../src/engine/cut-plan-summary';

const sheet = (material: string, sheetCount: number, usedAreaMm2: number, sheetUnitCost?: number): SheetPlanInput => ({
  material,
  sheetCount,
  sheetWidthMm: 1220,
  sheetLengthMm: 2440,
  usedAreaMm2,
  sheetUnitCost,
  currency: sheetUnitCost !== undefined ? 'USD' : undefined,
});

const ONE_SHEET_AREA = 1220 * 2440; // 2 976 800 mm²

describe('buildCutPlanSummary — single material', () => {
  it('computes waste for a single sheet', () => {
    const summary = buildCutPlanSummary([sheet('MDF 18mm', 1, ONE_SHEET_AREA * 0.8)]);
    expect(summary.materials).toHaveLength(1);
    expect(summary.materials[0].wastePercent).toBeCloseTo(20, 0);
  });

  it('totalSheets equals input sheetCount', () => {
    const summary = buildCutPlanSummary([sheet('MDF', 3, ONE_SHEET_AREA * 2.4)]);
    expect(summary.totalSheets).toBe(3);
  });

  it('calculates total cost when sheetUnitCost is provided', () => {
    const summary = buildCutPlanSummary([sheet('MDF', 2, ONE_SHEET_AREA, 45)]);
    expect(summary.hasCostData).toBe(true);
    expect(summary.totalCost).toBe(90);
    expect(summary.currency).toBe('USD');
  });
});

describe('buildCutPlanSummary — multiple materials', () => {
  it('sums all sheets across materials', () => {
    const summary = buildCutPlanSummary([
      sheet('MDF 18mm', 2, ONE_SHEET_AREA * 1.6),
      sheet('Plywood 12mm', 3, ONE_SHEET_AREA * 2.4),
    ]);
    expect(summary.totalSheets).toBe(5);
    expect(summary.materials).toHaveLength(2);
  });

  it('computes overall waste percent', () => {
    const summary = buildCutPlanSummary([
      sheet('MDF', 1, ONE_SHEET_AREA * 0.8), // 20% waste
      sheet('Ply', 1, ONE_SHEET_AREA * 0.8), // 20% waste
    ]);
    expect(summary.overallWastePercent).toBeCloseTo(20, 0);
  });

  it('sums costs across materials', () => {
    const summary = buildCutPlanSummary([sheet('MDF', 2, ONE_SHEET_AREA, 40), sheet('Ply', 1, ONE_SHEET_AREA, 60)]);
    expect(summary.totalCost).toBe(140);
  });
});

describe('buildCutPlanSummary — empty', () => {
  it('handles empty input', () => {
    const summary = buildCutPlanSummary([]);
    expect(summary.totalSheets).toBe(0);
    expect(summary.overallWastePercent).toBe(0);
    expect(summary.hasCostData).toBe(false);
  });
});

describe('formatCutPlanSummary', () => {
  it('includes material names and total line', () => {
    const summary = buildCutPlanSummary([
      sheet('MDF 18mm', 2, ONE_SHEET_AREA * 1.6),
      sheet('Plywood 12mm', 1, ONE_SHEET_AREA * 0.75),
    ]);
    const text = formatCutPlanSummary(summary);
    expect(text).toContain('MDF 18mm');
    expect(text).toContain('Plywood 12mm');
    expect(text).toContain('TOTAL');
  });

  it('includes cost line when cost data is present', () => {
    const summary = buildCutPlanSummary([sheet('MDF', 2, ONE_SHEET_AREA, 45)]);
    const text = formatCutPlanSummary(summary);
    expect(text).toContain('Total cost:');
    expect(text).toContain('90');
  });
});
