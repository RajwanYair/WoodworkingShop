/**
 * Dado / Rabbet Joint Calculator — Sprint 226
 *
 * Calculates cut dimensions for dado and rabbet joints:
 * - Dado: cross-grain groove cut partway through a board to receive a shelf/panel
 * - Rabbet: shoulder cut at the end/edge of a board
 * - Through dado: dado cut all the way across the board width
 *
 * Rule of thumb: dado depth = 1/3 to 1/2 of board thickness
 */

export type DadoRabbetJointType = 'dado' | 'rabbet' | 'throughDado';

export interface DadoRabbetInput {
  /** Joint type */
  jointType: DadoRabbetJointType;
  /** Thickness of the mating panel (shelf/divider) in mm */
  matingThicknessMm: number;
  /** Thickness of the receiving board in mm */
  boardThicknessMm: number;
  /** Distance from edge for rabbet offset (applies to rabbet only) in mm (default 0) */
  offsetFromEdgeMm?: number;
}

export interface DadoRabbetResult {
  /** Recommended cut width in mm (matches mating thickness with 0.5 mm clearance) */
  cutWidthMm: number;
  /** Recommended cut depth in mm */
  cutDepthMm: number;
  /** Offset from board edge in mm (for rabbet) */
  offsetFromEdgeMm: number;
  /** Recommended router bit or saw blade description */
  bitsRecommendation: string;
  /** Number of router passes required for bits up to 12.7 mm */
  passCount: number;
  /** Remaining board thickness below the cut in mm */
  remainingThicknessMm: number;
}

export function calculateDadoRabbet(input: DadoRabbetInput): DadoRabbetResult {
  const { jointType, matingThicknessMm, boardThicknessMm, offsetFromEdgeMm = 0 } = input;

  if (matingThicknessMm <= 0) throw new RangeError('matingThicknessMm must be positive');
  if (boardThicknessMm <= 0) throw new RangeError('boardThicknessMm must be positive');
  if (matingThicknessMm >= boardThicknessMm) {
    throw new RangeError('matingThicknessMm must be less than boardThicknessMm');
  }

  // Cut width = mating thickness + 0.5 mm clearance for fit
  const cutWidthMm = matingThicknessMm + 0.5;

  // Cut depth: 1/3 of board thickness (standard joinery rule)
  const cutDepthMm = Math.round((boardThicknessMm / 3) * 10) / 10;

  const remainingThicknessMm = boardThicknessMm - cutDepthMm;

  // Router passes: standard straight bits are 6–12.7 mm; use 12.7 mm bit
  const maxBitWidthMm = 12.7;
  const passCount = Math.ceil(cutWidthMm / maxBitWidthMm);

  // Bit recommendation based on cut width
  let bitsRecommendation: string;
  if (jointType === 'dado' || jointType === 'throughDado') {
    if (cutWidthMm <= 6.5) bitsRecommendation = '6 mm straight router bit or dado blade set';
    else if (cutWidthMm <= 9.5) bitsRecommendation = '9.5 mm straight router bit or dado blade set';
    else if (cutWidthMm <= 12.7) bitsRecommendation = '12.7 mm straight router bit or dado blade set';
    else bitsRecommendation = 'Dado blade set (table saw) — multiple passes';
  } else {
    bitsRecommendation = 'Rabbet bit with bearing or dado blade set';
  }

  return {
    cutWidthMm: Math.round(cutWidthMm * 10) / 10,
    cutDepthMm,
    offsetFromEdgeMm: jointType === 'rabbet' ? offsetFromEdgeMm : 0,
    bitsRecommendation,
    passCount,
    remainingThicknessMm: Math.round(remainingThicknessMm * 10) / 10,
  };
}
