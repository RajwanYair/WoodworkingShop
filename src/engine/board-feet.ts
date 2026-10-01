import { assertFiniteNumber, assertGreaterThan, assertIntegerAtLeast } from './invariant';

/**
 * Board-Feet Calculator — Sprint 199
 *
 * Converts dimensional lumber measurements to board feet,
 * estimates cost, and handles nominal vs actual dimensions.
 */

/** Standard nominal-to-actual dimension mapping (inches). */
export const NOMINAL_TO_ACTUAL: Record<string, number> = {
  '1': 0.75,
  '2': 1.5,
  '3': 2.5,
  '4': 3.5,
  '6': 5.5,
  '8': 7.25,
  '10': 9.25,
  '12': 11.25,
} as const;

/** Common lumber species with typical cost per board foot (USD). */
export const SPECIES_COST_PER_BF: Record<string, number> = {
  pine: 3.5,
  poplar: 4.0,
  soft_maple: 5.5,
  hard_maple: 8.0,
  red_oak: 6.5,
  white_oak: 8.5,
  cherry: 9.0,
  walnut: 12.0,
  ash: 6.0,
  birch: 5.5,
} as const;

/** Input for board feet calculation. */
export interface BoardFeetInput {
  /** Thickness in inches (nominal or actual depending on useNominal). */
  readonly thicknessIn: number;
  /** Width in inches (nominal or actual depending on useNominal). */
  readonly widthIn: number;
  /** Length in inches. */
  readonly lengthIn: number;
  /** Number of pieces. */
  readonly quantity?: number;
  /** Use nominal dimensions (will convert to actual for volume). */
  readonly useNominal?: boolean;
  /** Species for cost estimation. */
  readonly species?: string;
  /** Custom cost per board foot (overrides species lookup). */
  readonly costPerBf?: number;
}

/** Board feet calculation result. */
export interface BoardFeetResult {
  /** Board feet for a single piece. */
  readonly boardFeet: number;
  /** Total board feet (including quantity). */
  readonly totalBoardFeet: number;
  /** Actual thickness used (after nominal conversion if applicable). */
  readonly actualThicknessIn: number;
  /** Actual width used (after nominal conversion if applicable). */
  readonly actualWidthIn: number;
  /** Cost estimate (if species or costPerBf provided). */
  readonly estimatedCost: number | null;
  /** Volume in cubic inches. */
  readonly volumeCuIn: number;
  /** Weight estimate in lbs (rough average 3.5 lbs/bf). */
  readonly estimatedWeightLbs: number;
}

/**
 * Calculate board feet from dimensional lumber measurements.
 *
 * Board foot = (T × W × L) / 144 where T, W, L are in inches.
 * One board foot = 1″ × 12″ × 12″ = 144 cubic inches.
 *
 * @param input - Lumber dimensions and options
 * @returns Board feet calculation with cost and weight estimates
 * @throws RangeError for non-finite/non-positive dimensions, invalid quantity or cost, or non-finite calculated results
 */
export function calculateBoardFeet(input: BoardFeetInput): BoardFeetResult {
  const { thicknessIn, widthIn, lengthIn, quantity = 1, useNominal = false, species, costPerBf } = input;
  const fn = 'calculateBoardFeet';

  assertGreaterThan(fn, 'thicknessIn', thicknessIn, 0);
  assertGreaterThan(fn, 'widthIn', widthIn, 0);
  assertGreaterThan(fn, 'lengthIn', lengthIn, 0);
  assertIntegerAtLeast(fn, 'quantity', quantity, 1);
  if (costPerBf !== undefined) assertFiniteNumber(fn, 'costPerBf', costPerBf);

  // Convert nominal to actual if requested
  const actualThicknessIn = useNominal ? (NOMINAL_TO_ACTUAL[String(thicknessIn)] ?? thicknessIn) : thicknessIn;
  const actualWidthIn = useNominal ? (NOMINAL_TO_ACTUAL[String(widthIn)] ?? widthIn) : widthIn;

  // Board feet formula: (T × W × L) / 144
  const boardFeet = assertFiniteNumber(
    fn,
    'boardFeet',
    Math.round(((actualThicknessIn * actualWidthIn * lengthIn) / 144) * 1000) / 1000,
  );
  const totalBoardFeet = assertFiniteNumber(fn, 'totalBoardFeet', Math.round(boardFeet * quantity * 1000) / 1000);

  // Volume in cubic inches
  const volumeCuIn = assertFiniteNumber(
    fn,
    'volumeCuIn',
    Math.round(actualThicknessIn * actualWidthIn * lengthIn * quantity * 100) / 100,
  );

  // Cost estimate
  let estimatedCost: number | null = null;
  if (costPerBf !== undefined) {
    estimatedCost = assertFiniteNumber(fn, 'estimatedCost', Math.round(totalBoardFeet * costPerBf * 100) / 100);
  } else if (species && species in SPECIES_COST_PER_BF) {
    estimatedCost = assertFiniteNumber(
      fn,
      'estimatedCost',
      Math.round(totalBoardFeet * SPECIES_COST_PER_BF[species] * 100) / 100,
    );
  }

  // Weight estimate: average ~3.5 lbs per board foot (mid-range hardwood)
  const estimatedWeightLbs = assertFiniteNumber(fn, 'estimatedWeightLbs', Math.round(totalBoardFeet * 3.5 * 100) / 100);

  return {
    boardFeet,
    totalBoardFeet,
    actualThicknessIn,
    actualWidthIn,
    estimatedCost,
    volumeCuIn,
    estimatedWeightLbs,
  };
}

/**
 * Convert linear feet of a given cross-section to board feet.
 *
 * @param thicknessIn - Actual thickness in inches
 * @param widthIn - Actual width in inches
 * @param linearFeet - Length in linear feet
 * @returns Board feet
 * @throws RangeError for non-finite/non-positive inputs or a non-finite calculated result
 */
export function linearFeetToBoardFeet(thicknessIn: number, widthIn: number, linearFeet: number): number {
  const fn = 'linearFeetToBoardFeet';
  assertGreaterThan(fn, 'thicknessIn', thicknessIn, 0);
  assertGreaterThan(fn, 'widthIn', widthIn, 0);
  assertGreaterThan(fn, 'linearFeet', linearFeet, 0);

  return assertFiniteNumber(fn, 'boardFeet', Math.round(((thicknessIn * widthIn * linearFeet) / 12) * 1000) / 1000);
}
