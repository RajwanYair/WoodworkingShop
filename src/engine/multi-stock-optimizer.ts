import { optimizeCutSheets } from './cut-optimizer';
import { SAW_KERF } from './materials';
import type { OptimizationResult, Part } from './types';

export interface StockCandidate {
  material: string;
  width: number;
  length: number;
  label?: string;
}

export interface MaterialStockSelection {
  material: string;
  candidate: StockCandidate;
  score: number;
}

export interface MultiStockOptimizationResult {
  selections: MaterialStockSelection[];
  result: OptimizationResult;
}

function validateCandidate(candidate: StockCandidate): void {
  if (candidate.width <= 0 || candidate.length <= 0) {
    throw new RangeError(
      `optimizeWithMultiStock: candidate dimensions must be > 0, got ${candidate.width}x${candidate.length}`,
    );
  }
}

function buildScore(result: OptimizationResult, sawKerfMm: number): number {
  const placedCount = result.sheets.reduce((sum, sheet) => sum + sheet.parts.length, 0);
  return result.totalWaste + placedCount * sawKerfMm;
}

/**
 * Optimize parts by selecting the best stock candidate per material.
 *
 * @param parts Parts to optimize.
 * @param candidates Candidate stock sizes, grouped by material key.
 * @param sawKerfMm Kerf allowance in millimeters.
 * @param cutMode Optimizer mode (`freeform` or `guillotine`).
 * @returns Selected stock per material and merged optimization result.
 * @throws RangeError When candidates contain invalid dimensions.
 */
export function optimizeWithMultiStock(
  parts: Part[],
  candidates: StockCandidate[],
  sawKerfMm = SAW_KERF,
  cutMode: 'guillotine' | 'freeform' = 'freeform',
): MultiStockOptimizationResult {
  if (parts.length === 0) {
    return {
      selections: [],
      result: {
        sheets: [],
        totalSheets: 0,
        overallYield: 0,
        totalWaste: 0,
        grainConflictCount: 0,
      },
    };
  }

  for (const candidate of candidates) {
    validateCandidate(candidate);
  }

  const partsByMaterial = new Map<string, Part[]>();
  for (const part of parts) {
    const list = partsByMaterial.get(part.material) ?? [];
    list.push(part);
    partsByMaterial.set(part.material, list);
  }

  const selections: MaterialStockSelection[] = [];
  const mergedSheets: OptimizationResult['sheets'] = [];
  let sheetIndex = 0;
  let totalWaste = 0;
  let usedArea = 0;
  let totalArea = 0;
  let grainConflictCount = 0;

  for (const [material, materialParts] of partsByMaterial) {
    const materialCandidates = candidates.filter((candidate) => candidate.material === material);

    let bestResult: OptimizationResult | null = null;
    let bestCandidate: StockCandidate | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    if (materialCandidates.length === 0) {
      bestResult = optimizeCutSheets(materialParts, sawKerfMm, {}, cutMode);
      bestScore = buildScore(bestResult, sawKerfMm);
      bestCandidate = {
        material,
        width: bestResult.sheets[0]?.sheetWidth ?? 0,
        length: bestResult.sheets[0]?.sheetLength ?? 0,
        label: 'default',
      };
    } else {
      for (const candidate of materialCandidates) {
        const override = {
          [material]: {
            width: candidate.width,
            length: candidate.length,
          },
        };
        const optimized = optimizeCutSheets(materialParts, sawKerfMm, override, cutMode);
        const score = buildScore(optimized, sawKerfMm);
        if (score < bestScore) {
          bestScore = score;
          bestResult = optimized;
          bestCandidate = candidate;
        }
      }
    }

    if (!bestResult || !bestCandidate) {
      continue;
    }

    selections.push({
      material,
      candidate: bestCandidate,
      score: bestScore,
    });

    for (const sheet of bestResult.sheets) {
      const reindexed = { ...sheet, sheetIndex };
      sheetIndex += 1;
      mergedSheets.push(reindexed);
      totalArea += sheet.sheetLength * sheet.sheetWidth;
      usedArea += sheet.parts.reduce((sum, part) => sum + part.length * part.width, 0);
      totalWaste += sheet.sheetLength * sheet.sheetWidth - sheet.parts.reduce((sum, part) => sum + part.length * part.width, 0);
      grainConflictCount += sheet.parts.filter((part) => part.grainConflict).length;
    }
  }

  return {
    selections,
    result: {
      sheets: mergedSheets,
      totalSheets: mergedSheets.length,
      overallYield: totalArea > 0 ? Math.round((usedArea / totalArea) * 10000) / 100 : 0,
      totalWaste,
      grainConflictCount,
    },
  };
}