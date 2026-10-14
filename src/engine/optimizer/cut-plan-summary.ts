/**
 * Sprint 34 — Multi-sheet cut plan summary engine.
 *
 * Aggregates results from the cut optimizer across all sheets and materials
 * and produces a concise summary report suitable for:
 *   - BOM PDF cover page
 *   - ERP/G-code export headers
 *   - Console/log output
 *
 * Input is intentionally simple (no dependency on cut-optimizer internals).
 *
 * Pure function — no React, no side effects.
 */

// ─── Input ────────────────────────────────────────────────────────────────────

export interface SheetPlanInput {
  material: string;
  /** Number of sheets of this type used. */
  sheetCount: number;
  /** Dimensions of ONE standard sheet in mm. */
  sheetWidthMm: number;
  sheetLengthMm: number;
  /** Total placed-part area across all sheets (mm²). */
  usedAreaMm2: number;
  /** Optional: unit cost of one sheet in the project currency. */
  sheetUnitCost?: number;
  /** ISO 4217 currency code, e.g. "USD". Required when sheetUnitCost is provided. */
  currency?: string;
}

// ─── Output ───────────────────────────────────────────────────────────────────

export interface MaterialSummary {
  material: string;
  sheetCount: number;
  totalAreaMm2: number;
  usedAreaMm2: number;
  wasteAreaMm2: number;
  wastePercent: number;
  totalCost?: number;
  currency?: string;
}

export interface CutPlanSummary {
  /** Per-material breakdown. */
  materials: MaterialSummary[];
  /** Project totals. */
  totalSheets: number;
  totalAreaMm2: number;
  totalUsedMm2: number;
  totalWasteMm2: number;
  overallWastePercent: number;
  /** True when cost data is available for at least one material. */
  hasCostData: boolean;
  /** Sum of all material costs (when hasCostData). */
  totalCost?: number;
  /** Dominant currency (first one found with cost data). */
  currency?: string;
}

// ─── Core ─────────────────────────────────────────────────────────────────────

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Build a structured cut plan summary from a list of per-material sheet plans.
 */
export function buildCutPlanSummary(plans: SheetPlanInput[]): CutPlanSummary {
  const materials: MaterialSummary[] = plans.map((p) => {
    const totalAreaMm2 = p.sheetCount * p.sheetWidthMm * p.sheetLengthMm;
    const wasteAreaMm2 = totalAreaMm2 - p.usedAreaMm2;
    const wastePercent = totalAreaMm2 > 0 ? round1((wasteAreaMm2 / totalAreaMm2) * 100) : 0;
    const totalCost = p.sheetUnitCost !== undefined ? round1(p.sheetCount * p.sheetUnitCost) : undefined;
    return {
      material: p.material,
      sheetCount: p.sheetCount,
      totalAreaMm2,
      usedAreaMm2: p.usedAreaMm2,
      wasteAreaMm2,
      wastePercent,
      totalCost,
      currency: p.currency,
    };
  });

  const totalSheets = materials.reduce((s, m) => s + m.sheetCount, 0);
  const totalAreaMm2 = materials.reduce((s, m) => s + m.totalAreaMm2, 0);
  const totalUsedMm2 = materials.reduce((s, m) => s + m.usedAreaMm2, 0);
  const totalWasteMm2 = totalAreaMm2 - totalUsedMm2;
  const overallWastePercent = totalAreaMm2 > 0 ? round1((totalWasteMm2 / totalAreaMm2) * 100) : 0;

  const costItems = materials.filter((m) => m.totalCost !== undefined);
  const hasCostData = costItems.length > 0;
  const totalCost = hasCostData ? round1(costItems.reduce((s, m) => s + (m.totalCost ?? 0), 0)) : undefined;
  const currency = costItems[0]?.currency;

  return {
    materials,
    totalSheets,
    totalAreaMm2,
    totalUsedMm2,
    totalWasteMm2,
    overallWastePercent,
    hasCostData,
    totalCost,
    currency,
  };
}

/** Format a cut plan summary as a plain-text table suitable for console / PDF. */
export function formatCutPlanSummary(summary: CutPlanSummary): string {
  const lines: string[] = [];
  lines.push('=== Cut Plan Summary ===');
  lines.push(
    `${'Material'.padEnd(24)} ${'Sheets'.padStart(6)} ${'Used m²'.padStart(9)} ${'Waste'.padStart(8)} ${'Waste%'.padStart(7)}`,
  );
  lines.push('-'.repeat(58));
  for (const m of summary.materials) {
    const usedM2 = (m.usedAreaMm2 / 1e6).toFixed(3);
    const wastePct = `${m.wastePercent}%`;
    const costStr = m.totalCost !== undefined ? `  (${m.currency ?? ''} ${m.totalCost})` : '';
    lines.push(
      `${m.material.padEnd(24)} ${String(m.sheetCount).padStart(6)} ${usedM2.padStart(9)} ${(m.wasteAreaMm2 / 1e6).toFixed(3).padStart(8)} ${wastePct.padStart(7)}${costStr}`,
    );
  }
  lines.push('-'.repeat(58));
  lines.push(
    `${'TOTAL'.padEnd(24)} ${String(summary.totalSheets).padStart(6)} ${(summary.totalUsedMm2 / 1e6).toFixed(3).padStart(9)} ${(summary.totalWasteMm2 / 1e6).toFixed(3).padStart(8)} ${`${summary.overallWastePercent}%`.padStart(7)}`,
  );
  if (summary.hasCostData && summary.totalCost !== undefined) {
    lines.push(`Total cost: ${summary.currency ?? ''} ${summary.totalCost}`);
  }
  return lines.join('\n');
}
