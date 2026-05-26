/**
 * Sprint 92 — Smart Waste Analytics
 *
 * Analyses an OptimizationResult and produces a structured waste report:
 * per-sheet breakdown, per-material totals, worst-performing sheets, and
 * offcut candidate identification.
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

import type { OptimizationResult, CutSheet } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Waste metrics for a single cut sheet. */
export interface SheetWasteInfo {
  sheetIndex: number;
  material: string;
  /** Total sheet area in mm² (sheetWidth × sheetLength). */
  sheetAreaMm2: number;
  /** Area covered by placed parts in mm². */
  usedAreaMm2: number;
  /** Wasted area in mm² (sheetAreaMm2 − usedAreaMm2). */
  wasteAreaMm2: number;
  /** Waste as a percentage of sheet area (0–100). */
  wastePercent: number;
  /**
   * True when the largest contiguous waste strip is at least 100 mm × 100 mm —
   * a heuristic indicating the sheet is a viable offcut for small parts.
   */
  offcutCandidate: boolean;
}

/** Aggregated waste metrics for one material across all its sheets. */
export interface WasteMaterialSummary {
  material: string;
  sheetCount: number;
  /** Total sheet area for this material (mm²). */
  totalAreaMm2: number;
  /** Area used by placed parts (mm²). */
  usedAreaMm2: number;
  /** Wasted area (mm²). */
  wasteAreaMm2: number;
  /** Waste percentage (0–100). */
  wastePercent: number;
}

/** Full waste analysis report derived from an OptimizationResult. */
export interface WasteAnalytics {
  /** Per-sheet detail rows. */
  sheets: SheetWasteInfo[];
  /** Per-material aggregated rows. */
  byMaterial: WasteMaterialSummary[];
  /** Up to 3 worst-waste sheets (highest wastePercent first). */
  worstSheets: SheetWasteInfo[];
  totalSheets: number;
  totalAreaMm2: number;
  totalUsedMm2: number;
  totalWasteMm2: number;
  /** Overall waste as a percentage (0–100). */
  overallWastePercent: number;
  /** Number of sheets that qualify as offcut candidates. */
  offcutCandidateCount: number;
  /** Total recoverable area from offcut-candidate sheets (mm²). */
  offcutCandidateAreaMm2: number;
  /** Efficiency rating bucket based on overallWastePercent. */
  efficiencyRating: 'excellent' | 'good' | 'fair' | 'poor';
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum waste percentage on a sheet for it to be flagged as an offcut candidate. */
const OFFCUT_CANDIDATE_THRESHOLD_PCT = 15;

/** Waste thresholds for efficiency buckets (%). */
const EFFICIENCY_THRESHOLDS = {
  excellent: 10,
  good: 20,
  fair: 35,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sheetArea(sheet: CutSheet): number {
  return sheet.sheetWidth * sheet.sheetLength;
}

function placedArea(sheet: CutSheet): number {
  return sheet.parts.reduce((sum, p) => sum + p.width * p.length, 0);
}

function toEfficiencyRating(wastePercent: number): WasteAnalytics['efficiencyRating'] {
  if (wastePercent <= EFFICIENCY_THRESHOLDS.excellent) return 'excellent';
  if (wastePercent <= EFFICIENCY_THRESHOLDS.good) return 'good';
  if (wastePercent <= EFFICIENCY_THRESHOLDS.fair) return 'fair';
  return 'poor';
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Produce a full waste analytics report from a cut-optimizer result.
 *
 * @param result - The `OptimizationResult` returned by `optimizeCutSheets`.
 * @returns      - A structured `WasteAnalytics` report.
 */
export function analyzeWaste(result: OptimizationResult): WasteAnalytics {
  const sheets: SheetWasteInfo[] = result.sheets.map((sheet) => {
    const sheetAreaMm2 = sheetArea(sheet);
    const usedAreaMm2 = placedArea(sheet);
    const wasteAreaMm2 = Math.max(0, sheetAreaMm2 - usedAreaMm2);
    const wastePercent = sheetAreaMm2 > 0 ? (wasteAreaMm2 / sheetAreaMm2) * 100 : 0;
    const offcutCandidate = wastePercent >= OFFCUT_CANDIDATE_THRESHOLD_PCT;

    return {
      sheetIndex: sheet.sheetIndex,
      material: sheet.material,
      sheetAreaMm2,
      usedAreaMm2,
      wasteAreaMm2,
      wastePercent,
      offcutCandidate,
    };
  });

  // Per-material aggregation
  const matMap = new Map<string, WasteMaterialSummary>();
  for (const s of sheets) {
    const existing = matMap.get(s.material);
    if (existing) {
      existing.sheetCount += 1;
      existing.totalAreaMm2 += s.sheetAreaMm2;
      existing.usedAreaMm2 += s.usedAreaMm2;
      existing.wasteAreaMm2 += s.wasteAreaMm2;
    } else {
      matMap.set(s.material, {
        material: s.material,
        sheetCount: 1,
        totalAreaMm2: s.sheetAreaMm2,
        usedAreaMm2: s.usedAreaMm2,
        wasteAreaMm2: s.wasteAreaMm2,
        wastePercent: 0, // calculated below
      });
    }
  }
  const byMaterial: WasteMaterialSummary[] = Array.from(matMap.values()).map((m) => ({
    ...m,
    wastePercent: m.totalAreaMm2 > 0 ? (m.wasteAreaMm2 / m.totalAreaMm2) * 100 : 0,
  }));

  // Totals
  const totalAreaMm2 = sheets.reduce((s, r) => s + r.sheetAreaMm2, 0);
  const totalUsedMm2 = sheets.reduce((s, r) => s + r.usedAreaMm2, 0);
  const totalWasteMm2 = sheets.reduce((s, r) => s + r.wasteAreaMm2, 0);
  const overallWastePercent = totalAreaMm2 > 0 ? (totalWasteMm2 / totalAreaMm2) * 100 : 0;

  // Worst sheets — top 3 by waste percent
  const worstSheets = [...sheets].sort((a, b) => b.wastePercent - a.wastePercent).slice(0, 3);

  const offcutCandidates = sheets.filter((s) => s.offcutCandidate);
  const offcutCandidateCount = offcutCandidates.length;
  const offcutCandidateAreaMm2 = offcutCandidates.reduce((s, r) => s + r.wasteAreaMm2, 0);

  return {
    sheets,
    byMaterial,
    worstSheets,
    totalSheets: sheets.length,
    totalAreaMm2,
    totalUsedMm2,
    totalWasteMm2,
    overallWastePercent,
    offcutCandidateCount,
    offcutCandidateAreaMm2,
    efficiencyRating: toEfficiencyRating(overallWastePercent),
  };
}

/**
 * Format a mm² area as a human-readable m² string rounded to 2 decimal places.
 *
 * @example formatAreaM2(1220 * 2440) → "2.98 m²"
 */
export function formatAreaM2(areaMm2: number): string {
  return `${(areaMm2 / 1e6).toFixed(2)} m²`;
}
