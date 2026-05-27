/**
 * Material Waste Predictor — Sprint 177
 *
 * Predicts waste percentage before cutting by analyzing part dimensions
 * against available sheet sizes. Uses geometric heuristics to estimate
 * how efficiently parts can be packed without running the full optimizer.
 */

/** A rectangular part to be cut. */
export interface PredictorPart {
  /** Part width in mm. */
  readonly width: number;
  /** Part length in mm. */
  readonly length: number;
  /** Quantity needed. */
  readonly quantity: number;
}

/** Available sheet size. */
export interface SheetSize {
  /** Sheet width in mm. */
  readonly width: number;
  /** Sheet length in mm. */
  readonly length: number;
}

/** Waste prediction confidence level. */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Waste prediction for a single sheet size. */
export interface SheetPrediction {
  /** The sheet size evaluated. */
  readonly sheet: SheetSize;
  /** Estimated number of sheets needed. */
  readonly sheetsNeeded: number;
  /** Total sheet area used (mm²). */
  readonly totalSheetArea: number;
  /** Total part area needed (mm²). */
  readonly totalPartArea: number;
  /** Predicted waste area (mm²). */
  readonly wasteArea: number;
  /** Predicted waste percentage (0–100). */
  readonly wastePercent: number;
  /** Confidence level of the prediction. */
  readonly confidence: ConfidenceLevel;
}

/** Full prediction result. */
export interface WastePredictionResult {
  /** Predictions per sheet size (sorted by waste % ascending). */
  readonly predictions: readonly SheetPrediction[];
  /** Best sheet size (lowest waste %). */
  readonly bestSheet: SheetPrediction;
  /** Average predicted waste across all sheet sizes. */
  readonly averageWaste: number;
  /** Total part area demanded (mm²). */
  readonly totalDemand: number;
}

/**
 * Computes total area demanded by all parts.
 * @param parts - Array of parts with dimensions and quantities
 * @returns Total area in mm²
 */
export function computeTotalDemand(parts: readonly PredictorPart[]): number {
  let total = 0;
  for (const p of parts) {
    total += p.width * p.length * p.quantity;
  }
  return total;
}

/**
 * Estimates how many parts fit on a single sheet using strip-packing heuristic.
 * Tries both orientations for each part and picks the better fit.
 * @param part - The part dimensions
 * @param sheet - The sheet dimensions
 * @returns Estimated parts per sheet (integer, ≥ 0)
 */
export function estimatePartsPerSheet(part: PredictorPart, sheet: SheetSize): number {
  // Try normal orientation
  const colsNorm = Math.floor(sheet.width / part.width);
  const rowsNorm = Math.floor(sheet.length / part.length);
  const fitNorm = colsNorm * rowsNorm;

  // Try rotated orientation
  const colsRot = Math.floor(sheet.width / part.length);
  const rowsRot = Math.floor(sheet.length / part.width);
  const fitRot = colsRot * rowsRot;

  return Math.max(fitNorm, fitRot);
}

/**
 * Determines confidence level based on part-to-sheet area ratio and part count.
 * @param partCount - Number of distinct part sizes
 * @param avgFillRatio - Average fill ratio across parts
 * @returns Confidence level
 */
function determineConfidence(partCount: number, avgFillRatio: number): ConfidenceLevel {
  if (partCount <= 3 && avgFillRatio > 0.7) return 'high';
  if (partCount <= 8 && avgFillRatio > 0.5) return 'medium';
  return 'low';
}

/**
 * Predicts waste for a single sheet size.
 * @param parts - Parts to cut
 * @param sheet - Sheet size to evaluate
 * @returns Sheet prediction with estimated waste
 */
function predictForSheet(parts: readonly PredictorPart[], sheet: SheetSize): SheetPrediction {
  const sheetArea = sheet.width * sheet.length;
  let totalSheetsNeeded = 0;
  let totalPartArea = 0;
  const fillRatios: number[] = [];

  for (const part of parts) {
    const perSheet = estimatePartsPerSheet(part, sheet);
    if (perSheet === 0) {
      // Part doesn't fit at all — need at least 1 sheet per part (oversized)
      totalSheetsNeeded += part.quantity;
      totalPartArea += part.width * part.length * part.quantity;
      fillRatios.push(0);
      continue;
    }

    const sheetsForPart = Math.ceil(part.quantity / perSheet);
    totalSheetsNeeded += sheetsForPart;
    totalPartArea += part.width * part.length * part.quantity;
    fillRatios.push((part.width * part.length * Math.min(part.quantity, perSheet)) / sheetArea);
  }

  const totalSheetArea = totalSheetsNeeded * sheetArea;
  const wasteArea = totalSheetArea - totalPartArea;
  const wastePercent = totalSheetArea > 0 ? (wasteArea / totalSheetArea) * 100 : 0;

  const avgFillRatio = fillRatios.length > 0 ? fillRatios.reduce((sum, r) => sum + r, 0) / fillRatios.length : 0;

  return {
    sheet,
    sheetsNeeded: totalSheetsNeeded,
    totalSheetArea,
    totalPartArea,
    wasteArea,
    wastePercent: Math.round(wastePercent * 100) / 100,
    confidence: determineConfidence(parts.length, avgFillRatio),
  };
}

/**
 * Predicts material waste for a set of parts across multiple sheet sizes.
 * Uses geometric strip-packing heuristics for fast estimation without
 * running the full MaxRects optimizer.
 *
 * @param parts - Array of parts to cut (with quantity)
 * @param sheets - Available sheet sizes to evaluate
 * @returns Waste prediction result with best sheet recommendation
 * @throws RangeError if parts array is empty
 * @throws RangeError if sheets array is empty
 * @throws RangeError if any part has non-positive dimensions
 */
export function predictWaste(parts: readonly PredictorPart[], sheets: readonly SheetSize[]): WastePredictionResult {
  if (parts.length === 0) {
    throw new RangeError('predictWaste: parts array must not be empty');
  }
  if (sheets.length === 0) {
    throw new RangeError('predictWaste: sheets array must not be empty');
  }

  for (const part of parts) {
    if (part.width <= 0 || part.length <= 0 || part.quantity <= 0) {
      throw new RangeError(
        `predictWaste: part dimensions and quantity must be positive, got ${part.width}×${part.length} qty ${part.quantity}`,
      );
    }
  }

  const predictions = sheets
    .map((sheet) => predictForSheet(parts, sheet))
    .sort((a, b) => a.wastePercent - b.wastePercent);

  const averageWaste = predictions.reduce((sum, p) => sum + p.wastePercent, 0) / predictions.length;

  const totalDemand = computeTotalDemand(parts);

  return {
    predictions,
    bestSheet: predictions[0],
    averageWaste: Math.round(averageWaste * 100) / 100,
    totalDemand,
  };
}
