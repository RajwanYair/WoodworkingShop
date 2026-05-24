/**
 * Sprint 33 — Cut waste threshold alert engine.
 *
 * Analyses a set of sheet-cut results and raises alerts when the waste
 * percentage for any individual sheet, any material group, or the project
 * as a whole exceeds user-configurable thresholds.
 *
 * Inputs are plain objects produced by the cut-optimizer — this module
 * does NOT import or reference the real CutOptimizerResult type to stay
 * independent of the optimizer's internal shape.
 *
 * Pure function — no React, no side effects.
 */

// ─── Input types ──────────────────────────────────────────────────────────────

/** Minimal sheet layout result needed for waste analysis. */
export interface SheetWasteInput {
  /** Material name / grade used to group sheets. */
  material: string;
  /** Total sheet area in mm² (sheetWidth × sheetLength). */
  sheetAreaMm2: number;
  /** Used area (sum of all placed part bounding-boxes) in mm². */
  usedAreaMm2: number;
}

/** Thresholds for raising alerts (percentages, 0–100). */
export interface WasteThresholds {
  /** Alert when a single sheet's waste % exceeds this value. Default: 30. */
  sheetWastePercent: number;
  /** Alert when a material group's average waste % exceeds this value. Default: 25. */
  groupWastePercent: number;
  /** Alert when the project-overall waste % exceeds this value. Default: 20. */
  projectWastePercent: number;
}

export const DEFAULT_WASTE_THRESHOLDS: WasteThresholds = {
  sheetWastePercent: 30,
  groupWastePercent: 25,
  projectWastePercent: 20,
};

// ─── Output types ─────────────────────────────────────────────────────────────

export type WasteAlertLevel = 'warning' | 'critical';

export interface WasteAlert {
  level: WasteAlertLevel;
  scope: 'sheet' | 'group' | 'project';
  /** Material group name, or "Project" for project-level alerts. */
  material: string;
  actualPercent: number;
  thresholdPercent: number;
  message: { en: string; he: string };
}

export interface WasteAnalysisReport {
  alerts: WasteAlert[];
  /** True if any alert was raised. */
  hasAlerts: boolean;
  projectWastePercent: number;
  /** Per-material group waste percentage. */
  groupWastePercents: Record<string, number>;
}

// ─── Core functions ───────────────────────────────────────────────────────────

/** Compute waste % from used and total areas. */
function wastePercent(usedMm2: number, totalMm2: number): number {
  if (totalMm2 === 0) return 0;
  return Math.round(((totalMm2 - usedMm2) / totalMm2) * 1000) / 10; // 1 decimal
}

/**
 * Analyse sheet waste and return a structured alert report.
 *
 * @param sheets  Array of sheet results from the cut optimizer.
 * @param thresholds  Optional override thresholds (defaults applied per field).
 */
export function analyseWaste(
  sheets: SheetWasteInput[],
  thresholds: Partial<WasteThresholds> = {},
): WasteAnalysisReport {
  const t: WasteThresholds = {
    sheetWastePercent: thresholds.sheetWastePercent ?? DEFAULT_WASTE_THRESHOLDS.sheetWastePercent,
    groupWastePercent: thresholds.groupWastePercent ?? DEFAULT_WASTE_THRESHOLDS.groupWastePercent,
    projectWastePercent: thresholds.projectWastePercent ?? DEFAULT_WASTE_THRESHOLDS.projectWastePercent,
  };

  const alerts: WasteAlert[] = [];

  // ── Per-sheet alerts ──────────────────────────────────────────────────────
  for (const sheet of sheets) {
    const pct = wastePercent(sheet.usedAreaMm2, sheet.sheetAreaMm2);
    if (pct > t.sheetWastePercent) {
      const level: WasteAlertLevel = pct > t.sheetWastePercent * 1.5 ? 'critical' : 'warning';
      alerts.push({
        level,
        scope: 'sheet',
        material: sheet.material,
        actualPercent: pct,
        thresholdPercent: t.sheetWastePercent,
        message: {
          en: `Sheet (${sheet.material}): ${pct}% waste exceeds ${t.sheetWastePercent}% threshold.`,
          he: `לוח (${sheet.material}): ${pct}% פסולת עולה על סף ${t.sheetWastePercent}%.`,
        },
      });
    }
  }

  // ── Per-material group alerts ─────────────────────────────────────────────
  const groups = new Map<string, { used: number; total: number }>();
  for (const sheet of sheets) {
    const g = groups.get(sheet.material) ?? { used: 0, total: 0 };
    g.used += sheet.usedAreaMm2;
    g.total += sheet.sheetAreaMm2;
    groups.set(sheet.material, g);
  }

  const groupWastePercents: Record<string, number> = {};
  for (const [mat, { used, total }] of groups) {
    const pct = wastePercent(used, total);
    groupWastePercents[mat] = pct;
    if (pct > t.groupWastePercent) {
      const level: WasteAlertLevel = pct > t.groupWastePercent * 1.5 ? 'critical' : 'warning';
      alerts.push({
        level,
        scope: 'group',
        material: mat,
        actualPercent: pct,
        thresholdPercent: t.groupWastePercent,
        message: {
          en: `Material group "${mat}": avg ${pct}% waste exceeds ${t.groupWastePercent}% threshold.`,
          he: `קבוצת חומר "${mat}": ממוצע ${pct}% פסולת עולה על סף ${t.groupWastePercent}%.`,
        },
      });
    }
  }

  // ── Project-level alert ───────────────────────────────────────────────────
  const totalUsed = sheets.reduce((s, sh) => s + sh.usedAreaMm2, 0);
  const totalArea = sheets.reduce((s, sh) => s + sh.sheetAreaMm2, 0);
  const projectPct = wastePercent(totalUsed, totalArea);

  if (projectPct > t.projectWastePercent) {
    const level: WasteAlertLevel = projectPct > t.projectWastePercent * 1.5 ? 'critical' : 'warning';
    alerts.push({
      level,
      scope: 'project',
      material: 'Project',
      actualPercent: projectPct,
      thresholdPercent: t.projectWastePercent,
      message: {
        en: `Project waste ${projectPct}% exceeds ${t.projectWastePercent}% threshold.`,
        he: `פסולת הפרויקט ${projectPct}% עולה על סף ${t.projectWastePercent}%.`,
      },
    });
  }

  return {
    alerts,
    hasAlerts: alerts.length > 0,
    projectWastePercent: projectPct,
    groupWastePercents,
  };
}

/** Format a waste analysis report as human-readable text. */
export function formatWasteReport(report: WasteAnalysisReport): string {
  if (!report.hasAlerts) return 'No waste threshold alerts.';
  return report.alerts.map((a) => `[${a.level.toUpperCase()}] ${a.message.en}`).join('\n');
}
