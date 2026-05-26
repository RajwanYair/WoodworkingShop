/**
 * webxr-placement.ts
 *
 * Pure-TypeScript AR placement utilities for the WebXR AR flow.
 * No DOM APIs, no React imports, no side effects.
 * The actual WebXR session lifecycle lives in src/hooks/useWebXR.ts.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Axis-aligned bounding box in world space (metres). */
export interface AabbMetres {
  /** Minimum X (left wall direction). */
  minX: number;
  /** Maximum X. */
  maxX: number;
  /** Minimum Z (depth / into-room direction). */
  minZ: number;
  /** Maximum Z. */
  maxZ: number;
}

/** A detected or inferred room surface. */
export interface RoomSurface {
  /** Unique identifier supplied by the XR hit-test subsystem. */
  id: string;
  /** Surface normal direction (unit vector). */
  normal: 'floor' | 'wall' | 'ceiling';
  /** AABB of the surface in world space (metres). */
  bounds: AabbMetres;
}

/** Physical footprint of a cabinet (mm → converted to metres for placement). */
export interface CabinetFootprint {
  /** Cabinet width in millimetres. */
  widthMm: number;
  /** Cabinet depth in millimetres. */
  depthMm: number;
}

/** Candidate placement position in world space (metres). */
export interface PlacementCandidate {
  /** X position of the cabinet's left-front corner (metres). */
  x: number;
  /** Z position of the cabinet's left-front corner (metres). */
  z: number;
  /** True when this position is clear of all supplied obstacles. */
  valid: boolean;
  /** Human-readable reason when `valid` is false. */
  reason?: string;
}

/** Result returned by {@link computeArPlacements}. */
export interface ArPlacementResult {
  /** All evaluated candidate positions. */
  candidates: PlacementCandidate[];
  /** Best valid candidate, or `null` if none found. */
  best: PlacementCandidate | null;
}

/** Obstacle AABB used in collision detection (metres). */
export interface PlacementObstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Millimetres to metres conversion factor. */
const MM_TO_M = 0.001;

/** Minimum grid step when enumerating candidate positions (metres). */
const GRID_STEP_M = 0.1;

/** Safety margin to keep away from walls (metres). */
const WALL_MARGIN_M = 0.05;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether two axis-aligned rectangles overlap (inclusive edges).
 *
 * @param a - First rectangle.
 * @param b - Second rectangle.
 * @returns `true` if they overlap.
 */
function rectsOverlap(a: AabbMetres, b: AabbMetres): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
}

/**
 * Convert cabinet footprint dimensions from mm to a world-space AABB
 * given an origin position.
 *
 * @param x - Left-front corner X (metres).
 * @param z - Left-front corner Z (metres).
 * @param footprint - Cabinet footprint dimensions in mm.
 * @returns AABB in metres.
 */
