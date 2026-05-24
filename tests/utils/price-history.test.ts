/**
 * Material Price History — Sprint 16
 *
 * Tests for src/utils/price-history.ts
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordPrice,
  deletePriceEntry,
  clearMaterialHistory,
  getMaterialHistory,
  getLatestPrice,
  getPriceStats,
  listTrackedMaterials,
} from '../../src/utils/price-history';

async function resetStore() {
  const { keys, del, createStore } = await import('idb-keyval');
  const store = createStore('cabinet-planner-price-history', 'price-history');
  const all = await keys(store);
  await Promise.all(all.map((k) => del(k as string, store)));
}

// ── recordPrice ───────────────────────────────────────────────────────────────

describe('recordPrice', () => {
  beforeEach(resetStore);

  it('records a basic price entry', async () => {
    const entry = await recordPrice('ply-18mm', 45.0);
    expect(entry.materialId).toBe('ply-18mm');
    expect(entry.price).toBe(45.0);
    expect(entry.currency).toBe('USD');
    expect(entry.unit).toBe('sheet');
  });

  it('accepts currency, unit, and source overrides', async () => {
    const entry = await recordPrice('oak', 120, { currency: 'EUR', unit: 'sqm', source: 'Supplier A' });
    expect(entry.currency).toBe('EUR');
    expect(entry.unit).toBe('sqm');
    expect(entry.source).toBe('Supplier A');
  });

  it('uses custom recordedAt date', async () => {
    const d = new Date('2024-03-15T10:00:00Z');
    const entry = await recordPrice('mdf', 30, { recordedAt: d });
    expect(entry.recordedAt).toBe('2024-03-15T10:00:00.000Z');
  });

  it('throws on empty materialId', async () => {
    await expect(recordPrice('', 10)).rejects.toThrow();
    await expect(recordPrice('  ', 10)).rejects.toThrow();
  });

  it('throws on negative price', async () => {
    await expect(recordPrice('ply', -1)).rejects.toThrow();
  });

  it('throws on NaN / Infinity price', async () => {
    await expect(recordPrice('ply', NaN)).rejects.toThrow();
    await expect(recordPrice('ply', Infinity)).rejects.toThrow();
  });

  it('key has expected format', async () => {
    const entry = await recordPrice('birch', 55);
    expect(entry.key).toMatch(/^birch:\d+$/);
  });
});

// ── getMaterialHistory ────────────────────────────────────────────────────────

describe('getMaterialHistory', () => {
  beforeEach(resetStore);

  it('returns empty array when no records exist', async () => {
    expect(await getMaterialHistory('unknown')).toHaveLength(0);
  });

  it('returns entries sorted oldest first', async () => {
    const d1 = new Date('2024-01-01T00:00:00Z');
    const d2 = new Date('2024-06-01T00:00:00Z');
    await recordPrice('ply', 40, { recordedAt: d2 });
    await recordPrice('ply', 38, { recordedAt: d1 });
    const history = await getMaterialHistory('ply');
    expect(history[0].price).toBe(38);
    expect(history[1].price).toBe(40);
  });

  it('only returns entries for the queried material', async () => {
    await recordPrice('matA', 10);
    await recordPrice('matB', 20);
    const history = await getMaterialHistory('matA');
    expect(history.every((e) => e.materialId === 'matA')).toBe(true);
  });
});

// ── getLatestPrice ────────────────────────────────────────────────────────────

describe('getLatestPrice', () => {
  beforeEach(resetStore);

  it('returns null when no entries', async () => {
    expect(await getLatestPrice('ghost')).toBeNull();
  });

  it('returns the most recent entry', async () => {
    await recordPrice('mat', 50, { recordedAt: new Date('2024-01-01T00:00:00Z') });
    await recordPrice('mat', 60, { recordedAt: new Date('2024-12-01T00:00:00Z') });
    const latest = await getLatestPrice('mat');
    expect(latest!.price).toBe(60);
  });
});

// ── deletePriceEntry ──────────────────────────────────────────────────────────

describe('deletePriceEntry', () => {
  beforeEach(resetStore);

  it('deletes a specific entry by key', async () => {
    const entry = await recordPrice('del-mat', 75);
    await deletePriceEntry(entry.key);
    expect(await getMaterialHistory('del-mat')).toHaveLength(0);
  });

  it('silently ignores unknown key', async () => {
    await expect(deletePriceEntry('ghost:000')).resolves.toBeUndefined();
  });
});

// ── clearMaterialHistory ──────────────────────────────────────────────────────

describe('clearMaterialHistory', () => {
  beforeEach(resetStore);

  it('removes all entries for a material', async () => {
    await recordPrice('clr', 10, { recordedAt: new Date('2024-01-01T00:00:00Z') });
    await recordPrice('clr', 20, { recordedAt: new Date('2024-06-01T00:00:00Z') });
    await clearMaterialHistory('clr');
    expect(await getMaterialHistory('clr')).toHaveLength(0);
  });

  it('does not affect other materials', async () => {
    await recordPrice('keep', 30);
    await recordPrice('del', 40);
    await clearMaterialHistory('del');
    const keep = await getMaterialHistory('keep');
    expect(keep).toHaveLength(1);
  });
});

// ── getPriceStats ─────────────────────────────────────────────────────────────

describe('getPriceStats', () => {
  beforeEach(resetStore);

  it('returns null for material with no history', async () => {
    expect(await getPriceStats('ghost')).toBeNull();
  });

  it('computes min, max, average correctly', async () => {
    await recordPrice('s', 10, { recordedAt: new Date('2024-01-01T00:00:00Z') });
    await recordPrice('s', 20, { recordedAt: new Date('2024-04-01T00:00:00Z') });
    await recordPrice('s', 30, { recordedAt: new Date('2024-07-01T00:00:00Z') });
    const stats = await getPriceStats('s');
    expect(stats!.min).toBe(10);
    expect(stats!.max).toBe(30);
    expect(stats!.average).toBeCloseTo(20, 5);
    expect(stats!.count).toBe(3);
  });

  it('computes changePercent', async () => {
    await recordPrice('cp', 100, { recordedAt: new Date('2024-01-01T00:00:00Z') });
    await recordPrice('cp', 150, { recordedAt: new Date('2024-12-01T00:00:00Z') });
    const stats = await getPriceStats('cp');
    expect(stats!.changePercent).toBeCloseTo(50, 5);
  });

  it('handles single entry (changePercent = 0)', async () => {
    await recordPrice('one', 50);
    const stats = await getPriceStats('one');
    expect(stats!.changePercent).toBe(0);
    expect(stats!.count).toBe(1);
  });
});

// ── listTrackedMaterials ──────────────────────────────────────────────────────

describe('listTrackedMaterials', () => {
  beforeEach(resetStore);

  it('returns empty array when store is empty', async () => {
    expect(await listTrackedMaterials()).toHaveLength(0);
  });

  it('returns unique sorted material ids', async () => {
    await recordPrice('mat-z', 10);
    await recordPrice('mat-a', 20);
    await recordPrice('mat-a', 25); // second entry same material
    const ids = await listTrackedMaterials();
    expect(ids).toEqual(['mat-a', 'mat-z']);
  });
});
