/**
 * Shop Inventory Manager — Sprint 183
 *
 * Track raw material stock levels, minimum quantities, reorder triggers,
 * and project-based usage projection.
 */

/** A material item in the shop inventory. */
export interface InventoryItem {
  readonly materialId: string;
  readonly name: string;
  /** Current stock quantity (sheets, metres, etc.). */
  readonly quantity: number;
  /** Unit of measurement. */
  readonly unit: string;
  /** Minimum quantity before reorder alert triggers. */
  readonly reorderLevel: number;
  /** Preferred reorder quantity. */
  readonly reorderQuantity: number;
}

/** Stock status for an item. */
export type StockStatus = 'ok' | 'low' | 'out';

/** Inventory check result for a single item. */
export interface StockCheck {
  readonly materialId: string;
  readonly name: string;
  readonly quantity: number;
  readonly reorderLevel: number;
  readonly status: StockStatus;
  readonly deficit: number;
}

/** Material usage for a project. */
export interface ProjectUsage {
  readonly materialId: string;
  readonly quantityNeeded: number;
}

/** Projection result showing whether inventory can fulfil demand. */
export interface UsageProjection {
  readonly materialId: string;
  readonly available: number;
  readonly needed: number;
  readonly surplus: number;
  readonly canFulfil: boolean;
}

/** Full inventory analysis result. */
export interface InventoryAnalysisResult {
  readonly checks: readonly StockCheck[];
  readonly reorderNeeded: readonly StockCheck[];
  readonly outOfStock: readonly StockCheck[];
  readonly totalItems: number;
  readonly healthyItems: number;
}

/**
 * Check stock status for a single item.
 *
 * @param item - Inventory item to check.
 * @returns Stock check with status and deficit.
 */
export function checkStock(item: InventoryItem): StockCheck {
  let status: StockStatus;
  let deficit: number;

  if (item.quantity <= 0) {
    status = 'out';
    deficit = item.reorderLevel;
  } else if (item.quantity <= item.reorderLevel) {
    status = 'low';
    deficit = item.reorderLevel - item.quantity;
  } else {
    status = 'ok';
    deficit = 0;
  }

  return {
    materialId: item.materialId,
    name: item.name,
    quantity: item.quantity,
    reorderLevel: item.reorderLevel,
    status,
    deficit,
  };
}

/**
 * Analyze entire inventory and produce status report.
 *
 * @param inventory - All items in stock.
 * @throws {RangeError} If inventory is empty.
 */
export function analyzeInventory(inventory: readonly InventoryItem[]): InventoryAnalysisResult {
  if (inventory.length === 0) {
    throw new RangeError('inventory must not be empty');
  }

  const checks = inventory.map(checkStock);
  const reorderNeeded = checks.filter((c) => c.status === 'low');
  const outOfStock = checks.filter((c) => c.status === 'out');
  const healthyItems = checks.filter((c) => c.status === 'ok').length;

  return {
    checks,
    reorderNeeded,
    outOfStock,
    totalItems: inventory.length,
    healthyItems,
  };
}

/**
 * Project usage against current inventory to determine fulfilment.
 *
 * @param inventory - Current stock.
 * @param usage - Materials needed for a project.
 * @throws {RangeError} If usage is empty.
 */
export function projectUsage(inventory: readonly InventoryItem[], usage: readonly ProjectUsage[]): UsageProjection[] {
  if (usage.length === 0) {
    throw new RangeError('usage must not be empty');
  }

  const stockMap = new Map(inventory.map((i) => [i.materialId, i.quantity]));

  return usage.map((u) => {
    const available = stockMap.get(u.materialId) ?? 0;
    const surplus = available - u.quantityNeeded;
    return {
      materialId: u.materialId,
      available,
      needed: u.quantityNeeded,
      surplus,
      canFulfil: surplus >= 0,
    };
  });
}

/**
 * Generate reorder list with recommended quantities.
 *
 * @param inventory - Current stock.
 * @returns Items that need reordering with suggested quantities.
 */
export function generateReorderList(
  inventory: readonly InventoryItem[],
): Array<{ materialId: string; name: string; orderQuantity: number }> {
  return inventory
    .filter((item) => item.quantity <= item.reorderLevel)
    .map((item) => ({
      materialId: item.materialId,
      name: item.name,
      orderQuantity: item.reorderQuantity,
    }));
}
