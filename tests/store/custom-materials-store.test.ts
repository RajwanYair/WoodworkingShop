import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock zustand persist middleware as a passthrough so localStorage isn't needed
vi.mock('zustand/middleware', async () => {
  const actual = await vi.importActual<typeof import('zustand/middleware')>('zustand/middleware');
  return {
    ...actual,
    persist: (fn: any) => fn,
  };
});

import { useCustomMaterialsStore, getCustomPanelMaterials, getCustomBackMaterials } from '../../src/store/custom-materials-store';
import type { Material } from '../../src/engine/types';

const panelMaterial: Material = {
  key: 'custom-oak-20',
  name: { en: 'Oak 20 mm', he: 'אלון 20 מ"מ' },
  thickness: 20,
  sheetWidth: 1220,
  sheetLength: 2440,
  pricePerSheet: 350,
  category: 'panel',
  color: '#A0784C',
};

const backMaterial: Material = {
  key: 'custom-back-5',
  name: { en: 'Custom Back 5 mm', he: 'גב מותאם 5 מ"מ' },
  thickness: 5,
  sheetWidth: 1220,
  sheetLength: 2440,
  pricePerSheet: 80,
  category: 'back',
  color: '#D4B87A',
};

describe('custom-materials-store', () => {
  beforeEach(() => {
    // Reset store to empty
    useCustomMaterialsStore.setState({ materials: [] });
  });

  it('starts with empty materials', () => {
    expect(useCustomMaterialsStore.getState().materials).toHaveLength(0);
  });

  it('addMaterial adds a material', () => {
    useCustomMaterialsStore.getState().addMaterial(panelMaterial);
    expect(useCustomMaterialsStore.getState().materials).toHaveLength(1);
    expect(useCustomMaterialsStore.getState().materials[0].key).toBe('custom-oak-20');
  });

  it('removeMaterial removes by key', () => {
    useCustomMaterialsStore.getState().addMaterial(panelMaterial);
    useCustomMaterialsStore.getState().addMaterial(backMaterial);
    useCustomMaterialsStore.getState().removeMaterial('custom-oak-20');
    expect(useCustomMaterialsStore.getState().materials).toHaveLength(1);
    expect(useCustomMaterialsStore.getState().materials[0].key).toBe('custom-back-5');
  });

  it('updateMaterial patches a material', () => {
    useCustomMaterialsStore.getState().addMaterial(panelMaterial);
    useCustomMaterialsStore.getState().updateMaterial('custom-oak-20', { pricePerSheet: 400 });
    expect(useCustomMaterialsStore.getState().materials[0].pricePerSheet).toBe(400);
  });

  it('updateMaterial does not affect other materials', () => {
    useCustomMaterialsStore.getState().addMaterial(panelMaterial);
    useCustomMaterialsStore.getState().addMaterial(backMaterial);
    useCustomMaterialsStore.getState().updateMaterial('custom-oak-20', { thickness: 22 });
    expect(useCustomMaterialsStore.getState().materials[1].thickness).toBe(5);
  });

  it('getCustomPanelMaterials returns only panels', () => {
    useCustomMaterialsStore.getState().addMaterial(panelMaterial);
    useCustomMaterialsStore.getState().addMaterial(backMaterial);
    const panels = getCustomPanelMaterials();
    expect(panels).toHaveLength(1);
    expect(panels[0].category).toBe('panel');
  });

  it('getCustomBackMaterials returns only backs', () => {
    useCustomMaterialsStore.getState().addMaterial(panelMaterial);
    useCustomMaterialsStore.getState().addMaterial(backMaterial);
    const backs = getCustomBackMaterials();
    expect(backs).toHaveLength(1);
    expect(backs[0].category).toBe('back');
  });
});
