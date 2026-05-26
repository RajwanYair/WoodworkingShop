import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  addStockItem as engineAddStockItem,
  updateOnHand as engineUpdateOnHand,
  createStockStore,
  type StockItem,
  type StockStore,
} from '../engine/stock-tracker';

interface StockTrackerState {
  stockStore: StockStore;
  addOrUpdateItem: (item: StockItem) => void;
  setOnHand: (materialKey: string, qty: number) => void;
  removeItem: (materialKey: string) => void;
  clearAll: () => void;
}

export const useStockTrackerStore = create<StockTrackerState>()(
  persist(
    (set) => ({
      stockStore: createStockStore(),

      addOrUpdateItem: (item) =>
        set((s) => ({ stockStore: engineAddStockItem(s.stockStore, item) })),

      setOnHand: (materialKey, qty) =>
        set((s) => ({ stockStore: engineUpdateOnHand(s.stockStore, materialKey, qty) })),

      removeItem: (materialKey) =>
        set((s) => ({
          stockStore: { items: s.stockStore.items.filter((i) => i.materialKey !== materialKey) },
        })),

      clearAll: () => set({ stockStore: createStockStore() }),
    }),
    { name: 'woodworkingshop:stocktracker' },
  ),
);
