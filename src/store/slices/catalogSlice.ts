import type { DefectZone, OffcutEntry } from '../../engine/core/types';

export type CatalogSlice = {
  offcutCatalog: OffcutEntry[];
  defectZones: Record<string, DefectZone[]>;
  setOffcutCatalog: (catalog: OffcutEntry[]) => void;
  addOffcutEntry: (entry: OffcutEntry) => void;
  removeOffcutEntry: (id: string) => void;
  addDefectZone: (materialKey: string, zone: DefectZone) => void;
  updateDefectZone: (materialKey: string, zoneIndex: number, zone: DefectZone) => void;
  removeDefectZone: (materialKey: string, zoneIndex: number) => void;
};

type CatalogSet = (partial: Partial<CatalogSlice> | ((state: CatalogSlice) => Partial<CatalogSlice>)) => void;
type CatalogGet = () => CatalogSlice;

export function createCatalogSlice(
  set: CatalogSet,
  get: CatalogGet,
  setOffcuts: (entries: OffcutEntry[]) => void,
  setDefects: (zones: Record<string, DefectZone[]>) => void,
  onDefectsChanged: () => void,
): CatalogSlice {
  return {
    offcutCatalog: [],
    defectZones: {},
    setOffcutCatalog: (catalog) => {
      setOffcuts(catalog);
      set({ offcutCatalog: catalog });
    },
    addOffcutEntry: (entry) => {
      const catalog = [...get().offcutCatalog, entry];
      setOffcuts(catalog);
      set({ offcutCatalog: catalog });
    },
    removeOffcutEntry: (id) => {
      const catalog = get().offcutCatalog.filter((entry) => entry.id !== id);
      setOffcuts(catalog);
      set({ offcutCatalog: catalog });
    },
    addDefectZone: (materialKey, zone) => {
      const current = get().defectZones;
      const defectZones = { ...current, [materialKey]: [...(current[materialKey] ?? []), zone] };
      setDefects(defectZones);
      set({ defectZones });
      onDefectsChanged();
    },
    updateDefectZone: (materialKey, zoneIndex, zone) => {
      const current = get().defectZones[materialKey] ?? [];
      if (!Number.isInteger(zoneIndex) || zoneIndex < 0 || zoneIndex >= current.length) return;
      const updated = current.map((existing, index) => (index === zoneIndex ? zone : existing));
      const defectZones = { ...get().defectZones, [materialKey]: updated };
      setDefects(defectZones);
      set({ defectZones });
      onDefectsChanged();
    },
    removeDefectZone: (materialKey, zoneIndex) => {
      const current = get().defectZones[materialKey] ?? [];
      if (!Number.isInteger(zoneIndex) || zoneIndex < 0 || zoneIndex >= current.length) return;
      const updated = current.filter((_, index) => index !== zoneIndex);
      const defectZones = { ...get().defectZones, [materialKey]: updated };
      setDefects(defectZones);
      set({ defectZones });
      onDefectsChanged();
    },
  };
}
