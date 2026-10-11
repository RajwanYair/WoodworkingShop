import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  applyHardwareCatalogImport,
  parseHardwareCatalog,
  type HardwareCatalogImportMode,
  type HardwareItem,
} from '../engine/hardware-catalog';

interface CustomHardwareState {
  items: HardwareItem[];
  importCatalog: (raw: unknown, mode: HardwareCatalogImportMode) => void;
}

export const useCustomHardwareStore = create<CustomHardwareState>()(
  persist(
    (set) => ({
      items: [],
      importCatalog: (raw, mode) => {
        const imported = parseHardwareCatalog(raw);
        set((state) => ({
          items: applyHardwareCatalogImport(state.items, imported, mode),
        }));
      },
    }),
    { name: 'custom-hardware' },
  ),
);
