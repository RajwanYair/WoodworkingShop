/**
 * Sprint 26 — Hinge bore specification engine.
 *
 * Calculates precise Euro cup-hinge bore positions per Blum/Hettich/Grass
 * specifications.  Pure function — no React, no side effects.
 *
 * Coordinate system:
 *   (0, 0) = top-left corner of the door front face (viewed from front)
 *   x → across door width (mm from left edge)
 *   y ↓ down door height  (mm from top edge)
 *
 * Cup bore: 35 mm diameter × depth per profile (default 13 mm).
 * Mounting plate bore: two 3 mm × 12 mm deep cross holes at (32 mm offset
 * from cup centre x, ±16 mm from cup centre y) — standard 32 mm system.
 */

import { asMm } from './types';
import type { Mm, Result } from './types';
import { ok, err } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Position of a single hinge bore on the door face. */
export interface HingeBorePosition {
  /** Bore centre x from the door's hinge-side edge (mm). */
  x: Mm;
  /** Bore centre y from the door top edge (mm). */
  y: Mm;
  /** Cup bore diameter (mm — standard 35). */
  diameter: Mm;
  /** Cup bore depth (mm). */
  depth: Mm;
  /** Mounting plate hole 1 centre relative to cup centre: {dx, dy} (mm). */
  mountHole1: { dx: Mm; dy: Mm; diameter: Mm; depth: Mm };
  /** Mounting plate hole 2 centre relative to cup centre: {dx, dy} (mm). */
  mountHole2: { dx: Mm; dy: Mm; diameter: Mm; depth: Mm };
}

/** Complete hinge bore specification for a door. */
export interface HingeBoreSpec {
  /** Number of hinges placed on this door. */
  count: number;
  /** Bore positions ordered top to bottom. */
  positions: HingeBorePosition[];
  /** Minimum required material thickness for cup bore (mm). */
  minMaterialThickness: Mm;
  /** Whether the current material is thick enough. */
  materialOk: boolean;
  /** Applied top offset from door edge to top hinge bore centre (mm). */
  topOffset: Mm;
  /** Applied bottom offset from door bottom edge to bottom hinge bore centre (mm). */
  bottomOffset: Mm;
  /** Source profile id used for specs (or 'default' for fallback). */
  profileId: string;
}

/** Reason for a bore spec failure. */
export type HingeBoreError =
  | { code: 'DOOR_TOO_SMALL'; message: string }
  | { code: 'INVALID_MATERIAL'; message: string };

// ─── Constants ────────────────────────────────────────────────────────────────

/** Standard 35 mm Euro cup bore diameter. */
const CUP_DIAMETER_MM = 35;

/** Mounting plate cross-drill offset along x-axis from cup centre (32 mm system). */
const MOUNT_OFFSET_X_MM = 32;
/** Half-spacing between the two mounting plate holes (y-axis). */
const MOUNT_HALF_Y_MM = 16;
/** Mounting plate cross-drill hole diameter. */
const MOUNT_HOLE_DIAMETER_MM = 3;
/** Mounting plate cross-drill hole depth. */
const MOUNT_HOLE_DEPTH_MM = 12;
/** Minimum door height to support even 2 hinges. */
const MIN_DOOR_HEIGHT_MM = 200;

/**
 * Per-profile specs. Values sourced from Blum 2024 hardware catalogue.
 * Key = hinge profile id (matches `VendorHingeProfile.id`).
 */
const PROFILE_SPECS: Record<
  string,
  {
    cupDiameter: number;
    cupDepth: number;
    edgeToCenter: number; // cup centre x from hinge edge (mm)
    topOffsetMm: number; // min top-edge offset for first hinge (mm)
    bottomOffsetMm: number; // min bottom-edge offset for last hinge (mm)
    minEdgeMm: number; // min material thickness for cup bore
  }
> = {
  'blum-clip-top-blumotion': {
    cupDiameter: 35,
    cupDepth: 13,
    edgeToCenter: 22.5,
    topOffsetMm: 100,
    bottomOffsetMm: 100,
    minEdgeMm: 16,
  },
  'blum-clip-top-110': {
    cupDiameter: 35,
    cupDepth: 13,
    edgeToCenter: 22.5,
    topOffsetMm: 100,
    bottomOffsetMm: 100,
    minEdgeMm: 16,
  },
  'hettich-sensys-8645': {
    cupDiameter: 35,
    cupDepth: 12,
    edgeToCenter: 22.5,
    topOffsetMm: 100,
    bottomOffsetMm: 100,
    minEdgeMm: 16,
  },
  'grass-tiomos-110': {
    cupDiameter: 35,
    cupDepth: 14,
    edgeToCenter: 22,
    topOffsetMm: 100,
    bottomOffsetMm: 100,
    minEdgeMm: 16,
  },
  'grass-tiomos-soft-close': {
    cupDiameter: 35,
    cupDepth: 14,
    edgeToCenter: 22,
    topOffsetMm: 100,
    bottomOffsetMm: 100,
    minEdgeMm: 16,
  },
};

