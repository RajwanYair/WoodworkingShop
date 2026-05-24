/**
 * Material Price History — Sprint 16
 *
 * Tracks per-material price changes over time in IndexedDB.
 * Each recorded entry captures the price, currency, unit, and an optional
 * source note (e.g. "Home Depot 2025-06").  The store allows querying the
 * latest price for a material, the full price history, and statistical summaries.
 *
 * IDB store: cabinet-planner-price-history / price-history
 * Key schema: '<materialId>:<timestamp-ms>'
 */

import { get, set, del, keys, createStore, entries } from 'idb-keyval';

// ── IDB store ─────────────────────────────────────────────────────────────────
const priceStore = createStore('cabinet-planner-price-history', 'price-history');

// ── Types ─────────────────────────────────────────────────────────────────────

/** A single price record for a material at a point in time. */
export interface PriceEntry {
  /** Composite key: '<materialId>:<recordedAt ms>'. */
  key: string;
  /** Material identifier matching the engine's material id / name. */
  materialId: string;
  /** Price per unit in the given currency. */
  price: number;
  /** ISO-4217 currency code, e.g. 'USD', 'EUR'. */
  currency: string;
  /** Unit of measure, e.g. 'sheet', 'sqm', 'm²'. */
  unit: string;
  /** ISO 8601 timestamp when this price was recorded. */
  recordedAt: string;
  /** Optional provenance note, e.g. 'Home Depot in-store'. */
  source?: string;
}

/** Aggregated price statistics for a material. */
export interface PriceStats {
  materialId: string;
  count: number;
  latest: PriceEntry;
  oldest: PriceEntry;
  min: number;
  max: number;
  /** Arithmetic mean. */
  average: number;
  /** Change from first to last record: (latest - oldest) / oldest * 100. */
  changePercent: number;
}

// ── Key helpers ───────────────────────────────────────────────────────────────

function _entryKey(materialId: string, recordedAtMs: number): string {
  return `${materialId}:${String(recordedAtMs).padStart(15, '0')}`;
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Record a price for a material.
 * `recordedAt` defaults to the current timestamp when omitted.
 */
export async function recordPrice(
  materialId: string,
  price: number,
  opts: { currency?: string; unit?: string; source?: string; recordedAt?: Date } = {},
): Promise<PriceEntry> {
  if (!materialId.trim()) throw new Error('materialId must not be empty');
  if (!Number.isFinite(price) || price < 0) throw new Error('price must be a non-negative finite number');

  const ts = opts.recordedAt ?? new Date();
  const ms = ts.getTime();
  const key = _entryKey(materialId, ms);
  const entry: PriceEntry = {
    key,
    materialId,
    price,
    currency: opts.currency ?? 'USD',
    unit: opts.unit ?? 'sheet',
    recordedAt: ts.toISOString(),
    source: opts.source,
  };
  await set(key, entry, priceStore);
  return entry;
}

/**
 * Delete a price entry by its composite key.
 * Silently ignores unknown keys.
 */
export async function deletePriceEntry(key: string): Promise<void> {
  await del(key, priceStore);
}

/**
 * Delete all price history for a material.
 */
export async function clearMaterialHistory(materialId: string): Promise<void> {
  const prefix = `${materialId}:`;
  const allKeys = (await keys(priceStore)).filter((k): k is string => typeof k === 'string' && k.startsWith(prefix));
  await Promise.all(allKeys.map((k) => del(k, priceStore)));
}

// ── Read ──────────────────────────────────────────────────────────────────────

/** Return all price entries for a material, sorted chronologically (oldest first). */
export async function getMaterialHistory(materialId: string): Promise<PriceEntry[]> {
  const prefix = `${materialId}:`;
  const all = (await entries<string, PriceEntry>(priceStore)) as [string, PriceEntry][];
  return all
    .filter(([k]) => k.startsWith(prefix))
    .map(([, v]) => v)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}

/** Return the most recent price entry for a material, or `null` when none exists. */
export async function getLatestPrice(materialId: string): Promise<PriceEntry | null> {
  const history = await getMaterialHistory(materialId);
  return history.length > 0 ? history[history.length - 1] : null;
}

/**
 * Return aggregated stats for a material.
 * Returns `null` when there are fewer than 1 entry.
 */
export async function getPriceStats(materialId: string): Promise<PriceStats | null> {
  const history = await getMaterialHistory(materialId);
  if (history.length === 0) return null;

  const prices = history.map((e) => e.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const average = prices.reduce((s, p) => s + p, 0) / prices.length;
  const oldest = history[0];
  const latest = history[history.length - 1];
  const changePercent = oldest.price !== 0 ? ((latest.price - oldest.price) / oldest.price) * 100 : 0;

  return { materialId, count: history.length, latest, oldest, min, max, average, changePercent };
}

/** Return a list of all material IDs that have at least one price entry. */
export async function listTrackedMaterials(): Promise<string[]> {
  const allKeys = (await keys(priceStore)).filter((k): k is string => typeof k === 'string');
  const ids = new Set(allKeys.map((k) => k.split(':')[0]));
  return [...ids].sort();
}
