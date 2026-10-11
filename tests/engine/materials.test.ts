import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { propertyRunOptions } from '../property-seeds';
import BIRCH_PANEL_WEIGHT_ORACLE from '../fixtures/oracles/birch-panel-weight.json';
import {
  MATERIALS,
  SAW_KERF,
  getMaterial,
  getMaterialResult,
  computePartWeightKg,
  panelMaterials,
  backMaterials,
  DEFAULT_CONFIG,
  CONSTRAINTS,
} from '../../src/engine/materials';

describe('computePartWeightKg', () => {
  it.each(BIRCH_PANEL_WEIGHT_ORACLE.densityCases)(
    'matches the sourced 18 mm birch panel weight at $densityKgM3 kg/m³',
    ({ densityKgM3, expectedWeightKg }) => {
      const { lengthMm, widthMm, thicknessMm, quantity } = BIRCH_PANEL_WEIGHT_ORACLE.panel;

      expect(computePartWeightKg(lengthMm, widthMm, thicknessMm, quantity, densityKgM3)).toBe(expectedWeightKg);
    },
  );

  it('matches an independently converted SI volume-density reference', () => {
    const expectedKg = 0.6 * 0.3 * 0.018 * 2 * 640;

    expect(computePartWeightKg(600, 300, 18, 2, 640)).toBeCloseTo(expectedKg, 10);
  });

  it('matches converted cubic-meter volume across generated positive dimensions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3000 }),
        fc.integer({ min: 1, max: 2000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 100, max: 2500 }),
        (lengthMm, widthMm, thicknessMm, quantity, densityKgM3) => {
          const expectedKg = (lengthMm / 1000) * (widthMm / 1000) * (thicknessMm / 1000) * quantity * densityKgM3;

          expect(computePartWeightKg(lengthMm, widthMm, thicknessMm, quantity, densityKgM3)).toBeCloseTo(
            expectedKg,
            10,
          );
        },
      ),
      propertyRunOptions('tests/engine/materials.test.ts', 200),
    );
  });
});

