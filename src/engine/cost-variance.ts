/**
 * Sprint 29 — Material cost variance report engine.
 *
 * Compares estimated material costs (from `estimateCost`) against
 * actual purchase costs entered by the user.  Quantifies savings from
 * offcut reuse, co-nesting, and sheet consolidation.
 *
 * Pure function — no React, no side effects.
 */

import type { Percent } from './types';
import { asPct } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MaterialCostEntry {
  /** Material key (e.g. 'plywood-18'). */
  materialKey: string;
  /** Human-readable material name. */
  materialName: string;
  /** Estimated cost (from BOM engine, before offcut savings). */
  estimatedCost: number;
  /** Actual cost paid (entered by user). */
  actualCost: number;
  /** Estimated cost saving from offcut reuse (negative = cost reduction). */
  offcutSaving: number;
  /** Estimated cost saving from co-nesting consolidation. */
  coNestingSaving: number;
  /** Currency code (e.g. 'ILS', 'USD'). */
  currencyCode: string;
}

export interface CostVarianceLine {
  materialKey: string;
  materialName: string;
  estimatedCost: number;
  actualCost: number;
  /** Raw variance: actual − estimated (negative = under budget). */
  variance: number;
  /** Variance as a percentage of estimated cost. */
  variancePct: Percent;
  offcutSaving: number;
  coNestingSaving: number;
  /** Net saving = offcutSaving + coNestingSaving (positive = saved money). */
  totalSaving: number;
  currencyCode: string;
}

export interface CostVarianceReport {
  lines: CostVarianceLine[];
  /** Sum of all estimated costs. */
  totalEstimated: number;
  /** Sum of all actual costs. */
  totalActual: number;
  /** Total variance (actual − estimated). */
  totalVariance: number;
  /** Overall variance percentage. */
  totalVariancePct: Percent;
  /** Total savings from offcuts + co-nesting across all materials. */
  totalSavings: number;
  /** Dominant currency code (mode of `currencyCode` values). */
  currencyCode: string;
}

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Build a cost variance report from a list of material cost entries.
 *
 * @param entries  Array of per-material cost data.
 * @returns        Structured variance report.
 */
export function generateCostVarianceReport(entries: readonly MaterialCostEntry[]): CostVarianceReport {
  const lines: CostVarianceLine[] = entries.map((e) => {
    const variance = e.actualCost - e.estimatedCost;
    const variancePct = e.estimatedCost !== 0 ? asPct(Math.round((variance / e.estimatedCost) * 1000) / 10) : asPct(0);
    const totalSaving = e.offcutSaving + e.coNestingSaving;
    return {
      materialKey: e.materialKey,
      materialName: e.materialName,
      estimatedCost: e.estimatedCost,
      actualCost: e.actualCost,
      variance,
      variancePct,
      offcutSaving: e.offcutSaving,
      coNestingSaving: e.coNestingSaving,
      totalSaving,
      currencyCode: e.currencyCode,
    };
  });

  const totalEstimated = lines.reduce((s, l) => s + l.estimatedCost, 0);
  const totalActual = lines.reduce((s, l) => s + l.actualCost, 0);
  const totalVariance = totalActual - totalEstimated;
  const totalVariancePct =
    totalEstimated !== 0 ? asPct(Math.round((totalVariance / totalEstimated) * 1000) / 10) : asPct(0);
  const totalSavings = lines.reduce((s, l) => s + l.totalSaving, 0);

  // Dominant currency = most frequent code in entries
  const currencyCount: Record<string, number> = {};
  for (const e of entries) currencyCount[e.currencyCode] = (currencyCount[e.currencyCode] ?? 0) + 1;
  const currencyCode = Object.entries(currencyCount).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'USD';

  return { lines, totalEstimated, totalActual, totalVariance, totalVariancePct, totalSavings, currencyCode };
}

/**
 * Format a variance report as a CSV string for download.
 * Columns: Material | Estimated | Actual | Variance | Variance% | Offcut saving | CoNesting saving | Total saving | Currency
 */
export function formatCostVarianceReportAsCsv(report: CostVarianceReport): string {
  const header = [
    'Material',
    'Estimated',
    'Actual',
    'Variance',
    'Variance %',
    'Offcut Saving',
    'CoNesting Saving',
    'Total Saving',
    'Currency',
  ].join(',');

  const rows = report.lines.map((l) =>
    [
      JSON.stringify(l.materialName),
      l.estimatedCost.toFixed(2),
      l.actualCost.toFixed(2),
      l.variance.toFixed(2),
      `${l.variancePct}%`,
      l.offcutSaving.toFixed(2),
      l.coNestingSaving.toFixed(2),
      l.totalSaving.toFixed(2),
      l.currencyCode,
    ].join(','),
  );

  const totals = [
    '"TOTAL"',
    report.totalEstimated.toFixed(2),
    report.totalActual.toFixed(2),
    report.totalVariance.toFixed(2),
    `${report.totalVariancePct}%`,
    '',
    '',
    report.totalSavings.toFixed(2),
    report.currencyCode,
  ].join(',');

  return [header, ...rows, totals].join('\n');
}
