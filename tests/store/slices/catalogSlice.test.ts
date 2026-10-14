import { describe, expect, it, vi } from 'vitest';
import { createCatalogSlice, type CatalogSlice } from '../../../src/store/slices/catalogSlice';
import type { DefectZone, OffcutEntry } from '../../../src/engine/core/types';

function makeSlice() {
  let state: CatalogSlice;
  const set = (partial: Partial<CatalogSlice> | ((current: CatalogSlice) => Partial<CatalogSlice>)) => {
    const patch = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...patch };
  };
  const setOffcuts = vi.fn();
  const setDefects = vi.fn();
  const onDefectsChanged = vi.fn();
  state = createCatalogSlice(set, () => state, setOffcuts, setDefects, onDefectsChanged);
  return { get: () => state, setOffcuts, setDefects, onDefectsChanged };
}

describe('catalog slice', () => {
  it('updates offcuts in the slice and synchronizes the worker catalog', () => {
    const slice = makeSlice();
    const offcut: OffcutEntry = {
      id: 'offcut-1',
      material: 'mdf18',
      width: 200,
      length: 400,
      thickness: 18,
      addedAt: 1,
    };

    slice.get().addOffcutEntry(offcut);
    expect(slice.get().offcutCatalog).toEqual([offcut]);
    expect(slice.setOffcuts).toHaveBeenLastCalledWith([offcut]);
    slice.get().removeOffcutEntry(offcut.id);
    expect(slice.get().offcutCatalog).toEqual([]);
    expect(slice.setOffcuts).toHaveBeenLastCalledWith([]);
  });

  it('updates, adds, and removes defect zones while synchronizing optimization', () => {
    const slice = makeSlice();
    const first: DefectZone = { x: 10, y: 20, width: 30, length: 40 };
    const replacement: DefectZone = { x: 50, y: 60, width: 70, length: 80 };

    slice.get().addDefectZone('oak', first);
    slice.get().updateDefectZone('oak', 0, replacement);
    expect(slice.get().defectZones.oak).toEqual([replacement]);
    slice.get().removeDefectZone('oak', 0);
    expect(slice.get().defectZones.oak).toEqual([]);
    expect(slice.setDefects).toHaveBeenLastCalledWith({ oak: [] });
    expect(slice.onDefectsChanged).toHaveBeenCalledTimes(3);
  });

  it('ignores invalid defect-zone indices without triggering worker updates', () => {
    const slice = makeSlice();

    slice.get().updateDefectZone('oak', 0, { x: 0, y: 0, width: 10, length: 10 });
    slice.get().removeDefectZone('oak', 0);

    expect(slice.setDefects).not.toHaveBeenCalled();
    expect(slice.onDefectsChanged).not.toHaveBeenCalled();
  });
});
