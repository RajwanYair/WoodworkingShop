/**
 * Wood Screw Pilot Hole Calculator — Sprint 211
 *
 * Recommends pilot hole diameter, countersink diameter/depth, and
 * clearance hole for wood screws based on screw gauge and wood hardness.
 */

/** Wood hardness categories. */
export type WoodHardness = 'softwood' | 'hardwood' | 'plywood' | 'mdf';

/** Common screw gauge numbers (North American). */
export type ScrewGauge = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 12 | 14;

/** Input for pilot hole calculation. */
export interface PilotHoleInput {
  /** Screw gauge number. */
  readonly gauge: ScrewGauge;
  /** Screw length (mm). */
  readonly screwLengthMm: number;
  /** Type of wood receiving the screw. */
  readonly woodHardness: WoodHardness;
  /** Whether to countersink the head (default true). */
  readonly countersink?: boolean;
}

/** Pilot hole calculation result. */
export interface PilotHoleResult {
  /** Recommended pilot hole diameter (mm). */
  readonly pilotHoleMm: number;
  /** Clearance hole diameter for the shank (mm). */
  readonly clearanceHoleMm: number;
  /** Countersink diameter (mm). 0 if countersink=false. */
  readonly countersinkDiameterMm: number;
  /** Countersink depth (mm). 0 if countersink=false. */
  readonly countersinkDepthMm: number;
  /** Recommended pilot hole depth (mm). */
  readonly pilotDepthMm: number;
  /** Screw major diameter (mm) for reference. */
  readonly screwDiameterMm: number;
}

/**
 * Screw gauge → major diameter (mm).
 * Source: common woodworking reference tables.
 */
const GAUGE_DIAMETER_MM: Record<ScrewGauge, number> = {
  2: 2.18,
  3: 2.51,
  4: 2.84,
  5: 3.18,
  6: 3.51,
  7: 3.84,
  8: 4.17,
  9: 4.5,
  10: 4.83,
  12: 5.49,
  14: 6.15,
} as const;

/**
 * Pilot hole ratio by wood hardness (fraction of major diameter).
 */
const PILOT_RATIO: Record<WoodHardness, number> = {
  softwood: 0.5,
  hardwood: 0.7,
  plywood: 0.6,
  mdf: 0.8,
} as const;

/**
 * Calculate pilot hole, clearance hole, and countersink dimensions.
 *
 * @param input - Screw and wood parameters
 * @returns Hole dimensions
 * @throws RangeError for invalid inputs
 */
export function calculatePilotHole(input: PilotHoleInput): PilotHoleResult {
  const { gauge, screwLengthMm, woodHardness, countersink = true } = input;

  if (screwLengthMm <= 0) {
    throw new RangeError(`calculatePilotHole: screwLengthMm must be > 0, got ${screwLengthMm}`);
  }

  const screwDiameterMm = GAUGE_DIAMETER_MM[gauge];
  if (screwDiameterMm === undefined) {
    throw new RangeError(`calculatePilotHole: unsupported gauge ${gauge}`);
  }

  const pilotRatio = PILOT_RATIO[woodHardness];
  const pilotHoleMm = round2(screwDiameterMm * pilotRatio);
  const clearanceHoleMm = round2(screwDiameterMm * 1.1);
  const pilotDepthMm = round2(screwLengthMm * 0.75);

  // Countersink is typically 2× screw diameter wide and flush depth ≈ diameter/2
  const countersinkDiameterMm = countersink ? round2(screwDiameterMm * 2) : 0;
  const countersinkDepthMm = countersink ? round2(screwDiameterMm * 0.5) : 0;

  return {
    pilotHoleMm,
    clearanceHoleMm,
    countersinkDiameterMm,
    countersinkDepthMm,
    pilotDepthMm,
    screwDiameterMm,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
