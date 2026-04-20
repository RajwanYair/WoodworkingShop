import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Material } from '../engine/types';

interface CustomMaterialsState {
  materials: Material[];
  addMaterial: (m: Material) => void;
  removeMaterial: (key: string) => void;
  updateMaterial: (key: string, patch: Partial<Material>) => void;
}

export const useCustomMaterialsStore = create<CustomMaterialsState>()(
  persist(
    (set) => ({
      materials: [],
      addMaterial: (m) => set((s) => ({ materials: [...s.materials, m] })),
      removeMaterial: (key) => set((s) => ({ materials: s.materials.filter((m) => m.key !== key) })),
      updateMaterial: (key, patch) =>
        set((s) => ({
          materials: s.materials.map((m) => (m.key === key ? { ...m, ...patch } : m)),
        })),
    }),
    { name: 'custom-materials' },
  ),
);

export function getCustomPanelMaterials(): Material[] {
  return useCustomMaterialsStore.getState().materials.filter((m) => m.category === 'panel');
}

export function getCustomBackMaterials(): Material[] {
  return useCustomMaterialsStore.getState().materials.filter((m) => m.category === 'back');
}