/** Default spec (generic 35 mm Euro hinge). */
const DEFAULT_SPEC = {
  cupDiameter: CUP_DIAMETER_MM,
  cupDepth: 13,
  edgeToCenter: 22.5,
  topOffsetMm: 100,
  bottomOffsetMm: 100,
  minEdgeMm: 16,
};

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Determine the number of hinges required for a door of the given height.
 * Follows the same count rules as `computeHingesPerDoor` in dimensions.ts but
 * is kept here as a standalone utility so this module has no circular deps.
 */
export function hingeCount(doorHeightMm: number): number {
  if (doorHeightMm <= 600) return 2;
  if (doorHeightMm <= 1200) return 3;
  if (doorHeightMm <= 1800) return 4;
  if (doorHeightMm <= 2200) return 5;
  return 6;
}

/**
 * Calculate the complete hinge bore specification for a door.
 *
 * @param doorHeight   External door height (mm).
 * @param doorWidth    External door width (mm) — used only for validation.
 * @param materialThicknessMm  Material thickness of the door panel (mm).
 * @param profileId    Optional vendor hinge profile id.  Falls back to generic spec.
 * @returns            `Result<HingeBoreSpec, HingeBoreError>`
 */
export function calculateHingeBoreSpec(
  doorHeight: number,
  doorWidth: number,
  materialThicknessMm: number,
  profileId?: string,
): Result<HingeBoreSpec, HingeBoreError> {
  if (doorHeight < MIN_DOOR_HEIGHT_MM) {
    return err({
      code: 'DOOR_TOO_SMALL',
      message: `Door height ${doorHeight} mm is below minimum ${MIN_DOOR_HEIGHT_MM} mm for hinge placement.`,
    });
  }
  if (doorWidth < 50) {
    return err({
      code: 'DOOR_TOO_SMALL',
      message: `Door width ${doorWidth} mm is below minimum 50 mm for hinge placement.`,
    });
  }

  const specKey = profileId && profileId in PROFILE_SPECS ? profileId : null;
  const spec = specKey ? PROFILE_SPECS[specKey] : DEFAULT_SPEC;
  const resolvedProfileId = specKey ?? 'default';

  const count = hingeCount(doorHeight);
  const topOffset = Math.min(spec.topOffsetMm, Math.floor(doorHeight / (2 * (count + 1))));
  const bottomOffset = Math.min(spec.bottomOffsetMm, Math.floor(doorHeight / (2 * (count + 1))));
  const span = doorHeight - topOffset - bottomOffset;

  const positions: HingeBorePosition[] = [];
  for (let i = 0; i < count; i++) {
    const yFromTop =
      i === 0
        ? topOffset
        : i === count - 1
          ? doorHeight - bottomOffset
          : Math.round(topOffset + (span * i) / (count - 1));
    const mountDx = asMm(MOUNT_OFFSET_X_MM);
    const mountHalfY = asMm(MOUNT_HALF_Y_MM);
    const mountDiam = asMm(MOUNT_HOLE_DIAMETER_MM);
    const mountDepth = asMm(MOUNT_HOLE_DEPTH_MM);
    positions.push({
      x: asMm(Math.round(spec.edgeToCenter * 10) / 10),
      y: asMm(yFromTop),
      diameter: asMm(spec.cupDiameter),
      depth: asMm(spec.cupDepth),
      mountHole1: { dx: mountDx, dy: mountHalfY, diameter: mountDiam, depth: mountDepth },
      mountHole2: { dx: mountDx, dy: asMm(-MOUNT_HALF_Y_MM), diameter: mountDiam, depth: mountDepth },
    });
  }

  return ok({
    count,
    positions,
    minMaterialThickness: asMm(spec.minEdgeMm),
    materialOk: materialThicknessMm >= spec.minEdgeMm,
    topOffset: asMm(topOffset),
    bottomOffset: asMm(bottomOffset),
    profileId: resolvedProfileId,
  });
}

/**
 * Format a hinge bore spec as a human-readable summary string.
 * Useful for tooltips and validation messages.
 */
export function formatHingeBoreSpecSummary(spec: HingeBoreSpec): string {
  const positions = spec.positions.map((p, i) => `H${i + 1}: y=${p.y} mm`).join(', ');
  return `${spec.count} hinges — ${positions} (x=${spec.positions[0]?.x ?? '?'} mm from edge, ∅${spec.positions[0]?.diameter ?? '?'} mm cup)`;
}
