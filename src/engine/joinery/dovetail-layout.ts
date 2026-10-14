/**
 * Dovetail Layout Calculator — Sprint 204
 *
 * Computes pin and tail spacing, angles, and socket dimensions for
 * through dovetails and half-blind dovetails. Supports both hand-cut
 * (variable spacing) and machine-cut (uniform spacing) layouts.
 */

/** Dovetail joint type. */
export type DovetailType = 'through' | 'half_blind';

/** Dovetail cut style (hand-cut allows variable pin widths). */
export type DovetailStyle = 'hand_cut' | 'machine_cut';

/** Input for dovetail layout calculation. */
export interface DovetailInput {
  /** Board width where tails are cut (mm). */
  readonly boardWidthMm: number;
  /** Board thickness (mm). */
  readonly boardThicknessMm: number;
  /** Number of tails desired. */
  readonly tailCount: number;
  /** Dovetail angle in degrees (typically 7–14° for hardwood, 10–14° for softwood). */
  readonly angleDegrees: number;
  /** Joint type. */
  readonly jointType: DovetailType;
  /** Cut style. */
  readonly style?: DovetailStyle;
  /** Pin-to-tail ratio (0.5 = narrow pins, 1.0 = equal, 2.0 = wide pins). */
  readonly pinToTailRatio?: number;
  /** Half-pin width at narrow end (mm). Defaults to 1/2 tail width. */
  readonly halfPinWidthMm?: number;
}

/** A single tail element in the layout. */
export interface DovetailTail {
  /** Start position from edge (mm). */
  readonly startMm: number;
  /** End position (mm). */
  readonly endMm: number;
  /** Width at narrow (inside) face (mm). */
  readonly narrowWidthMm: number;
  /** Width at wide (outside) face (mm). */
  readonly wideWidthMm: number;
}

/** A single pin element in the layout. */
export interface DovetailPin {
  /** Start position from edge (mm). */
  readonly startMm: number;
  /** End position (mm). */
  readonly endMm: number;
  /** Width (mm). */
  readonly widthMm: number;
  /** Whether this is a half-pin at the edge. */
  readonly isHalfPin: boolean;
}

/** Result of dovetail layout calculation. */
export interface DovetailResult {
  /** All tail positions. */
  readonly tails: readonly DovetailTail[];
  /** All pin positions (including half-pins at edges). */
  readonly pins: readonly DovetailPin[];
  /** Dovetail angle used (degrees). */
  readonly angleDegrees: number;
  /** Slope ratio (rise:run, e.g. "1:8" for ~7°). */
  readonly slopeRatio: string;
  /** Socket depth for half-blind joints (mm). */
  readonly socketDepthMm: number;
  /** Total pins including half-pins. */
  readonly pinCount: number;
  /** Total tails. */
  readonly tailCount: number;
}

/**
 * Calculate dovetail layout with pin and tail positions.
 *
 * @param input - Board dimensions and dovetail parameters
 * @returns Complete dovetail layout with positions
 * @throws RangeError for invalid parameters
 */
