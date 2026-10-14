/**
 * Sprint 45 — Cabinet zone validator engine.
 *
 * Validates that one or more cabinets fit within defined spatial zones
 * (e.g. a room wall segment or a fixed alcove).  Checks:
 *   1. Width — cabinet width ≤ zone width with optional clearance.
 *   2. Height — cabinet height ≤ zone height with optional clearance.
 *   3. Depth — cabinet depth ≤ zone depth with optional clearance.
 *   4. Horizontal fill — sum of cabinet widths ≤ zone width.
 *
 * Pure function — no React, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoomZone {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
}

export interface CabinetDimensions {
  id: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
}

export type ZoneViolationCode = 'TOO_WIDE' | 'TOO_TALL' | 'TOO_DEEP' | 'TOTAL_WIDTH_OVERFLOW';

export interface ZoneViolation {
  code: ZoneViolationCode;
  cabinetId: string | null;
  message: string;
  /** How much the cabinet exceeds the limit (mm). */
  excessMm: number;
}

export interface ZoneValidationResult {
  valid: boolean;
  violations: ZoneViolation[];
}

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Validate a single cabinet against a zone.
 *
 * @param cabinet     Cabinet dimensions to validate.
 * @param zone        Zone / room segment.
 * @param clearanceMm Minimum air gap required on each face (default 0 mm).
 */
export function validateCabinetInZone(
  cabinet: CabinetDimensions,
  zone: RoomZone,
  clearanceMm = 0,
): ZoneValidationResult {
  const violations: ZoneViolation[] = [];

  const maxW = zone.widthMm - clearanceMm;
  const maxH = zone.heightMm - clearanceMm;
  const maxD = zone.depthMm - clearanceMm;

  if (cabinet.widthMm > maxW) {
    violations.push({
      code: 'TOO_WIDE',
      cabinetId: cabinet.id,
      message: `Cabinet "${cabinet.id}" width ${cabinet.widthMm} mm exceeds zone limit ${maxW} mm.`,
      excessMm: cabinet.widthMm - maxW,
    });
  }

  if (cabinet.heightMm > maxH) {
    violations.push({
      code: 'TOO_TALL',
      cabinetId: cabinet.id,
      message: `Cabinet "${cabinet.id}" height ${cabinet.heightMm} mm exceeds zone limit ${maxH} mm.`,
      excessMm: cabinet.heightMm - maxH,
    });
  }

  if (cabinet.depthMm > maxD) {
    violations.push({
      code: 'TOO_DEEP',
      cabinetId: cabinet.id,
      message: `Cabinet "${cabinet.id}" depth ${cabinet.depthMm} mm exceeds zone limit ${maxD} mm.`,
      excessMm: cabinet.depthMm - maxD,
    });
  }

  return { valid: violations.length === 0, violations };
}

/**
 * Validate a row of cabinets against a zone.
 *
 * Checks individual dimensions for each cabinet, then checks that the
 * combined width of all cabinets fits within the zone.
 *
 * @param cabinets    Ordered list of cabinets to place side-by-side.
 * @param zone        Zone / room segment.
 * @param clearanceMm Minimum air gap required on zone sides (default 0 mm).
 */
export function validateCabinetRowInZone(
  cabinets: CabinetDimensions[],
  zone: RoomZone,
  clearanceMm = 0,
): ZoneValidationResult {
  const violations: ZoneViolation[] = [];

  for (const cabinet of cabinets) {
    const result = validateCabinetInZone(cabinet, zone, clearanceMm);
    violations.push(...result.violations);
  }

  const totalWidth = cabinets.reduce((s, c) => s + c.widthMm, 0);
  const maxW = zone.widthMm - clearanceMm;

  if (totalWidth > maxW) {
    violations.push({
      code: 'TOTAL_WIDTH_OVERFLOW',
      cabinetId: null,
      message: `Total cabinet row width ${totalWidth} mm exceeds zone limit ${maxW} mm.`,
      excessMm: totalWidth - maxW,
    });
  }

  return { valid: violations.length === 0, violations };
}

/**
 * Convenience: collect only distinct violation codes from a result.
 */
export function violationCodes(result: ZoneValidationResult): ZoneViolationCode[] {
  return [...new Set(result.violations.map((v) => v.code))];
}
