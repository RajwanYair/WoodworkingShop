import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStockTrackerStore } from '../../src/store/stock-tracker-store';
import type { StockItem } from '../../src/engine/stock-tracker';

const birchStock: StockItem = {
  materialKey: 'birch-ply',
  label: { en: 'Birch plywood', he: 'דיקט ליבנה' },
  onHandQty: 4,
  unit: 'sheet',
  reorderLevel: 1,
};

describe('useStockTrackerStore', () => {
  beforeEach(() => {
    useStockTrackerStore.getState().clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds stock and replaces an item with the same material key', () => {
    const store = useStockTrackerStore.getState();
    store.addOrUpdateItem(birchStock);
    store.addOrUpdateItem({ ...birchStock, onHandQty: 6 });

    expect(useStockTrackerStore.getState().stockStore.items).toEqual([{ ...birchStock, onHandQty: 6 }]);
  });

  it('updates known stock without changing state for an unknown material', () => {
    const store = useStockTrackerStore.getState();
    store.addOrUpdateItem(birchStock);
    store.setOnHand('birch-ply', 2);
    const updatedStore = useStockTrackerStore.getState().stockStore;
    store.setOnHand('unknown', 10);

    expect(updatedStore.items[0]?.onHandQty).toBe(2);
    expect(useStockTrackerStore.getState().stockStore).toBe(updatedStore);
  });

  it('removes one material and clears all stock', () => {
    const store = useStockTrackerStore.getState();
    store.addOrUpdateItem(birchStock);
    store.addOrUpdateItem({ ...birchStock, materialKey: 'oak-ply' });
    store.removeItem('birch-ply');
    expect(useStockTrackerStore.getState().stockStore.items.map((item) => item.materialKey)).toEqual(['oak-ply']);

    useStockTrackerStore.getState().clearAll();
    expect(useStockTrackerStore.getState().stockStore.items).toEqual([]);
  });

  it('keeps stock changes usable when browser storage quota is exceeded', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    expect(() => useStockTrackerStore.getState().addOrUpdateItem(birchStock)).not.toThrow();
    expect(useStockTrackerStore.getState().stockStore.items).toEqual([birchStock]);
  });
});