export function calculateDovetailLayout(input: DovetailInput): DovetailResult {
  const {
    boardWidthMm,
    boardThicknessMm,
    tailCount,
    angleDegrees,
    jointType,
    style = 'hand_cut',
    pinToTailRatio = 0.5,
    halfPinWidthMm,
  } = input;

  if (boardWidthMm <= 0) {
    throw new RangeError(`calculateDovetailLayout: boardWidthMm must be > 0, got ${boardWidthMm}`);
  }
  if (boardThicknessMm <= 0) {
    throw new RangeError(`calculateDovetailLayout: boardThicknessMm must be > 0, got ${boardThicknessMm}`);
  }
  if (tailCount < 1 || !Number.isInteger(tailCount)) {
    throw new RangeError(`calculateDovetailLayout: tailCount must be a positive integer, got ${tailCount}`);
  }
  if (angleDegrees < 5 || angleDegrees > 20) {
    throw new RangeError(`calculateDovetailLayout: angleDegrees must be 5–20, got ${angleDegrees}`);
  }
  if (pinToTailRatio <= 0 || pinToTailRatio > 3) {
    throw new RangeError(`calculateDovetailLayout: pinToTailRatio must be 0–3, got ${pinToTailRatio}`);
  }

  const angleRad = (angleDegrees * Math.PI) / 180;
  const tanAngle = Math.tan(angleRad);

  // Slope ratio (1:N format)
  const slopeN = Math.round(1 / tanAngle);
  const slopeRatio = `1:${slopeN}`;

  // Socket depth for half-blind: typically 2/3 of board thickness
  const socketDepthMm =
    jointType === 'half_blind' ? Math.round(((boardThicknessMm * 2) / 3) * 10) / 10 : boardThicknessMm;

  // Layout calculation
  // Total segments: tailCount tails + (tailCount - 1) full pins + 2 half-pins
  const pinCount = tailCount + 1; // includes 2 half-pins
  const fullPinCount = tailCount - 1;

  // Calculate widths
  // Available width = boardWidth - 2 × halfPinWidth
  const defaultHalfPinWidth = (boardWidthMm / (tailCount * 2 + tailCount + 1)) * 0.5;
  const hpWidth = halfPinWidthMm ?? Math.max(defaultHalfPinWidth, 3);

  const usableWidth = boardWidthMm - 2 * hpWidth;

  if (usableWidth <= 0) {
    throw new RangeError(`calculateDovetailLayout: board too narrow for specified half-pin width`);
  }

  // Distribute usable width among tails and full pins
  // tailWidth × tailCount + pinWidth × fullPinCount = usableWidth
  // pinWidth = tailWidth × pinToTailRatio
  const tailWidth = usableWidth / (tailCount + fullPinCount * pinToTailRatio);
  const pinWidth = tailWidth * pinToTailRatio;

  if (tailWidth <= 0 || pinWidth < 0) {
    throw new RangeError(`calculateDovetailLayout: board too narrow for ${tailCount} tails`);
  }

  // Dovetail spread: at the wide face, each tail widens by 2 × thickness × tan(angle)
  const spread = style === 'machine_cut' ? 0 : 2 * socketDepthMm * tanAngle;

  // Build tail and pin arrays
  const tails: DovetailTail[] = [];
  const pins: DovetailPin[] = [];

  let cursor = 0;

  // First half-pin
  pins.push({
    startMm: round2(cursor),
    endMm: round2(cursor + hpWidth),
    widthMm: round2(hpWidth),
    isHalfPin: true,
  });
  cursor += hpWidth;

  for (let i = 0; i < tailCount; i++) {
    // Tail
    const narrowW = round2(tailWidth);
    const wideW = round2(tailWidth + spread);
    tails.push({
      startMm: round2(cursor),
      endMm: round2(cursor + tailWidth),
      narrowWidthMm: narrowW,
      wideWidthMm: wideW,
    });
    cursor += tailWidth;

    // Full pin (between tails) or last half-pin
    if (i < tailCount - 1) {
      pins.push({
        startMm: round2(cursor),
        endMm: round2(cursor + pinWidth),
        widthMm: round2(pinWidth),
        isHalfPin: false,
      });
      cursor += pinWidth;
    }
  }

  // Last half-pin
  pins.push({
    startMm: round2(cursor),
    endMm: round2(cursor + hpWidth),
    widthMm: round2(hpWidth),
    isHalfPin: true,
  });

  return {
    tails,
    pins,
    angleDegrees,
    slopeRatio,
    socketDepthMm,
    pinCount,
    tailCount,
  };
}

/**
 * Get recommended dovetail angle for a species.
 *
 * @param speciesHardness - 'softwood' | 'hardwood'
 * @returns Recommended angle in degrees
 */
export function recommendedDovetailAngle(speciesHardness: 'softwood' | 'hardwood'): number {
  return speciesHardness === 'hardwood' ? 8 : 12;
}

/** Round to 2 decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
