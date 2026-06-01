/**
 * Miter & Compound Angle Calculator — Sprint 200
 *
 * Computes miter saw blade angles for polygon joints, compound miters
 * (tilt + rotation), and crown molding angles.
 */

import { assertBetweenExclusive, assertBetweenInclusive } from './invariant';

/** Input for polygon miter calculation. */
export interface PolygonMiterInput {
  /** Number of sides in the polygon (3–36). */
  readonly sides: number;
}

/** Result of polygon miter calculation. */
export interface PolygonMiterResult {
  /** Miter angle per joint (degrees). */
  readonly miterAngle: number;
  /** Interior angle of the polygon (degrees). */
  readonly interiorAngle: number;
  /** Total interior angles sum (degrees). */
  readonly angleSum: number;
}

/** Input for compound miter calculation. */
export interface CompoundMiterInput {
  /** Tilt angle of the workpiece from vertical (degrees, 0–89). */
  readonly tiltDeg: number;
  /** Corner angle in plan view (degrees, 1–179). Typically 90 for square corners. */
  readonly cornerDeg: number;
}

/** Result of compound miter calculation. */
export interface CompoundMiterResult {
  /** Blade miter angle (rotation on the table, degrees). */
  readonly miterAngle: number;
  /** Blade bevel/tilt angle (degrees). */
  readonly bevelAngle: number;
}

/** Input for crown molding angle calculation. */
export interface CrownMoldingInput {
  /** Spring angle of the crown molding (degrees from wall). Typically 38 or 45. */
  readonly springAngle: number;
  /** Wall corner angle (degrees). 90 for inside corner, 270 for outside corner. */
  readonly wallAngle: number;
}

/** Result of crown molding angle calculation. */
export interface CrownMoldingResult {
  /** Miter saw angle (degrees). */
  readonly miterAngle: number;
  /** Bevel angle (degrees). */
  readonly bevelAngle: number;
  /** Whether this is an inside or outside corner. */
  readonly cornerType: 'inside' | 'outside';
}

/**
 * Calculate miter angle for a regular polygon.
 *
 * Formula: miter = 180 / sides
 *
 * @param input - Polygon parameters
 * @returns Miter angle and polygon geometry
 * @throws RangeError for invalid number of sides
 */
export function calculatePolygonMiter(input: PolygonMiterInput): PolygonMiterResult {
  const fn = 'calculatePolygonMiter';
  const { sides } = input;

  assertBetweenInclusive(fn, 'sides', sides, 3, 36);
  if (!Number.isInteger(sides)) {
    throw new RangeError(`${fn}: sides must be an integer between 3 and 36, got ${sides}`);
  }

  const miterAngle = Math.round((180 / sides) * 1000) / 1000;
  const interiorAngle = Math.round((((sides - 2) * 180) / sides) * 1000) / 1000;
  const angleSum = (sides - 2) * 180;

  return { miterAngle, interiorAngle, angleSum };
}

/**
 * Calculate compound miter angles (bevel + miter) for angled joints.
 *
 * Used when a workpiece is tilted and joined at a corner angle.
 *
 * @param input - Tilt and corner parameters
 * @returns Blade miter and bevel angles
 * @throws RangeError for invalid angles
 */
export function calculateCompoundMiter(input: CompoundMiterInput): CompoundMiterResult {
  const fn = 'calculateCompoundMiter';
  const { tiltDeg, cornerDeg } = input;

  assertBetweenInclusive(fn, 'tiltDeg', tiltDeg, 0, 90);
  if (tiltDeg >= 90) {
    throw new RangeError(`${fn}: tiltDeg must be >= 0 and < 90, got ${tiltDeg}`);
  }
  assertBetweenExclusive(fn, 'cornerDeg', cornerDeg, 0, 180);

  const tiltRad = (tiltDeg * Math.PI) / 180;
  const halfCornerRad = ((cornerDeg / 2) * Math.PI) / 180;

  // Compound miter formulas:
  // miter = atan(sin(tilt) / tan(halfCorner))
  // bevel = asin(cos(tilt) * cos(halfCorner))
  const miterRad = Math.atan(Math.sin(tiltRad) / Math.tan(halfCornerRad));
  const bevelRad = Math.asin(Math.cos(tiltRad) * Math.cos(halfCornerRad));

  const miterAngle = Math.round(((miterRad * 180) / Math.PI) * 100) / 100;
  const bevelAngle = Math.round(((bevelRad * 180) / Math.PI) * 100) / 100;

  return { miterAngle, bevelAngle };
}

/**
 * Calculate miter and bevel angles for crown molding installation.
 *
 * @param input - Crown molding parameters
 * @returns Miter and bevel angles for the saw
 * @throws RangeError for invalid angles
 */
export function calculateCrownMolding(input: CrownMoldingInput): CrownMoldingResult {
  const fn = 'calculateCrownMolding';
  const { springAngle, wallAngle } = input;

  assertBetweenExclusive(fn, 'springAngle', springAngle, 0, 90);
  assertBetweenExclusive(fn, 'wallAngle', wallAngle, 0, 360);

  const cornerType: 'inside' | 'outside' = wallAngle <= 180 ? 'inside' : 'outside';

  // Effective corner angle for calculation
  const effectiveAngle = cornerType === 'inside' ? wallAngle : 360 - wallAngle;

  const springRad = (springAngle * Math.PI) / 180;
  const halfCornerRad = ((effectiveAngle / 2) * Math.PI) / 180;

  // Crown molding formulas:
  // miter = atan(sin(spring) / tan(halfCorner))
  // bevel = asin(cos(spring) * cos(halfCorner))
  const miterRad = Math.atan(Math.sin(springRad) / Math.tan(halfCornerRad));
  const bevelRad = Math.asin(Math.cos(springRad) * Math.cos(halfCornerRad));

  const miterAngle = Math.round(Math.abs((miterRad * 180) / Math.PI) * 100) / 100;
  const bevelAngle = Math.round(Math.abs((bevelRad * 180) / Math.PI) * 100) / 100;

  return { miterAngle, bevelAngle, cornerType };
}
