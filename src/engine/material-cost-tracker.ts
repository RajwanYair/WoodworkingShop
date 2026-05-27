/**
 * Material Cost Tracker — Sprint 182
 *
 * Track material prices over time, compare supplier quotes,
 * compute project cost from current prices, and detect price anomalies.
 */

/** A single price entry for a material from a supplier. */
export interface PriceEntry {
  readonly materialId: string;
  readonly supplierId: string;
  /** Price per unit (e.g., per m², per linear metre, per sheet). */
  readonly pricePerUnit: number;
  /** ISO 8601 date string. */
  readonly date: string;
  readonly currency: string;
}

/** Material demand for a project (quantity needed). */
export interface MaterialDemand {
  readonly materialId: string;
  readonly quantity: number;
}

/** Cost breakdown for a single material in a project. */
export interface MaterialCostLine {
  readonly materialId: string;
  readonly quantity: number;
  readonly bestPrice: number;
  readonly bestSupplierId: string;
  readonly lineCost: number;
}

/** Price trend direction. */
export type TrendDirection = 'rising' | 'falling' | 'stable';

/** Price trend analysis for a material. */
export interface PriceTrend {
  readonly materialId: string;
  readonly direction: TrendDirection;
  /** Percent change from oldest to newest entry. */
  readonly changePercent: number;
  readonly entries: number;
}

/** Full project cost estimation result. */
export interface ProjectCostResult {
  readonly lines: readonly MaterialCostLine[];
  readonly totalCost: number;
  readonly currency: string;
  readonly materialsWithoutPrice: readonly string[];
}

/**
 * Find the best (lowest) current price for a material across all suppliers.
 * Uses the most recent entry per supplier.
 *
 * @param entries - All price entries (unsorted).
 * @param materialId - Material to look up.
 * @returns Best price entry or undefined if none found.
 */
export function findBestPrice(entries: readonly PriceEntry[], materialId: string): PriceEntry | undefined {
  const forMaterial = entries.filter((e) => e.materialId === materialId);
  if (forMaterial.length === 0) return undefined;

  // Get most recent entry per supplier
  const bySupplier = new Map<string, PriceEntry>();
  for (const entry of forMaterial) {
    const existing = bySupplier.get(entry.supplierId);
    if (!existing || entry.date > existing.date) {
      bySupplier.set(entry.supplierId, entry);
    }
  }

  let best: PriceEntry | undefined;
  for (const entry of bySupplier.values()) {
    if (!best || entry.pricePerUnit < best.pricePerUnit) {
      best = entry;
    }
  }

  return best;
}

/**
 * Compute price trend for a material based on historical entries.
 *
 * @param entries - All price entries.
 * @param materialId - Material to analyze.
 * @returns Trend analysis or undefined if fewer than 2 entries.
 */
export function computePriceTrend(entries: readonly PriceEntry[], materialId: string): PriceTrend | undefined {
  const forMaterial = entries
    .filter((e) => e.materialId === materialId)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  if (forMaterial.length < 2) return undefined;

  const oldest = forMaterial[0].pricePerUnit;
  const newest = forMaterial[forMaterial.length - 1].pricePerUnit;
  const changePercent = oldest === 0 ? 0 : Math.round(((newest - oldest) / oldest) * 10000) / 100;

  let direction: TrendDirection;
  if (changePercent > 5) direction = 'rising';
  else if (changePercent < -5) direction = 'falling';
  else direction = 'stable';

  return {
    materialId,
    direction,
    changePercent,
    entries: forMaterial.length,
  };
}

/**
 * Estimate total project cost based on material demands and current prices.
 *
 * @param demands - Materials and quantities needed.
 * @param entries - All price entries.
 * @param currency - Currency to filter by.
 * @throws {RangeError} If demands array is empty.
 */
export function estimateProjectCost(
  demands: readonly MaterialDemand[],
  entries: readonly PriceEntry[],
  currency: string,
): ProjectCostResult {
  if (demands.length === 0) {
    throw new RangeError('demands must not be empty');
  }

  const currencyEntries = entries.filter((e) => e.currency === currency);
  const lines: MaterialCostLine[] = [];
  const materialsWithoutPrice: string[] = [];

  for (const demand of demands) {
    const best = findBestPrice(currencyEntries, demand.materialId);
    if (!best) {
      materialsWithoutPrice.push(demand.materialId);
      continue;
    }

    lines.push({
      materialId: demand.materialId,
      quantity: demand.quantity,
      bestPrice: best.pricePerUnit,
      bestSupplierId: best.supplierId,
      lineCost: Math.round(best.pricePerUnit * demand.quantity * 100) / 100,
    });
  }

  const totalCost = Math.round(lines.reduce((sum, l) => sum + l.lineCost, 0) * 100) / 100;

  return { lines, totalCost, currency, materialsWithoutPrice };
}

/**
 * Detect price anomalies — entries that deviate more than threshold% from
 * the material's median price.
 *
 * @param entries - All price entries.
 * @param thresholdPercent - Deviation threshold (default 30%).
 * @returns Entries that are anomalous.
 */
export function detectPriceAnomalies(entries: readonly PriceEntry[], thresholdPercent = 30): PriceEntry[] {
  const byMaterial = new Map<string, PriceEntry[]>();
  for (const e of entries) {
    const list = byMaterial.get(e.materialId) ?? [];
    list.push(e);
    byMaterial.set(e.materialId, list);
  }

  const anomalies: PriceEntry[] = [];

  for (const [, materialEntries] of byMaterial) {
    if (materialEntries.length < 3) continue;

    const prices = materialEntries.map((e) => e.pricePerUnit).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median = prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];

    for (const entry of materialEntries) {
      const deviation = (Math.abs(entry.pricePerUnit - median) / median) * 100;
      if (deviation > thresholdPercent) {
        anomalies.push(entry);
      }
    }
  }

  return anomalies;
}