function cabinetAabb(x: number, z: number, footprint: CabinetFootprint): AabbMetres {
  const w = footprint.widthMm * MM_TO_M;
  const d = footprint.depthMm * MM_TO_M;
  return { minX: x, maxX: x + w, minZ: z, maxZ: z + d };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enumerate grid-aligned AR placement candidates on a floor surface.
 * Positions are spaced 0.1 m apart and pruned to those
 * that fit within the surface bounds (less a 0.05 m wall margin).
 *
 * @param surface - Floor surface on which to place the cabinet.
 * @param footprint - Cabinet footprint dimensions in mm.
 * @param obstacles - Known obstacles (other furniture, walls) in metres.
 * @returns All evaluated candidates and the best (first valid) candidate.
 * @throws {RangeError} When `footprint.widthMm` or `footprint.depthMm` ≤ 0.
 */
export function computeArPlacements(
  surface: RoomSurface,
  footprint: CabinetFootprint,
  obstacles: PlacementObstacle[] = [],
): ArPlacementResult {
  if (footprint.widthMm <= 0) {
    throw new RangeError(`computeArPlacements: widthMm must be > 0, got ${footprint.widthMm}`);
  }
  if (footprint.depthMm <= 0) {
    throw new RangeError(`computeArPlacements: depthMm must be > 0, got ${footprint.depthMm}`);
  }

  const widthM = footprint.widthMm * MM_TO_M;
  const depthM = footprint.depthMm * MM_TO_M;
  const m = WALL_MARGIN_M;
  const bounds = surface.bounds;

  // Usable region: shrink by margin and cabinet footprint
  const xStart = bounds.minX + m;
  const xEnd = bounds.maxX - m - widthM;
  const zStart = bounds.minZ + m;
  const zEnd = bounds.maxZ - m - depthM;

  const candidates: PlacementCandidate[] = [];
  let best: PlacementCandidate | null = null;

  if (xEnd < xStart || zEnd < zStart) {
    // Cabinet does not fit on this surface
    return { candidates, best };
  }

  for (let x = xStart; x <= xEnd + 1e-9; x = Math.round((x + GRID_STEP_M) * 1000) / 1000) {
    for (let z = zStart; z <= zEnd + 1e-9; z = Math.round((z + GRID_STEP_M) * 1000) / 1000) {
      const aabb = cabinetAabb(x, z, footprint);
      const collision = obstacles.find((obs) => rectsOverlap(aabb, obs));

      const candidate: PlacementCandidate = collision
        ? { x, z, valid: false, reason: 'Overlaps obstacle' }
        : { x, z, valid: true };

      candidates.push(candidate);
      if (candidate.valid && best === null) best = candidate;
    }
  }

  return { candidates, best };
}

/**
 * Validate a single explicit placement position.
 *
 * @param x - Proposed X position (metres).
 * @param z - Proposed Z position (metres).
 * @param surface - Floor surface for boundary check.
 * @param footprint - Cabinet footprint dimensions in mm.
 * @param obstacles - Known obstacles in metres.
 * @returns A {@link PlacementCandidate} describing validity.
 * @throws {RangeError} When `footprint.widthMm` or `footprint.depthMm` ≤ 0.
 */
export function validatePlacement(
  x: number,
  z: number,
  surface: RoomSurface,
  footprint: CabinetFootprint,
  obstacles: PlacementObstacle[] = [],
): PlacementCandidate {
  if (footprint.widthMm <= 0) {
    throw new RangeError(`validatePlacement: widthMm must be > 0, got ${footprint.widthMm}`);
  }
  if (footprint.depthMm <= 0) {
    throw new RangeError(`validatePlacement: depthMm must be > 0, got ${footprint.depthMm}`);
  }

  const aabb = cabinetAabb(x, z, footprint);
  const b = surface.bounds;
  const m = WALL_MARGIN_M;

  if (aabb.minX < b.minX + m || aabb.maxX > b.maxX - m) {
    return { x, z, valid: false, reason: 'Cabinet exceeds surface X bounds' };
  }
  if (aabb.minZ < b.minZ + m || aabb.maxZ > b.maxZ - m) {
    return { x, z, valid: false, reason: 'Cabinet exceeds surface Z bounds' };
  }

  const collision = obstacles.find((obs) => rectsOverlap(aabb, obs));
  if (collision) {
    return { x, z, valid: false, reason: 'Overlaps obstacle' };
  }

  return { x, z, valid: true };
}

/**
 * Clamp an AR hit-test world position to the nearest valid snap point
 * on the given surface grid.
 *
 * @param rawX - Raw hit-test X (metres).
 * @param rawZ - Raw hit-test Z (metres).
 * @param surface - The floor surface.
 * @returns Snapped `{ x, z }` position aligned to the 0.1 m placement grid.
 */
export function snapToGrid(rawX: number, rawZ: number, surface: RoomSurface): { x: number; z: number } {
  const step = GRID_STEP_M;
  const snappedX = Math.round(rawX / step) * step;
  const snappedZ = Math.round(rawZ / step) * step;

  const clampedX = Math.max(surface.bounds.minX, Math.min(snappedX, surface.bounds.maxX));
  const clampedZ = Math.max(surface.bounds.minZ, Math.min(snappedZ, surface.bounds.maxZ));

  return { x: clampedX, z: clampedZ };
}
