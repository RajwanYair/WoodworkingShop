/**
 * Sprint 123 — ISO 7171 compliance validation engine.
 *
 * Validates cabinet configurations against the ISO 7171 standard for modular
 * furniture co-ordinating dimensions and tolerances. Also incorporates
 * commonly-cited EN 14749 (domestic storage furniture) dimensional guidelines.
 *
 * Rules implemented:
 *   1. Module width must be a standard ISO 7171 module (300–600 mm, 100 mm steps
 *      or 450 mm) — tolerance ±10 mm.
 *   2. Base-cabinet height 700–800 mm (kitchen working height per ISO 7171-1).
 *   3. Wall-unit height 350–900 mm (standard wall-hung range).
 *   4. Base-cabinet depth 500–650 mm.
 *   5. Wall-unit depth 250–400 mm.
 *   6. Toe kick: if present, height 80–180 mm.
 *   7. Shelf spacing minimum 150 mm for utility shelves.
 *   8. Shelf count: maximum 6 for tall (> 1800 mm) cabinets; max 4 for base.
 *   9. Drawer clearance: drawerCount requires height ≥ drawerCount × 160 mm.
 *   10. Width:height ratio ≤ 2.5 for freestanding cabinets (stability).
 *
 * Pure function — no React, no DOM, no side effects.
 */

import type { CabinetConfig } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** ISO 7171 rule identifier. */
export type Iso7171RuleId =
  | 'module-width'
  | 'base-height'
  | 'wall-height'
  | 'base-depth'
  | 'wall-depth'
  | 'toe-kick-height'
  | 'shelf-spacing-min'
  | 'shelf-count-tall'
  | 'shelf-count-base'
  | 'drawer-clearance'
  | 'width-height-ratio';

/** Compliance level for a single rule check. */
export type Iso7171ComplianceLevel = 'pass' | 'advisory' | 'fail';

/** A single compliance finding for one ISO 7171 rule. */
export interface Iso7171Violation {
  ruleId: Iso7171RuleId;
  level: Iso7171ComplianceLevel;
  /** Human-readable description of the finding. */
  message: string;
  /** Actual measured value (numeric, where applicable). */
  actual?: number;
  /** Standard allowed value or range. */
  standard?: string;
}

