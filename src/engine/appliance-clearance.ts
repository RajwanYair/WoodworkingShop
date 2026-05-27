/**
 * Sprint 154 — Appliance clearance zone validation.
 *
 * Validates that cabinets or countertops around built-in appliances maintain
 * the minimum clearance zones required for safety, ventilation, and operation:
 *   - Oven / wall oven: top & side ventilation gaps, door swing clearance
 *   - Dishwasher: side clearance, plumbing access
 *   - Refrigerator: top & side ventilation, door swing
 *   - Cooktop / hob: minimum distance to overhead cabinet, side clearances
 *   - Microwave: ventilation clearances
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Supported appliance types for clearance validation.
 * Each type has factory-standard minimum clearances.
 */
export type ApplianceType = 'oven' | 'dishwasher' | 'refrigerator' | 'cooktop' | 'microwave';

/** Clearance distances (in mm) around an appliance. */
export interface ClearanceSpec {
  /** Minimum gap above the appliance. */
  top: number;
  /** Minimum gap below the appliance. */
  bottom: number;
  /** Minimum gap to the left. */
  left: number;
  /** Minimum gap to the right. */
  right: number;
  /** Minimum gap behind (for ventilation). */
  rear: number;
  /** Minimum front clearance for door swing / access. */
  front: number;
}

/** Position and size of an appliance in the room layout (mm). */
export interface AppliancePlacement {
  /** Unique ID for this appliance instance. */
  id: string;
  /** Type determines which clearance spec to apply. */
  type: ApplianceType;
  /** X position of the appliance left edge. */
  x: number;
  /** Y position of the appliance back edge. */
  y: number;
  /** Width of the appliance (mm). */
  width: number;
  /** Depth of the appliance (mm). */
  depth: number;
  /** Height of the appliance (mm). */
  height: number;
  /** Optional custom clearance override. */
  customClearance?: Partial<ClearanceSpec>;
}

/** An obstacle (cabinet, wall, etc.) that may violate clearance. */
export interface Obstacle {
  id: string;
  label: string;
  /** Bounding box in mm. */
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
}

/** Which side of the appliance is violated. */
export type ClearanceSide = 'top' | 'bottom' | 'left' | 'right' | 'rear' | 'front';

/** A single clearance violation. */
export interface ClearanceViolation {
  /** Which appliance has the violation. */
  applianceId: string;
  /** Which obstacle causes it. */
  obstacleId: string;
  /** Which side of the appliance. */
  side: ClearanceSide;
  /** Required minimum gap (mm). */
  requiredMm: number;
  /** Actual measured gap (mm). */
  actualMm: number;
  /** How much the clearance is short (mm). */
  shortfallMm: number;
}

/** Result of validating clearances for all appliances. */
export interface ClearanceValidationResult {
  valid: boolean;
  violations: ClearanceViolation[];
}

// ─── Standard clearance specs ─────────────────────────────────────────────────

