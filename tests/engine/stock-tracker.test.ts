import { describe, it, expect } from 'vitest';
import {
  createStockStore,
  addStockItem,
  updateOnHand,
  checkAvailability,
  getShortfalls,
  formatAvailabilityReport,
} from '../../src/engine/stock-tracker';
import type { StockItem, DemandEntry } from '../../src/engine/stock-tracker';

function item(materialKey: string, onHandQty: number, reorderLevel?: number): StockItem {
  return {
    materialKey,
    label: { en: materialKey, he: materialKey },
    onHandQty,
    unit: 'sheet',
    reorderLevel,
  };
}

describe('createStockStore', () => {
  it('creates an empty store', () => {
    expect(createStockStore().items).toHaveLength(0);
  });
});

describe('addStockItem', () => {
  it('adds a new item', () => {
    const store = addStockItem(createStockStore(), item('MDF-18', 10));
    expect(store.items).toHaveLength(1);
  });

  it('replaces existing item with same key', () => {
    let store = addStockItem(createStockStore(), item('MDF-18', 10));
    store = addStockItem(store, item('MDF-18', 15));
    expect(store.items).toHaveLength(1);
    expect(store.items[0].onHandQty).toBe(15);
  });
});

describe('updateOnHand', () => {
  it('updates quantity for existing key', () => {
    let store = addStockItem(createStockStore(), item('PLY-12', 5));
    store = updateOnHand(store, 'PLY-12', 8);
    expect(store.items[0].onHandQty).toBe(8);
  });

  it('returns unchanged store for unknown key', () => {
    const store = createStockStore();
    const after = updateOnHand(store, 'ghost', 3);
    expect(after).toBe(store);
  });
});

describe('checkAvailability — ok', () => {
  it('returns ok when stock covers demand', () => {
    const store = addStockItem(createStockStore(), item('MDF-18', 10));
    const demand: DemandEntry[] = [{ materialKey: 'MDF-18', requiredQty: 5 }];
    const results = checkAvailability(store, demand);
    expect(results[0].status).toBe('ok');
    expect(results[0].net).toBe(5);
  });
});

describe('checkAvailability — shortfall', () => {
  it('returns shortfall when stock is insufficient', () => {
    const store = addStockItem(createStockStore(), item('MDF-18', 2));
    const demand: DemandEntry[] = [{ materialKey: 'MDF-18', requiredQty: 5 }];
    const results = checkAvailability(store, demand);
    expect(results[0].status).toBe('shortfall');
    expect(results[0].net).toBe(-3);
  });
});

describe('checkAvailability — unknown', () => {
  it('returns unknown for items not in store', () => {
    const store = createStockStore();
    const demand: DemandEntry[] = [{ materialKey: 'oak-veneer', requiredQty: 2 }];
    const results = checkAvailability(store, demand);
    expect(results[0].status).toBe('unknown');
  });
});

describe('checkAvailability — low', () => {
  it('returns low when on-hand is at reorder level', () => {
    const store = addStockItem(createStockStore(), item('MDF-18', 3, 3)); // reorderLevel=3, onHand=3
    const demand: DemandEntry[] = [{ materialKey: 'MDF-18', requiredQty: 1 }]; // net=2, so status is ok without reorder?
    // onHand(3) - required(1) = 2, net>=0 → not shortfall; onHand(3) <= reorderLevel(3) → low
    const results = checkAvailability(store, demand);
    expect(results[0].status).toBe('low');
  });
});

describe('getShortfalls', () => {
  it('returns only shortfall and unknown entries', () => {
    const store = addStockItem(addStockItem(createStockStore(), item('MDF', 10)), item('PLY', 1));
    const demand: DemandEntry[] = [
      { materialKey: 'MDF', requiredQty: 5 },
      { materialKey: 'PLY', requiredQty: 5 },
      { materialKey: 'oak', requiredQty: 2 },
    ];
    const results = checkAvailability(store, demand);
    const shortfalls = getShortfalls(results);
    expect(shortfalls.length).toBe(2); // PLY (shortfall) + oak (unknown)
  });
});

describe('formatAvailabilityReport', () => {
  it('returns "No demand entries." for empty input', () => {
    expect(formatAvailabilityReport([])).toBe('No demand entries.');
  });

  it('includes status and material key in output', () => {
    const store = addStockItem(createStockStore(), item('MDF-18', 5));
    const results = checkAvailability(store, [{ materialKey: 'MDF-18', requiredQty: 3 }]);
    const text = formatAvailabilityReport(results);
    expect(text).toContain('[OK]');
    expect(text).toContain('MDF-18');
  });
});
