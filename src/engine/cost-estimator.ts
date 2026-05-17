import type { OptimizationResult } from './types';
import { getMaterial } from './materials';

export interface CostBreakdown {
  sheetCosts: SheetCost[];
  edgeBandingCost: number;
  hardwareCost: number;
  wasteCost: number;
  totalMaterialCost: number;
  totalCost: number;
}

export interface SheetCost {
  material: string;
  materialName: { en: string; he: string };
  thickness: number;
  qty: number;
  pricePerSheet: number;
  subtotal: number;
}

/** Estimated hardware prices (₪) */
const HARDWARE_PRICES: Record<string, number> = {
  hinge: 12,
  'mounting-plate': 6,
  'shelf-pin': 0.5,
  confirmat: 0.8,
  handle: 15,
  'L-bracket': 4,
  'wood-glue': 25,
};

/** Edge banding price per meter (₪) */
const EDGE_BANDING_PER_METER = 3;

/**
 * Estimate the total cost of a cabinet project based on optimization results
 * and hardware/edge banding quantities.
 *
 * Sprint 139: accepts optional `priceOverrides` map of materialKey → price per sheet (₪).
 * Sprint 141: accepts optional `edgeBandingRate` (₪/m, default EDGE_BANDING_PER_METER).
 */
export function estimateCost(
  optimization: OptimizationResult,
  hardware: { id: string; qty: number }[],
  edgeBandingTotal: number,
  priceOverrides: Record<string, number> = {},
  edgeBandingRate: number = EDGE_BANDING_PER_METER,
): CostBreakdown {
  // Group sheets by material
  const sheetMap = new Map<string, { qty: number; mat: ReturnType<typeof getMaterial> }>();
  for (const sheet of optimization.sheets) {
    const key = `${sheet.material}-${sheet.thickness}`;
    const existing = sheetMap.get(key);
    if (existing) {
      existing.qty++;
    } else {
      sheetMap.set(key, { qty: 1, mat: getMaterial(sheet.material) });
    }
  }

  const sheetCosts: SheetCost[] = [];
  let totalMaterialCost = 0;
  for (const [, { qty, mat }] of sheetMap) {
    // Sprint 139: use override price if present, otherwise mat.pricePerSheet
    const price = priceOverrides[mat.key] ?? mat.pricePerSheet ?? 0;
    const subtotal = qty * price;
    sheetCosts.push({
      material: mat.key,
      materialName: mat.name,
      thickness: mat.thickness,
      qty,
      pricePerSheet: price,
      subtotal,
    });
    totalMaterialCost += subtotal;
  }

  // Edge banding
  const edgeBandingCost = Math.round((edgeBandingTotal / 1000) * edgeBandingRate);

  // Hardware
  let hardwareCost = 0;
  for (const hw of hardware) {
    const unitPrice = HARDWARE_PRICES[hw.id] ?? 0;
    hardwareCost += hw.qty * unitPrice;
  }

  // Waste cost — proportional value of wasted material
  const wastePercent = optimization.sheets.length > 0 ? (100 - optimization.overallYield) / 100 : 0;
  const wasteCost = Math.round(totalMaterialCost * wastePercent);

  return {
    sheetCosts,
    edgeBandingCost,
    hardwareCost,
    wasteCost,
    totalMaterialCost,
    totalCost: totalMaterialCost + edgeBandingCost + hardwareCost,
  };
}
