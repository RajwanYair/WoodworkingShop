/**
 * Cost comparison engine — Sprint 23
 *
 * Compares cost estimates across multiple cabinet configurations or material
 * selections so the user can make data-driven "what-if" decisions.
 *
 * All functions are pure (no side effects, no React, no IDB).
 * Costs are in the material's own currency unit; callers must normalise to a
 * single currency before cross-currency comparisons.
 */

import type { CabinetConfig } from '../engine/types';
import { estimateCost, type CostBreakdown } from '../engine/cost-estimator';
import { generateParts } from '../engine/parts';
import { computeDimensions } from '../engine/dimensions';
import { getMaterial, MATERIALS } from '../engine/materials';
import { optimizeCutSheets } from '../engine/cut-optimizer';
import { generateHardware } from '../engine/hardware';

// ── Re-export CostBreakdown as CostEstimate alias for API clarity ─────────────
export type CostEstimate = CostBreakdown;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConfigScenario {
  /** Human-readable label for display in comparison tables. */
  label: string;
  config: CabinetConfig;
}

export interface ScenarioCostResult {
  label: string;
  config: CabinetConfig;
  estimate: CostEstimate;
  /** materialKey of the resolved material. */
  materialKey: string;
  /** Currency code from the material (e.g. 'USD', 'ILS'). */
  currencyCode: string;
}

export interface CostComparisonReport {
  scenarios: ScenarioCostResult[];
  /** Index into `scenarios` of the cheapest scenario. */
  cheapestIndex: number;
  /** Index into `scenarios` of the most expensive scenario. */
  mostExpensiveIndex: number;
  /** Total cost spread (max − min). */
  costSpread: number;
  /** Whether all scenarios share the same currency (safe to compare directly). */
  sameCurrency: boolean;
}

export interface MaterialCostVariant {
  materialKey: string;
  materialName: string;
  currencyCode: string;
  estimate: CostEstimate;
}

export interface MaterialSwapReport {
  baseConfig: CabinetConfig;
  baseMaterialKey: string;
  variants: MaterialCostVariant[];
  /** Key of the cheapest material variant. */
  cheapestKey: string;
  /** Key of the most expensive material variant. */
  mostExpensiveKey: string;
}

// ── Core API ──────────────────────────────────────────────────────────────────

/**
 * Estimate the cost for a single `CabinetConfig`.
 * Returns a `ScenarioCostResult` ready for comparison.
 */
export function estimateScenario(label: string, config: CabinetConfig): ScenarioCostResult {
  const dims = computeDimensions(config);
  const parts = generateParts(config, dims);
  const optimization = optimizeCutSheets(parts);
  const hardware = generateHardware(config);
  const hwList = hardware.map((h) => ({ id: h.id, qty: h.qty, name: h.name }));
  // Sum edge banding metres across all placed parts
  const edgeBandingTotal = optimization.sheets
    .flatMap((s) => s.parts)
    .reduce((sum, p) => {
      const ebStr = p.edgeBanding ?? '';
      const sides = ebStr.split(',').filter(Boolean).length;
      const perimMm = 2 * ((p.width ?? 0) + (p.length ?? 0));
      return sum + (sides > 0 ? perimMm / 1000 : 0);
    }, 0);
  const estimate = estimateCost(optimization, hwList, edgeBandingTotal);

  const mat = getMaterial(config.carcassMaterial);
  const materialKey = config.carcassMaterial;
  const currencyCode = (mat as { currencyCode?: string } | null)?.currencyCode ?? 'USD';

  return { label, config, estimate, materialKey, currencyCode };
}

/**
 * Compare a list of config scenarios and produce a `CostComparisonReport`.
 */
export function compareScenarios(scenarios: ConfigScenario[]): CostComparisonReport {
  if (scenarios.length === 0) {
    return {
      scenarios: [],
      cheapestIndex: 0,
      mostExpensiveIndex: 0,
      costSpread: 0,
      sameCurrency: true,
    };
  }

  const results: ScenarioCostResult[] = scenarios.map((s) =>
    estimateScenario(s.label, s.config),
  );

  let cheapestIndex = 0;
  let mostExpensiveIndex = 0;
  for (let i = 1; i < results.length; i++) {
    if (results[i]!.estimate.totalCost < results[cheapestIndex]!.estimate.totalCost) {
      cheapestIndex = i;
    }
    if (results[i]!.estimate.totalCost > results[mostExpensiveIndex]!.estimate.totalCost) {
      mostExpensiveIndex = i;
    }
  }

  const currencies = new Set(results.map((r) => r.currencyCode));
  const sameCurrency = currencies.size === 1;
  const costSpread =
    results[mostExpensiveIndex]!.estimate.totalCost -
    results[cheapestIndex]!.estimate.totalCost;

  return { scenarios: results, cheapestIndex, mostExpensiveIndex, costSpread, sameCurrency };
}

/**
 * Swap the material on a config across all available built-in materials
 * (optionally filtered by thickness compatibility) and return a sorted
 * `MaterialSwapReport` showing which material is cheapest.
 *
 * Only materials with `pricePerSheet > 0` are included.
 */
export function compareMaterialCosts(
  config: CabinetConfig,
  materialKeys?: string[],
): MaterialSwapReport {
  const keys = materialKeys ?? MATERIALS.map((m) => m.key);
  const baseMaterialKey = config.carcassMaterial;

  const variants: MaterialCostVariant[] = [];

  for (const key of keys) {
    const mat = getMaterial(key);
    if (!mat || (mat.pricePerSheet ?? 0) <= 0) continue;

    const testConfig: CabinetConfig = { ...config, carcassMaterial: key };
    const dims = computeDimensions(testConfig);
    const parts = generateParts(testConfig, dims);
    const optimization = optimizeCutSheets(parts);
    const hardware = generateHardware(testConfig);
    const hwList = hardware.map((h) => ({ id: h.id, qty: h.qty, name: h.name }));
    const edgeBandingTotal = optimization.sheets
      .flatMap((s) => s.parts)
      .reduce((sum, p) => {
        const ebStr = p.edgeBanding ?? '';
        const sides = ebStr.split(',').filter(Boolean).length;
        const perimMm = 2 * ((p.width ?? 0) + (p.length ?? 0));
        return sum + (sides > 0 ? perimMm / 1000 : 0);
      }, 0);
    const estimate = estimateCost(optimization, hwList, edgeBandingTotal);

    variants.push({
      materialKey: key,
      materialName: mat.name.en,
      currencyCode: (mat as { currencyCode?: string }).currencyCode ?? 'USD',
      estimate,
    });
  }

  // Sort cheapest first
  variants.sort((a, b) => a.estimate.totalCost - b.estimate.totalCost);

  const cheapestKey = variants[0]?.materialKey ?? baseMaterialKey;
  const mostExpensiveKey = variants[variants.length - 1]?.materialKey ?? baseMaterialKey;

  return { baseConfig: config, baseMaterialKey, variants, cheapestKey, mostExpensiveKey };
}

// ── Formatting helpers ────────────────────────────────────────────────────────

/**
 * Format a cost value using `Intl.NumberFormat`.
 * Falls back to a plain number string when the currency code is unknown.
 */
export function formatCost(amount: number, currencyCode: string, locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

/**
 * Compute the percentage difference between `base` and `target` costs.
 * Positive = target is more expensive than base.
 */
export function costDeltaPercent(base: number, target: number): number {
  if (base === 0) return 0;
  return ((target - base) / base) * 100;
}
