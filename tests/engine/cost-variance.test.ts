import { describe, it, expect } from 'vitest';
import { generateCostVarianceReport, formatCostVarianceReportAsCsv } from '../../src/engine/cost-variance';
import type { MaterialCostEntry } from '../../src/engine/cost-variance';

const sampleEntry = (overrides: Partial<MaterialCostEntry> = {}): MaterialCostEntry => ({
  materialKey: 'plywood-18',
  materialName: 'Birch Plywood 18 mm',
  estimatedCost: 100,
  actualCost: 95,
  offcutSaving: 8,
  coNestingSaving: 3,
  currencyCode: 'ILS',
  ...overrides,
});

describe('generateCostVarianceReport', () => {
  it('returns a report with one line per entry', () => {
    const entries = [sampleEntry(), sampleEntry({ materialKey: 'melamine-16', materialName: 'Melamine 16 mm' })];
    const report = generateCostVarianceReport(entries);
    expect(report.lines).toHaveLength(2);
  });

  it('calculates variance correctly (actual − estimated)', () => {
    const entries = [sampleEntry({ estimatedCost: 100, actualCost: 95 })];
    const report = generateCostVarianceReport(entries);
    expect(report.lines[0].variance).toBe(-5);
  });

  it('calculates variance percentage correctly', () => {
    const entries = [sampleEntry({ estimatedCost: 100, actualCost: 90 })];
    const report = generateCostVarianceReport(entries);
    expect(report.lines[0].variancePct).toBe(-10);
  });

  it('calculates totalSaving = offcutSaving + coNestingSaving', () => {
    const entries = [sampleEntry({ offcutSaving: 8, coNestingSaving: 3 })];
    const report = generateCostVarianceReport(entries);
    expect(report.lines[0].totalSaving).toBe(11);
  });

  it('calculates total estimated cost across all entries', () => {
    const entries = [sampleEntry({ estimatedCost: 100 }), sampleEntry({ estimatedCost: 200, materialKey: 'm2' })];
    const report = generateCostVarianceReport(entries);
    expect(report.totalEstimated).toBe(300);
  });

  it('calculates total actual cost across all entries', () => {
    const entries = [sampleEntry({ actualCost: 90 }), sampleEntry({ actualCost: 180, materialKey: 'm2' })];
    const report = generateCostVarianceReport(entries);
    expect(report.totalActual).toBe(270);
  });

  it('calculates total variance = totalActual − totalEstimated', () => {
    const entries = [sampleEntry({ estimatedCost: 100, actualCost: 90 })];
    const report = generateCostVarianceReport(entries);
    expect(report.totalVariance).toBe(-10);
  });

  it('calculates total savings across all materials', () => {
    const entries = [
      sampleEntry({ offcutSaving: 5, coNestingSaving: 2 }),
      sampleEntry({ materialKey: 'm2', offcutSaving: 3, coNestingSaving: 1 }),
    ];
    const report = generateCostVarianceReport(entries);
    expect(report.totalSavings).toBe(11);
  });

  it('uses dominant currency code', () => {
    const entries = [
      sampleEntry({ currencyCode: 'ILS' }),
      sampleEntry({ materialKey: 'm2', currencyCode: 'ILS' }),
      sampleEntry({ materialKey: 'm3', currencyCode: 'USD' }),
    ];
    const report = generateCostVarianceReport(entries);
    expect(report.currencyCode).toBe('ILS');
  });

  it('handles empty entries gracefully', () => {
    const report = generateCostVarianceReport([]);
    expect(report.lines).toHaveLength(0);
    expect(report.totalEstimated).toBe(0);
    expect(report.totalActual).toBe(0);
    expect(report.totalSavings).toBe(0);
  });

  it('handles zero estimated cost (no division by zero)', () => {
    const entries = [sampleEntry({ estimatedCost: 0, actualCost: 50 })];
    const report = generateCostVarianceReport(entries);
    expect(report.lines[0].variancePct).toBe(0);
  });
});

describe('formatCostVarianceReportAsCsv', () => {
  it('produces CSV with header and total rows', () => {
    const report = generateCostVarianceReport([sampleEntry()]);
    const csv = formatCostVarianceReportAsCsv(report);
    expect(csv).toContain('Material,Estimated');
    expect(csv).toContain('TOTAL');
  });

  it('includes material name in output', () => {
    const report = generateCostVarianceReport([sampleEntry({ materialName: 'Birch Plywood 18 mm' })]);
    const csv = formatCostVarianceReportAsCsv(report);
    expect(csv).toContain('Birch Plywood 18 mm');
  });

  it('includes currency code in output', () => {
    const report = generateCostVarianceReport([sampleEntry({ currencyCode: 'ILS' })]);
    const csv = formatCostVarianceReportAsCsv(report);
    expect(csv).toContain('ILS');
  });
});