describe('materials', () => {
  it('initializes a complete, unique built-in catalogue', async () => {
    vi.resetModules();
    try {
      const {
        MATERIALS: catalog,
        DEFAULT_CONFIG: defaultConfig,
        BOOKSHELF_DEFAULTS: bookshelfDefaults,
        DESK_DEFAULTS: deskDefaults,
        WARDROBE_DEFAULTS: wardrobeDefaults,
        PANEL_DEFAULTS: panelDefaults,
        CABINET_DEFAULTS: cabinetDefaults,
      } = await import('../../src/engine/materials');
      const keys = catalog.map((material) => material.key);

      expect(catalog).toHaveLength(12);
      expect(new Set(keys).size).toBe(12);
      expect(catalog.filter((material) => material.category === 'panel')).toHaveLength(9);
      expect(catalog.filter((material) => material.category === 'back')).toHaveLength(2);
      expect(catalog.filter((material) => material.category === 'door')).toHaveLength(1);
      expect(catalog.filter((material) => material.hasGrain).map((material) => material.key)).toEqual([
        'plywood-17',
        'plywood-18',
        'osb-18',
        'plywood-4',
      ]);
      expect(
        catalog.every(
          (material) =>
            material.key.length > 0 &&
            material.name.en.trim().length > 0 &&
            material.name.he.trim().length > 0 &&
            material.color.length > 0 &&
            material.thickness > 0 &&
            material.sheetWidth > 0 &&
            material.sheetLength > 0 &&
            material.currencyCode === 'ILS' &&
            (material.pricePerSheet ?? 0) > 0 &&
            material.densityKgM3 > 0,
        ),
      ).toBe(true);

      expect(defaultConfig).toMatchObject({
        furnitureType: 'cabinet',
        width: 1000,
        height: 2000,
        depth: 600,
        shelfCount: 4,
        shelfSpacing: 'equal',
        customShelfPositions: [],
        carcassMaterial: 'plywood-17',
        backPanelMaterial: 'plywood-4',
        hasBack: true,
        doorCount: 2,
        doorStyle: 'flat',
        drawerSlideType: 'standard',
        handleStyle: 'bar',
        edgeBanding: 'all-visible',
        cutMode: 'freeform',
        lang: 'en',
      });
      expect(bookshelfDefaults).toMatchObject({
        furnitureType: 'bookshelf',
        width: 800,
        height: 1800,
        depth: 300,
        shelfCount: 5,
        kickHeight: 0,
        doorStyle: 'none',
        handleStyle: 'none',
        edgeBanding: 'all-visible',
      });
      expect(deskDefaults).toMatchObject({
        furnitureType: 'desk',
        width: 1200,
        height: 750,
        depth: 600,
        shelfCount: 0,
        drawerCount: 0,
        kickHeight: 0,
        doorStyle: 'none',
        handleStyle: 'none',
        edgeBanding: 'all-visible',
      });
      expect(wardrobeDefaults).toMatchObject({
        furnitureType: 'wardrobe',
        width: 1000,
        height: 2100,
        depth: 600,
        shelfCount: 1,
        kickHeight: 100,
        doorStyle: 'flat',
        handleStyle: 'bar',
        edgeBanding: 'all-visible',
      });
      expect(panelDefaults).toMatchObject({
        furnitureType: 'panel',
        width: 600,
        height: 800,
        depth: 18,
        doorStyle: 'none',
        handleStyle: 'none',
        edgeBanding: 'all-visible',
        panelMaterialSource: 'carcass',
      });
      expect(cabinetDefaults).toMatchObject({
        furnitureType: 'cabinet',
        width: 600,
        height: 800,
        depth: 500,
        shelfCount: 2,
        doorCount: 1,
        doorStyle: 'flat',
        handleStyle: 'bar',
        kickHeight: 100,
      });
    } finally {
      vi.resetModules();
    }
  });

  it('has 12 materials total', () => {
    expect(MATERIALS).toHaveLength(12);
  });

  it('has 9 panel materials and 2 back materials', () => {
    expect(panelMaterials()).toHaveLength(9);
    expect(backMaterials()).toHaveLength(2);
  });

  it('SAW_KERF is 4 mm', () => {
    expect(SAW_KERF).toBe(4);
  });

  describe('getMaterial', () => {
    it('returns correct material by key', () => {
      const m = getMaterial('plywood-17');
      expect(m.thickness).toBe(17);
      expect(m.sheetWidth).toBe(1220);
      expect(m.sheetLength).toBe(2440);
      expect(m.category).toBe('panel');
    });

    it('looks up custom materials appended to the built-in catalogue', () => {
      const customMaterial = { ...MATERIALS[0], key: 'custom-get-material' };
      expect(getMaterial(customMaterial.key, [customMaterial])).toBe(customMaterial);
    });

    it('throws for unknown key', () => {
      expect(() => getMaterial('nonexistent')).toThrow('Unknown material');
    });
  });

  describe('getMaterialResult', () => {
    it('returns a successful result for a built-in material', () => {
      const material = MATERIALS.find((candidate) => candidate.key === 'plywood-17');
      const result = getMaterialResult('plywood-17');

      expect(material).toBeDefined();
      expect(result).toEqual({ ok: true, value: material });
    });

    it('looks up custom materials appended to the built-in catalogue', () => {
      const customMaterial = { ...MATERIALS[0], key: 'custom-panel' };

      expect(getMaterialResult(customMaterial.key, [customMaterial])).toEqual({ ok: true, value: customMaterial });
    });

    it('returns an explicit error result for an unknown key', () => {
      expect(getMaterialResult('missing-material')).toEqual({
        ok: false,
        error: 'Unknown material: missing-material',
      });
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('has valid default dimensions', () => {
      expect(DEFAULT_CONFIG.width).toBe(1000);
      expect(DEFAULT_CONFIG.height).toBe(2000);
      expect(DEFAULT_CONFIG.depth).toBe(600);
    });

    it('defaults within constraints', () => {
      expect(DEFAULT_CONFIG.width).toBeGreaterThanOrEqual(CONSTRAINTS.minWidth);
      expect(DEFAULT_CONFIG.width).toBeLessThanOrEqual(CONSTRAINTS.maxWidth);
      expect(DEFAULT_CONFIG.height).toBeGreaterThanOrEqual(CONSTRAINTS.minHeight);
      expect(DEFAULT_CONFIG.height).toBeLessThanOrEqual(CONSTRAINTS.maxHeight);
      expect(DEFAULT_CONFIG.depth).toBeGreaterThanOrEqual(CONSTRAINTS.minDepth);
      expect(DEFAULT_CONFIG.depth).toBeLessThanOrEqual(CONSTRAINTS.maxDepth);
    });
  });

  it.each(MATERIALS.map((m) => [m.key, m]))('%s has bilingual name', (_key, m) => {
    expect(m.name.en).toBeTruthy();
    expect(m.name.he).toBeTruthy();
  });
});
