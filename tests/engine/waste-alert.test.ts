import { describe, it, expect } from 'vitest';
import { analyseWaste, formatWasteReport, DEFAULT_WASTE_THRESHOLDS } from '../../src/engine/waste-alert';
import type { SheetWasteInput } from '../../src/engine/waste-alert';

const sheet = (material: string, usedMm2: number, sheetAreaMm2: number): SheetWasteInput => ({
  material,
  usedAreaMm2: usedMm2,
  sheetAreaMm2,
});

describe('analyseWaste — no alerts', () => {
  it('returns no alerts when waste is below all thresholds', () => {
    // Sheet: 2 592 000 mm² (1220×2440), used: 2 200 000 → ~15% waste
    const report = analyseWaste([sheet('MDF 18mm', 2_200_000, 2_592_000)]);
    expect(report.hasAlerts).toBe(false);
    expect(report.alerts).toHaveLength(0);
  });

  it('returns no alerts for an empty sheet list', () => {
    const report = analyseWaste([]);
    expect(report.hasAlerts).toBe(false);
    expect(report.projectWastePercent).toBe(0);
  });
});

describe('analyseWaste — sheet-level alert', () => {
  it('raises a warning when sheet waste exceeds threshold', () => {
    // used = 600 000 out of 2 592 000 → ~76.9% waste — well above 30%
    const report = analyseWaste([sheet('Plywood 15mm', 600_000, 2_592_000)]);
    const sheetAlerts = report.alerts.filter((a) => a.scope === 'sheet');
    expect(sheetAlerts.length).toBeGreaterThan(0);
    expect(sheetAlerts[0].material).toBe('Plywood 15mm');
  });

  it('marks as critical when waste is >150% of threshold', () => {
    // threshold=30%, 150%=45%, so >45% should be critical
    const report = analyseWaste([sheet('MDF', 500_000, 2_592_000)]); // ~80% waste
    const sheetAlerts = report.alerts.filter((a) => a.scope === 'sheet');
    expect(sheetAlerts[0].level).toBe('critical');
  });
});

describe('analyseWaste — group-level alert', () => {
  it('raises a group alert when material average exceeds group threshold', () => {
    // Two sheets of same material, both ~40% waste → avg 40% > 25% group threshold
    const sheets = [sheet('MDF 18mm', 1_500_000, 2_592_000), sheet('MDF 18mm', 1_500_000, 2_592_000)];
    const report = analyseWaste(sheets, { sheetWastePercent: 50 }); // suppress sheet alerts
    const groupAlerts = report.alerts.filter((a) => a.scope === 'group');
    expect(groupAlerts.length).toBeGreaterThan(0);
    expect(groupAlerts[0].material).toBe('MDF 18mm');
  });
});

describe('analyseWaste — project-level alert', () => {
  it('raises a project alert when overall waste exceeds project threshold', () => {
    // Large waste across all sheets
    const sheets = [sheet('MDF', 1_000_000, 2_592_000), sheet('Oak', 1_000_000, 2_592_000)];
    const report = analyseWaste(sheets, { sheetWastePercent: 100, groupWastePercent: 100 });
    const projAlerts = report.alerts.filter((a) => a.scope === 'project');
    expect(projAlerts.length).toBe(1);
  });
});

describe('analyseWaste — custom thresholds', () => {
  it('respects custom threshold overrides', () => {
    // ~15% waste — normally no alert, but set custom threshold to 10%
    const report = analyseWaste([sheet('MDF', 2_200_000, 2_592_000)], { projectWastePercent: 10 });
    const projAlerts = report.alerts.filter((a) => a.scope === 'project');
    expect(projAlerts.length).toBe(1);
  });
});

describe('analyseWaste — groupWastePercents', () => {
  it('calculates per-material group waste %', () => {
    const report = analyseWaste([sheet('MDF', 2_200_000, 2_592_000), sheet('Plywood', 1_800_000, 2_592_000)]);
    expect(report.groupWastePercents['MDF']).toBeGreaterThan(0);
    expect(report.groupWastePercents['Plywood']).toBeGreaterThan(0);
  });
});

describe('formatWasteReport', () => {
  it('returns "No waste threshold alerts." when no alerts', () => {
    const report = analyseWaste([sheet('MDF', 2_200_000, 2_592_000)]);
    expect(formatWasteReport(report)).toBe('No waste threshold alerts.');
  });

  it('includes alert level and message in output', () => {
    // ~88% waste — well above 150% of 30% threshold → CRITICAL
    const report = analyseWaste([sheet('MDF', 300_000, 2_592_000)]);
    const text = formatWasteReport(report);
    expect(text).toMatch(/\[(WARNING|CRITICAL)\]/);
    expect(text).toContain('MDF');
  });
});

describe('DEFAULT_WASTE_THRESHOLDS', () => {
  it('has expected default values', () => {
    expect(DEFAULT_WASTE_THRESHOLDS.sheetWastePercent).toBe(30);
    expect(DEFAULT_WASTE_THRESHOLDS.groupWastePercent).toBe(25);
    expect(DEFAULT_WASTE_THRESHOLDS.projectWastePercent).toBe(20);
  });
});
