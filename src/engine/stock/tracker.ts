/**
 * Sprint 38 — Material availability tracker engine.
 *
 * Tracks the on-hand stock of sheet materials and hardware in the workshop
 * and compares it against the cut-plan demand to identify shortfalls.
 *
 * The availability tracker is a pure value object — it does NOT touch any
 * storage layer directly.  Persistence is the responsibility of callers.
 *
 * Pure function — no React, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type StockUnit = 'sheet' | 'piece' | 'metre' | 'kg';

export interface StockItem {
  /** Unique key — matches the material name used in BOM / cut-plan. */
  materialKey: string;
  /** Human-readable label. */
  label: { en: string; he: string };
  onHandQty: number;
  unit: StockUnit;
  /** Optional supplier name. */
  supplier?: string;
  /** Optional reorder level (trigger alert when onHandQty <= this). */
  reorderLevel?: number;
}

export interface StockStore {
  items: StockItem[];
}

export interface DemandEntry {
  materialKey: string;
  /** Quantity required (same unit as StockItem). */
  requiredQty: number;
}

export type StockStatus = 'ok' | 'low' | 'shortfall' | 'unknown';

export interface AvailabilityResult {
  materialKey: string;
  label?: { en: string; he: string };
  onHand: number;
  required: number;
  net: number; // onHand - required (negative = shortfall)
  status: StockStatus;
  unit: StockUnit;
}

// ─── Core ─────────────────────────────────────────────────────────────────────
/** Create an empty, immutable-style stock store. */ export function createStockStore(): StockStore {
  return { items: [] };
}

/** Add or replace a stock item by `materialKey`. Returns a new store (immutable). */
export function addStockItem(store: StockStore, item: StockItem): StockStore {
  const idx = store.items.findIndex((i) => i.materialKey === item.materialKey);
  if (idx !== -1) {
    const updated = [...store.items];
    updated[idx] = item;
    return { items: updated };
  }
  return { items: [...store.items, item] };
}

/** Update the `onHandQty` for a material. Returns the store unchanged if the key is not found. */
export function updateOnHand(store: StockStore, materialKey: string, qty: number): StockStore {
  const idx = store.items.findIndex((i) => i.materialKey === materialKey);
  if (idx === -1) return store;
  const updated = [...store.items];
  updated[idx] = { ...updated[idx], onHandQty: qty };
  return { items: updated };
}

/**
 * Check availability of all demanded materials against on-hand stock.
 * Returns one `AvailabilityResult` per demand entry.
 */
export function checkAvailability(store: StockStore, demand: DemandEntry[]): AvailabilityResult[] {
  return demand.map((d) => {
    const item = store.items.find((i) => i.materialKey === d.materialKey);
    if (!item) {
      return {
        materialKey: d.materialKey,
        onHand: 0,
        required: d.requiredQty,
        net: -d.requiredQty,
        status: 'unknown' as StockStatus,
        unit: 'sheet',
      };
    }
    const net = item.onHandQty - d.requiredQty;
    let status: StockStatus = 'ok';
    if (net < 0) {
      status = 'shortfall';
    } else if (item.reorderLevel !== undefined && item.onHandQty <= item.reorderLevel) {
      status = 'low';
    }
    return {
      materialKey: d.materialKey,
      label: item.label,
      onHand: item.onHandQty,
      required: d.requiredQty,
      net,
      status,
      unit: item.unit,
    };
  });
}

/**
 * Return only entries where stock is insufficient (`shortfall` or `unknown`).
 */
export function getShortfalls(results: AvailabilityResult[]): AvailabilityResult[] {
  return results.filter((r) => r.status === 'shortfall' || r.status === 'unknown');
}

/** Format availability results as a plain-text report. */
export function formatAvailabilityReport(results: AvailabilityResult[]): string {
  if (results.length === 0) return 'No demand entries.';
  const lines = results.map((r) => {
    const statusTag = `[${r.status.toUpperCase()}]`;
    const label = r.label?.en ?? r.materialKey;
    return `${statusTag.padEnd(12)} ${label.padEnd(28)} on-hand: ${String(r.onHand).padStart(4)} | req: ${String(r.required).padStart(4)} | net: ${String(r.net).padStart(5)} ${r.unit}`;
  });
  return lines.join('\n');
}