/** Full ISO 7171 compliance report for a cabinet configuration. */
export interface Iso7171Report {
  /** True when zero 'fail' violations are present. */
  compliant: boolean;
  /** Total number of fail violations. */
  failCount: number;
  /** Total number of advisory violations. */
  advisoryCount: number;
  violations: Iso7171Violation[];
  /** Concise summary string. */
  summary: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Standard ISO 7171 module widths in mm. */
export const ISO7171_MODULE_WIDTHS: readonly number[] = [300, 400, 450, 500, 600] as const;

/** Module width tolerance in mm (±). */
export const ISO7171_MODULE_TOLERANCE = 10;

/** Standard base-cabinet height range (mm). Kitchen working height. */
export const ISO7171_BASE_HEIGHT = { min: 700, max: 800 } as const;

/** Standard wall-unit height range (mm). */
export const ISO7171_WALL_HEIGHT = { min: 350, max: 900 } as const;

/** Standard base-cabinet depth range (mm). */
export const ISO7171_BASE_DEPTH = { min: 500, max: 650 } as const;

/** Standard wall-unit depth range (mm). */
export const ISO7171_WALL_DEPTH = { min: 250, max: 400 } as const;

/** Toe-kick height range (mm). */
export const ISO7171_TOE_KICK = { min: 80, max: 180 } as const;

/** Minimum shelf-to-shelf clear gap for utility shelves (mm). */
export const ISO7171_MIN_SHELF_GAP = 150;

/** Maximum shelf count for tall cabinets (height > 1800 mm). */
export const ISO7171_MAX_SHELVES_TALL = 6;

/** Maximum shelf count for base cabinets. */
export const ISO7171_MAX_SHELVES_BASE = 4;

/** Minimum clear height per drawer (mm). */
export const ISO7171_DRAWER_HEIGHT = 160;

/** Maximum width:height ratio for freestanding stability. */
export const ISO7171_MAX_WIDTH_HEIGHT_RATIO = 2.5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isNearModuleWidth(width: number): boolean {
  return ISO7171_MODULE_WIDTHS.some((m) => Math.abs(width - m) <= ISO7171_MODULE_TOLERANCE);
}

function nearestModuleWidth(width: number): number {
  return ISO7171_MODULE_WIDTHS.reduce((best, m) => (Math.abs(m - width) < Math.abs(best - width) ? m : best));
}

// ─── Rule checkers ────────────────────────────────────────────────────────────

function checkModuleWidth(config: CabinetConfig): Iso7171Violation | null {
  if (isNearModuleWidth(config.width)) return null;
  const nearest = nearestModuleWidth(config.width);
  return {
    ruleId: 'module-width',
    level: 'advisory',
    message: `Width ${config.width.toString()} mm is not a standard ISO 7171 module width; nearest is ${nearest.toString()} mm`,
    actual: config.width,
    standard: ISO7171_MODULE_WIDTHS.join(', '),
  };
}

function checkBaseHeight(config: CabinetConfig): Iso7171Violation | null {
  // Base cabinet rule applies when height is in base range (≤ 1000 mm)
  if (config.height > 1000) return null;
  const { min, max } = ISO7171_BASE_HEIGHT;
  if (config.height >= min && config.height <= max) return null;
  return {
    ruleId: 'base-height',
    level: 'fail',
    message: `Base cabinet height ${config.height.toString()} mm outside ISO 7171 range ${min.toString()}–${max.toString()} mm`,
    actual: config.height,
    standard: `${min.toString()}–${max.toString()} mm`,
  };
}

function checkWallHeight(config: CabinetConfig): Iso7171Violation | null {
  // Wall unit rule: height ≤ 1000 mm and depth ≤ 400 mm (wall-hung profile)
  if (config.height > 1000 || config.depth > 400) return null;
  const { min, max } = ISO7171_WALL_HEIGHT;
  if (config.height >= min && config.height <= max) return null;
  return {
    ruleId: 'wall-height',
    level: 'advisory',
    message: `Wall unit height ${config.height.toString()} mm outside ISO 7171 range ${min.toString()}–${max.toString()} mm`,
    actual: config.height,
    standard: `${min.toString()}–${max.toString()} mm`,
  };
}

function checkBaseDepth(config: CabinetConfig): Iso7171Violation | null {
  if (config.height > 1000 || config.depth > 650) return null; // not a base cabinet
  const { min, max } = ISO7171_BASE_DEPTH;
  if (config.depth >= min && config.depth <= max) return null;
  return {
    ruleId: 'base-depth',
    level: 'advisory',
    message: `Base cabinet depth ${config.depth.toString()} mm outside ISO 7171 range ${min.toString()}–${max.toString()} mm`,
    actual: config.depth,
    standard: `${min.toString()}–${max.toString()} mm`,
  };
}

function checkWallDepth(config: CabinetConfig): Iso7171Violation | null {
  if (config.height > 1000 || config.depth > 400) return null; // not a wall unit
  const { min, max } = ISO7171_WALL_DEPTH;
  if (config.depth >= min && config.depth <= max) return null;
  return {
    ruleId: 'wall-depth',
    level: 'advisory',
    message: `Wall unit depth ${config.depth.toString()} mm outside ISO 7171 range ${min.toString()}–${max.toString()} mm`,
    actual: config.depth,
    standard: `${min.toString()}–${max.toString()} mm`,
  };
}

function checkToeKick(config: CabinetConfig): Iso7171Violation | null {
  const kick = config.kickHeight ?? 0;
  if (kick === 0) return null; // no toe kick — not applicable
  const { min, max } = ISO7171_TOE_KICK;
  if (kick >= min && kick <= max) return null;
  return {
    ruleId: 'toe-kick-height',
    level: 'fail',
    message: `Toe kick height ${kick.toString()} mm outside ISO 7171 range ${min.toString()}–${max.toString()} mm`,
    actual: kick,
    standard: `${min.toString()}–${max.toString()} mm`,
  };
}

function checkShelfSpacing(config: CabinetConfig): Iso7171Violation | null {
  if (config.shelfCount <= 0) return null;
  // Estimate available internal height
  const internalHeight = config.height - (config.kickHeight ?? 0);
  const avgGap = internalHeight / (config.shelfCount + 1);
  if (avgGap >= ISO7171_MIN_SHELF_GAP) return null;
  return {
    ruleId: 'shelf-spacing-min',
    level: 'fail',
    message: `Average shelf gap ${Math.round(avgGap).toString()} mm is below ISO 7171 minimum ${ISO7171_MIN_SHELF_GAP.toString()} mm`,
    actual: Math.round(avgGap),
    standard: `≥ ${ISO7171_MIN_SHELF_GAP.toString()} mm`,
  };
}

function checkShelfCountTall(config: CabinetConfig): Iso7171Violation | null {
  if (config.height <= 1800) return null;
  if (config.shelfCount <= ISO7171_MAX_SHELVES_TALL) return null;
  return {
    ruleId: 'shelf-count-tall',
    level: 'advisory',
    message: `${config.shelfCount.toString()} shelves in a tall cabinet (> 1800 mm) exceeds ISO 7171 recommendation of ${ISO7171_MAX_SHELVES_TALL.toString()}`,
    actual: config.shelfCount,
    standard: `≤ ${ISO7171_MAX_SHELVES_TALL.toString()}`,
  };
}

function checkShelfCountBase(config: CabinetConfig): Iso7171Violation | null {
  if (config.height > 1000) return null; // tall/wall, not base
  if (config.shelfCount <= ISO7171_MAX_SHELVES_BASE) return null;
  return {
    ruleId: 'shelf-count-base',
    level: 'advisory',
    message: `${config.shelfCount.toString()} shelves in a base cabinet exceeds ISO 7171 recommendation of ${ISO7171_MAX_SHELVES_BASE.toString()}`,
    actual: config.shelfCount,
    standard: `≤ ${ISO7171_MAX_SHELVES_BASE.toString()}`,
  };
}

function checkDrawerClearance(config: CabinetConfig): Iso7171Violation | null {
  if (config.drawerCount <= 0) return null;
  const requiredHeight = config.drawerCount * ISO7171_DRAWER_HEIGHT;
  if (config.height >= requiredHeight) return null;
  return {
    ruleId: 'drawer-clearance',
    level: 'fail',
    message: `${config.drawerCount.toString()} drawers require ≥ ${requiredHeight.toString()} mm height; cabinet is only ${config.height.toString()} mm`,
    actual: config.height,
    standard: `≥ ${requiredHeight.toString()} mm`,
  };
}

function checkWidthHeightRatio(config: CabinetConfig): Iso7171Violation | null {
  const ratio = config.width / config.height;
  if (ratio <= ISO7171_MAX_WIDTH_HEIGHT_RATIO) return null;
  return {
    ruleId: 'width-height-ratio',
    level: 'advisory',
    message: `Width/height ratio ${ratio.toFixed(2)} exceeds ISO 7171 stability recommendation of ${ISO7171_MAX_WIDTH_HEIGHT_RATIO.toString()}`,
    actual: Math.round(ratio * 100) / 100,
    standard: `≤ ${ISO7171_MAX_WIDTH_HEIGHT_RATIO.toString()}`,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run all ISO 7171 compliance checks against a cabinet configuration.
 *
 * Returns the full report including a `compliant` flag, violation list,
 * and aggregate counts.
 */
export function validateIso7171(config: CabinetConfig): Iso7171Report {
  const checkers = [
    checkModuleWidth,
    checkBaseHeight,
    checkWallHeight,
    checkBaseDepth,
    checkWallDepth,
    checkToeKick,
    checkShelfSpacing,
    checkShelfCountTall,
    checkShelfCountBase,
    checkDrawerClearance,
    checkWidthHeightRatio,
  ];

  const violations: Iso7171Violation[] = checkers
    .map((fn) => fn(config))
    .filter((v): v is Iso7171Violation => v !== null);

  const failCount = violations.filter((v) => v.level === 'fail').length;
  const advisoryCount = violations.filter((v) => v.level === 'advisory').length;
  const compliant = failCount === 0;

  const summary = compliant
    ? advisoryCount === 0
      ? 'Fully ISO 7171 compliant'
      : `ISO 7171 compliant with ${advisoryCount.toString()} advisory note${advisoryCount === 1 ? '' : 's'}`
    : `${failCount.toString()} ISO 7171 failure${failCount === 1 ? '' : 's'}; ${advisoryCount.toString()} advisory note${advisoryCount === 1 ? '' : 's'}`;

  return { compliant, failCount, advisoryCount, violations, summary };
}

/**
 * Format an ISO 7171 report as a multi-line text string suitable for
 * display in a UI panel or for inclusion in a PDF report.
 */
export function formatIso7171Report(report: Iso7171Report): string {
  const lines: string[] = [`ISO 7171 Compliance Report`, `Status: ${report.summary}`];

  if (report.violations.length === 0) {
    lines.push('No violations found.');
    return lines.join('\n');
  }

  lines.push('');
  for (const v of report.violations) {
    const badge = v.level === 'fail' ? '[FAIL]' : v.level === 'advisory' ? '[ADVISORY]' : '[PASS]';
    lines.push(`${badge} ${v.ruleId}: ${v.message}`);
    if (v.standard !== undefined) {
      lines.push(`         Standard: ${v.standard}`);
    }
  }

  return lines.join('\n');
}

/**
 * Return only the violations matching the given compliance level.
 */
export function filterViolations(report: Iso7171Report, level: Iso7171ComplianceLevel): Iso7171Violation[] {
  return report.violations.filter((v) => v.level === level);
}