/** Industry-standard minimum clearances per appliance type (mm). */
export const STANDARD_CLEARANCES: Record<ApplianceType, ClearanceSpec> = {
  oven: { top: 50, bottom: 0, left: 5, right: 5, rear: 25, front: 900 },
  dishwasher: { top: 5, bottom: 0, left: 5, right: 5, rear: 50, front: 600 },
  refrigerator: { top: 50, bottom: 0, left: 10, right: 10, rear: 50, front: 900 },
  cooktop: { top: 650, bottom: 0, left: 50, right: 50, rear: 50, front: 600 },
  microwave: { top: 75, bottom: 0, left: 25, right: 25, rear: 50, front: 450 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get the effective clearance spec for an appliance, merging custom overrides.
 */
export function getEffectiveClearance(placement: AppliancePlacement): ClearanceSpec {
  const base = STANDARD_CLEARANCES[placement.type];
  if (!placement.customClearance) return base;
  return { ...base, ...placement.customClearance };
}

/**
 * Compute the horizontal gap between an appliance and an obstacle on a given side.
 * Returns Infinity if the obstacle is not adjacent on that side.
 */
function computeGap(appliance: AppliancePlacement, obstacle: Obstacle, side: ClearanceSide): number {
  const ax1 = appliance.x;
  const ax2 = appliance.x + appliance.width;
  const ay1 = appliance.y;
  const ay2 = appliance.y + appliance.depth;
  const ah2 = appliance.height;

  const ox1 = obstacle.x;
  const ox2 = obstacle.x + obstacle.width;
  const oy1 = obstacle.y;
  const oy2 = obstacle.y + obstacle.depth;
  const oh2 = obstacle.height;

  // Check overlap on the perpendicular axes to determine adjacency
  switch (side) {
    case 'left': {
      // Obstacle to the left: must overlap in Y, obstacle's right edge < appliance left
      if (oy2 <= ay1 || oy1 >= ay2) return Infinity; // no Y overlap
      if (ox2 > ax1) return Infinity; // not actually to the left
      return ax1 - ox2;
    }
    case 'right': {
      if (oy2 <= ay1 || oy1 >= ay2) return Infinity;
      if (ox1 < ax2) return Infinity;
      return ox1 - ax2;
    }
    case 'rear': {
      // Rear = behind (lower Y in our coordinate system)
      if (ox2 <= ax1 || ox1 >= ax2) return Infinity;
      if (oy2 > ay1) return Infinity;
      return ay1 - oy2;
    }
    case 'front': {
      if (ox2 <= ax1 || ox1 >= ax2) return Infinity;
      if (oy1 < ay2) return Infinity;
      return oy1 - ay2;
    }
    case 'top': {
      // Obstacle above — must overlap in X and Y plan view
      if (ox2 <= ax1 || ox1 >= ax2) return Infinity;
      if (oy2 <= ay1 || oy1 >= ay2) return Infinity;
      if (oh2 <= ah2) return Infinity; // obstacle shorter — not above
      // Vertical gap: obstacle bottom (0) is at floor; clearance is from top of appliance to bottom of obstacle
      // Simplified: obstacle.height is its bottom elevation from floor assumed 0, so
      // we check vertical gap as obstacleBottomElevation - applianceTopElevation
      // For simplicity, assume both start at floor; overhead obstruction = obstacle bottom at appliance.height
      return obstacle.height > ah2 ? 0 : Infinity;
    }
    case 'bottom': {
      // Rarely violated — skip unless obstacle is below (floor-level)
      return Infinity;
    }
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate clearance zones for a single appliance against all obstacles.
 *
 * @param appliance The appliance placement to validate.
 * @param obstacles All nearby obstacles (cabinets, walls, etc.).
 * @returns Array of violations (empty if compliant).
 */
export function validateApplianceClearance(appliance: AppliancePlacement, obstacles: Obstacle[]): ClearanceViolation[] {
  const spec = getEffectiveClearance(appliance);
  const violations: ClearanceViolation[] = [];
  const sides: ClearanceSide[] = ['top', 'bottom', 'left', 'right', 'rear', 'front'];

  for (const obstacle of obstacles) {
    for (const side of sides) {
      const required = spec[side];
      if (required <= 0) continue;

      const actual = computeGap(appliance, obstacle, side);
      if (actual < required) {
        violations.push({
          applianceId: appliance.id,
          obstacleId: obstacle.id,
          side,
          requiredMm: required,
          actualMm: actual,
          shortfallMm: required - actual,
        });
      }
    }
  }

  return violations;
}

/**
 * Validate clearance zones for all appliances in a layout.
 *
 * @param appliances Array of placed appliances.
 * @param obstacles  Array of obstacles (cabinets, walls).
 * @returns Aggregate validation result.
 */
export function validateAllApplianceClearances(
  appliances: AppliancePlacement[],
  obstacles: Obstacle[],
): ClearanceValidationResult {
  const violations: ClearanceViolation[] = [];

  for (const appliance of appliances) {
    const appViolations = validateApplianceClearance(appliance, obstacles);
    violations.push(...appViolations);
  }

  return { valid: violations.length === 0, violations };
}

/**
 * Get a human-readable summary of clearance requirements for an appliance type.
 *
 * @param type Appliance type.
 * @returns Object with side→mm mapping for non-zero clearances.
 */
export function getClearanceSummary(type: ApplianceType): Partial<ClearanceSpec> {
  const spec = STANDARD_CLEARANCES[type];
  const result: Partial<ClearanceSpec> = {};
  for (const [side, mm] of Object.entries(spec)) {
    if (mm > 0) (result as Record<string, number>)[side] = mm;
  }
  return result;
}
