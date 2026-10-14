/**
 * Sprint 95 — Project Cost Summary Export
 *
 * Pure-TS utility that aggregates a `CostBreakdown` into a structured
 * summary suitable for display, CSV export, or JSON serialisation.
 *
 * No React, no DOM, no side effects.
 */

import type { CostBreakdown } from './cost-estimator';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CostSummaryLine {
  labelKey: string;
  labelFallback: string;
  amount: number;
  pct: number;
}

export interface CostSummary {
  lines: CostSummaryLine[];
  totalCost: number;
  currency: string;
  /** ISO 8601 timestamp when the summary was generated */
  generatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(amount: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((amount / total) * 10000) / 100;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Aggregate a `CostBreakdown` into a flat `CostSummary` with percentage shares.
 *
 * @param breakdown  The breakdown produced by `estimateCost()`.
 * @param currency   Three-letter currency code shown in exported documents.
 * @returns          A `CostSummary` ready for rendering or serialisation.
 */
export function buildCostSummary(breakdown: CostBreakdown, currency = '₪'): CostSummary {
  const total = breakdown.totalCost;

  const lines: CostSummaryLine[] = [
    {
      labelKey: 'costSummary.materials',
      labelFallback: 'Materials',
      amount: breakdown.totalMaterialCost,
      pct: pct(breakdown.totalMaterialCost, total),
    },
    {
      labelKey: 'costSummary.edgeBanding',
      labelFallback: 'Edge Banding',
      amount: breakdown.edgeBandingCost,
      pct: pct(breakdown.edgeBandingCost, total),
    },
    {
      labelKey: 'costSummary.hardware',
      labelFallback: 'Hardware',
      amount: breakdown.hardwareCost,
      pct: pct(breakdown.hardwareCost, total),
    },
    {
      labelKey: 'costSummary.waste',
      labelFallback: 'Waste Allowance',
      amount: breakdown.wasteCost,
      pct: pct(breakdown.wasteCost, total),
    },
    {
      labelKey: 'costSummary.finish',
      labelFallback: 'Finish / Paint',
      amount: breakdown.finishCost,
      pct: pct(breakdown.finishCost, total),
    },
    {
      labelKey: 'costSummary.labour',
      labelFallback: 'Labour',
      amount: breakdown.labourCost,
      pct: pct(breakdown.labourCost, total),
    },
  ].filter((l) => l.amount > 0);

  return {
    lines,
    totalCost: total,
    currency,
    generatedAt: new Date().toISOString(),
  };
}

// ─── CSV serialiser ───────────────────────────────────────────────────────────

/**
 * Serialise a `CostSummary` to CSV text (RFC 4180).
 *
 * @param summary  The summary to serialise.
 * @returns        A UTF-8 CSV string ready for download as `cost-summary.csv`.
 */
export function costSummaryToCsv(summary: CostSummary): string {
  const rows: string[] = [
    `Category,Amount (${summary.currency}),Share (%)`,
    ...summary.lines.map((l) => `${csvEscape(l.labelFallback)},${l.amount.toFixed(2)},${l.pct.toFixed(2)}`),
    `Total,${summary.totalCost.toFixed(2)},100.00`,
  ];
  return rows.join('\r\n');
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
