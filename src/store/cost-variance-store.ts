import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CostVarianceState {
  /** Map of materialKey → user-entered actual cost. */
  actualCosts: Record<string, number>;
  setActualCost: (materialKey: string, cost: number) => void;
  removeActualCost: (materialKey: string) => void;
  clearAll: () => void;
}

export const useCostVarianceStore = create<CostVarianceState>()(
  persist(
    (set) => ({
      actualCosts: {},
      setActualCost: (materialKey, cost) =>
        set((s) => ({ actualCosts: { ...s.actualCosts, [materialKey]: cost } })),
      removeActualCost: (materialKey) =>
        set((s) => {
          const next = { ...s.actualCosts };
          delete next[materialKey];
          return { actualCosts: next };
        }),
      clearAll: () => set({ actualCosts: {} }),
    }),
    { name: 'woodworkingshop:costvariance' },
  ),
);
