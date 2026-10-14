/**
 * Sprint 44 — Cut kerf compensation engine.
 *
 * Adjusts raw part dimensions to account for saw-blade kerf loss so that
 * finished parts match the design dimensions even after cutting.
 *
 * Kerf compensation is applied to the net sheet area calculation:
 *   - Each cut removes `kerfMm` from the usable material.
 *   - Compensation is added to the part dimension so the part is cut slightly
 *     oversized and then trimmed, OR the cut plan packs correctly by
 *     including kerf as spacing between parts.
 *
 * This module provides:
 *   1. `compensateDimension` — add kerf to a single dimension.
 *   2. `compensatePart`      — expand both width and length of a part.
 *   3. `estimateKerfLoss`    — total kerf loss for a given sheet layout.
 *   4. `kerfLossPercent`     — kerf loss as a percentage of sheet area.
 *
 * Typical kerf values:
 *   - Panel saw (scoring blade): 3.2 mm
 *   - Circular saw: 2.4–3.2 mm
 *   - Router/CNC: 6 mm (3mm bit diameter, 2 passes)
 *   - Band saw: 1.6 mm
 *   - Laser cutter: 0.2 mm
 *
 * Pure function — no React, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KerfProfile {
  id: string;
  name: { en: string; he: string };
  kerfMm: number;
}

export interface KerfPart {
  id: string;
  widthMm: number;
  lengthMm: number;
  quantity: number;
}

export interface KerfCompensatedPart extends KerfPart {
  compensatedWidthMm: number;
  compensatedLengthMm: number;
  /** mm added to width. */
  widthAddedMm: number;
  /** mm added to length. */
  lengthAddedMm: number;
}

// ─── Kerf catalogue ───────────────────────────────────────────────────────────

/** Built-in saw-kerf profiles keyed by tool/process identifier. */
export const KERF_PROFILES: Record<string, KerfProfile> = {
  'panel-saw': {
    id: 'panel-saw',
    name: { en: 'Panel saw (scoring blade)', he: 'מסור לוחות (להב ניקוב)' },
    kerfMm: 3.2,
  },
  'circular-saw': {
    id: 'circular-saw',
    name: { en: 'Circular saw', he: 'מסור עגול' },
    kerfMm: 2.8,
  },
  'cnc-router': {
    id: 'cnc-router',
    name: { en: 'CNC router (Ø6mm bit)', he: 'ראוטר CNC (ביט 6 מ"מ)' },
    kerfMm: 6.0,
  },
  'band-saw': {
    id: 'band-saw',
    name: { en: 'Band saw', he: 'מסור להב' },
    kerfMm: 1.6,
  },
  laser: {
    id: 'laser',
    name: { en: 'Laser cutter', he: 'לייזר' },
    kerfMm: 0.2,
  },
};

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Add kerf compensation to a single dimension.
 * Returns the compensated value rounded to 0.5 mm.
 */
export function compensateDimension(dimensionMm: number, kerfMm: number): number {
  return Math.ceil((dimensionMm + kerfMm) * 2) / 2;
}

/**
 * Expand both dimensions of a part by the kerf amount.
 * Returns a new `KerfCompensatedPart` without mutating the input.
 */
export function compensatePart(part: KerfPart, kerfMm: number): KerfCompensatedPart {
  const compensatedWidthMm = compensateDimension(part.widthMm, kerfMm);
  const compensatedLengthMm = compensateDimension(part.lengthMm, kerfMm);
  return {
    ...part,
    compensatedWidthMm,
    compensatedLengthMm,
    widthAddedMm: compensatedWidthMm - part.widthMm,
    lengthAddedMm: compensatedLengthMm - part.lengthMm,
  };
}

/**
 * Estimate total kerf material loss in mm² for a set of parts on a sheet.
 *
 * Approximation: each part requires (widthMm + lengthMm) / 2 mm of kerf
 * strip for a single cut pass.  Multiply by number of cuts (approximately
 * widthCuts + lengthCuts based on part count).
 *
 * For a more precise calculation the caller should use the actual cut plan.
 */
export function estimateKerfLoss(parts: KerfPart[], kerfMm: number): number {
  // Count total cut lines: assume strip-cutting — one length cut per part
  // plus one width cross-cut per part.
  const totalCutLineLengthMm = parts.reduce((s, p) => s + (p.widthMm + p.lengthMm) * p.quantity, 0);
  return Math.round(totalCutLineLengthMm * kerfMm);
}

/**
 * Kerf loss as a percentage of total sheet area.
 *
 * @param kerfLossMm2   Result of `estimateKerfLoss`.
 * @param sheetAreaMm2  Total area of all sheets used.
 */
export function kerfLossPercent(kerfLossMm2: number, sheetAreaMm2: number): number {
  if (sheetAreaMm2 === 0) return 0;
  return Math.round((kerfLossMm2 / sheetAreaMm2) * 1000) / 10;
}

/** Return a kerf profile by id. */
export function getKerfProfile(id: string): KerfProfile | undefined {
  return KERF_PROFILES[id];
}
