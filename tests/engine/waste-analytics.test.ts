import { describe, it, expect } from 'vitest';
import { analyzeWaste, formatAreaM2 } from '../../src/engine/waste-analytics';
import type { OptimizationResult, CutSheet } from '../../src/engine/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SHEET_W = 1220;
const SHEET_L = 2440;
const SHEET_AREA = SHEET_W * SHEET_L; // 2_976_800 mm²

function makeSheet(material: string, sheetIndex: number, usedFraction: number): CutSheet {
  return {
    sheetIndex,
    material,
    thickness: 18,
    sheetWidth: SHEET_W,
    sheetLength: SHEET_L,
    yieldPercent: usedFraction * 100,
    parts: [
      {
        partId: `p-${sheetIndex}`,
        label: 'Panel',
        x: 0,
        y: 0,
        width: SHEET_W,
        length: Math.round(SHEET_L * usedFraction),
        grainVertical: false,
      },
    ],
  };
}

function makeResult(sheets: CutSheet[]): OptimizationResult {
  const usedTotal = sheets.reduce((s, sh) => s + sh.parts.reduce((a, p) => a + p.width * p.length, 0), 0);
  const totalArea = sheets.reduce((s, sh) => s + sh.sheetWidth * sh.sheetLength, 0);
  return {
    sheets,
    totalSheets: sheets.length,
    overallYield: totalArea > 0 ? (usedTotal / totalArea) * 100 : 0,
    totalWaste: totalArea - usedTotal,
    grainConflictCount: 0,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('analyzeWaste — empty result', () => {
  it('returns zero totals for an empty sheet list', () => {
    const analytics = analyzeWaste(makeResult([]));
    expect(analytics.totalSheets).toBe(0);
    expect(analytics.totalAreaMm2).toBe(0);
    expect(analytics.totalWasteMm2).toBe(0);
    expect(analytics.overallWastePercent).toBe(0);
    expect(analytics.offcutCandidateCount).toBe(0);
  });
});

describe('analyzeWaste — single sheet', () => {
  it.each([
    ['90% used → 10% waste → excellent rating', 0.9, 'excellent'],
    ['80% used → 20% waste → good rating', 0.8, 'good'],
    ['65% used → 35% waste → fair rating', 0.65, 'fair'],
    ['50% used → 50% waste → poor rating', 0.5, 'poor'],
  ] as const)('%s', (_label, fraction, expectedRating) => {
    const analytics = analyzeWaste(makeResult([makeSheet('MDF-18', 0, fraction)]));
    expect(analytics.efficiencyRating).toBe(expectedRating);
    expect(analytics.overallWastePercent).toBeCloseTo((1 - fraction) * 100, 0);
  });

  it('marks sheet as offcut candidate when waste ≥ 15%', () => {
    const analytics = analyzeWaste(makeResult([makeSheet('MDF-18', 0, 0.8)])); // 20% waste
    expect(analytics.sheets[0].offcutCandidate).toBe(true);
    expect(analytics.offcutCandidateCount).toBe(1);
  });

  it('does NOT mark sheet as offcut candidate when waste < 15%', () => {
    const analytics = analyzeWaste(makeResult([makeSheet('MDF-18', 0, 0.9)])); // 10% waste
    expect(analytics.sheets[0].offcutCandidate).toBe(false);
    expect(analytics.offcutCandidateCount).toBe(0);
  });
});

describe('analyzeWaste — multiple sheets', () => {
  it('aggregates totals correctly across two sheets of the same material', () => {
    const result = makeResult([makeSheet('Ply-12', 0, 0.7), makeSheet('Ply-12', 1, 0.9)]);
    const analytics = analyzeWaste(result);
    expect(analytics.totalSheets).toBe(2);
    expect(analytics.byMaterial).toHaveLength(1);
    expect(analytics.byMaterial[0].sheetCount).toBe(2);
  });

  it('groups separate materials into distinct byMaterial entries', () => {
    const result = makeResult([makeSheet('MDF-18', 0, 0.8), makeSheet('Ply-12', 1, 0.85)]);
    const analytics = analyzeWaste(result);
    expect(analytics.byMaterial).toHaveLength(2);
    const materials = analytics.byMaterial.map((m) => m.material);
    expect(materials).toContain('MDF-18');
    expect(materials).toContain('Ply-12');
  });

  it('identifies the worst sheet first in worstSheets', () => {
    const result = makeResult([
      makeSheet('MDF-18', 0, 0.9), // 10% waste
      makeSheet('MDF-18', 1, 0.5), // 50% waste — worst
      makeSheet('MDF-18', 2, 0.7), // 30% waste
    ]);
    const analytics = analyzeWaste(result);
    expect(analytics.worstSheets[0].sheetIndex).toBe(1);
    expect(analytics.worstSheets[0].wastePercent).toBeCloseTo(50, 0);
  });

  it('limits worstSheets to at most 3 entries', () => {
    const sheets = Array.from({ length: 6 }, (_, i) => makeSheet('MDF', i, 0.5 + i * 0.05));
    const analytics = analyzeWaste(makeResult(sheets));
    expect(analytics.worstSheets.length).toBeLessThanOrEqual(3);
  });

  it('computes recoverable offcut area as sum of waste from candidate sheets only', () => {
    const result = makeResult([
      makeSheet('MDF', 0, 0.5), // 50% waste — candidate
      makeSheet('MDF', 1, 0.95), // 5% waste — NOT candidate
    ]);
    const analytics = analyzeWaste(result);
    const expectedRecoverable = SHEET_AREA * 0.5;
    expect(analytics.offcutCandidateAreaMm2).toBeCloseTo(expectedRecoverable, -3);
  });
});

describe('formatAreaM2', () => {
  it.each([
    ['1 sheet (1220×2440) → ~2.98 m²', SHEET_AREA, '2.98 m²'],
    ['zero area → 0.00 m²', 0, '0.00 m²'],
    ['1,000,000 mm² → 1.00 m²', 1_000_000, '1.00 m²'],
  ] as const)('%s', (_label, input, expected) => {
    expect(formatAreaM2(input)).toBe(expected);
  });
});
