import { describe, it, expect } from 'vitest';
import {
  MANUFACTURER_API_VERSION,
  validateManufacturerInfo,
  validateManufacturerMaterial,
  validateManufacturerCatalog,
  filterMaterials,
  mergeCatalogs,
} from '../../src/engine/manufacturer-catalog';
import type { ManufacturerCatalog, ManufacturerMaterial } from '../../src/engine/manufacturer-catalog';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_INFO = { id: 'egger', name: 'EGGER', country: 'AT', website: 'https://egger.com' };

const VALID_MATERIAL: Record<string, unknown> = {
  sku: 'H3325-ST28',
  name: 'Tobacco Gladstone Oak',
  category: 'panel',
  thickness: 18,
  sheetWidth: 2800,
  sheetLength: 2070,
  pricePerSqM: 25.5,
  currency: 'EUR',
  regions: ['de', 'at', 'ch'],
  color: '#8B6C42',
  hasGrain: true,
  densityKgM3: 680,
  productUrl: 'https://egger.com/products/H3325-ST28',
  available: true,
};

const VALID_CATALOG: Record<string, unknown> = {
  apiVersion: MANUFACTURER_API_VERSION,
  generatedAt: '2026-05-27T00:00:00Z',
  manufacturer: VALID_INFO,
  materials: [VALID_MATERIAL],
};

// ─── validateManufacturerInfo ─────────────────────────────────────────────────

describe('validateManufacturerInfo', () => {
  it('accepts valid manufacturer info', () => {
    const result = validateManufacturerInfo(VALID_INFO);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('egger');
    expect(result!.country).toBe('at');
  });

  it.each([
    ['null', null],
    ['number', 42],
    ['missing id', { name: 'X', country: 'DE' }],
    ['missing name', { id: 'x', country: 'DE' }],
    ['missing country', { id: 'x', name: 'X' }],
    ['invalid country length', { id: 'x', name: 'X', country: 'DEU' }],
  ] as const)('rejects %s', (_label, input) => {
    expect(validateManufacturerInfo(input)).toBeNull();
  });

  it('includes optional logoUrl only if https', () => {
    const withLogo = { ...VALID_INFO, logoUrl: 'https://cdn.egger.com/logo.png' };
    expect(validateManufacturerInfo(withLogo)!.logoUrl).toBe('https://cdn.egger.com/logo.png');

    const httpLogo = { ...VALID_INFO, logoUrl: 'http://insecure.com/logo.png' };
    expect(validateManufacturerInfo(httpLogo)!.logoUrl).toBeUndefined();
  });
});

// ─── validateManufacturerMaterial ─────────────────────────────────────────────

describe('validateManufacturerMaterial', () => {
  it('accepts valid material', () => {
    const result = validateManufacturerMaterial(VALID_MATERIAL);
    expect(result).not.toBeNull();
    expect(result!.sku).toBe('H3325-ST28');
    expect(result!.thickness).toBe(18);
    expect(result!.regions).toEqual(['de', 'at', 'ch']);
  });

  it.each([
    ['null', null],
    ['missing sku', { ...VALID_MATERIAL, sku: undefined }],
    ['invalid category', { ...VALID_MATERIAL, category: 'unknown' }],
    ['zero thickness', { ...VALID_MATERIAL, thickness: 0 }],
    ['negative price', { ...VALID_MATERIAL, pricePerSqM: -1 }],
    ['missing currency', { ...VALID_MATERIAL, currency: undefined }],
    ['non-array regions', { ...VALID_MATERIAL, regions: 'de' }],
    ['missing hasGrain', { ...VALID_MATERIAL, hasGrain: undefined }],
    ['missing available', { ...VALID_MATERIAL, available: undefined }],
  ] as const)('rejects %s', (_label, input) => {
    expect(validateManufacturerMaterial(input)).toBeNull();
  });

  it('omits productUrl if not https', () => {
    const mat = { ...VALID_MATERIAL, productUrl: 'http://insecure.com/product' };
    const result = validateManufacturerMaterial(mat);
    expect(result!.productUrl).toBeUndefined();
  });

  it('includes optional fields when valid', () => {
    const result = validateManufacturerMaterial(VALID_MATERIAL)!;
    expect(result.sheetWidth).toBe(2800);
    expect(result.sheetLength).toBe(2070);
    expect(result.densityKgM3).toBe(680);
    expect(result.color).toBe('#8B6C42');
  });
});

// ─── validateManufacturerCatalog ──────────────────────────────────────────────

describe('validateManufacturerCatalog', () => {
  it('accepts valid catalog', () => {
    const result = validateManufacturerCatalog(VALID_CATALOG);
    expect(result).not.toBeNull();
    expect(result!.manufacturer.id).toBe('egger');
    expect(result!.materials).toHaveLength(1);
  });

  it.each([
    ['null', null],
    ['missing apiVersion', { ...VALID_CATALOG, apiVersion: undefined }],
    ['missing generatedAt', { ...VALID_CATALOG, generatedAt: undefined }],
    ['invalid manufacturer', { ...VALID_CATALOG, manufacturer: null }],
    ['non-array materials', { ...VALID_CATALOG, materials: 'not-array' }],
    ['empty materials', { ...VALID_CATALOG, materials: [] }],
  ] as const)('rejects %s', (_label, input) => {
    expect(validateManufacturerCatalog(input)).toBeNull();
  });

  it('skips invalid materials but keeps valid ones', () => {
    const catalog = {
      ...VALID_CATALOG,
      materials: [VALID_MATERIAL, { invalid: true }, VALID_MATERIAL],
    };
    const result = validateManufacturerCatalog(catalog);
    expect(result!.materials).toHaveLength(2);
  });
});

// ─── filterMaterials ──────────────────────────────────────────────────────────

describe('filterMaterials', () => {
  const materials: ManufacturerMaterial[] = [
    {
      sku: 'A',
      name: 'Mat A',
      category: 'panel',
      thickness: 18,
      pricePerSqM: 20,
      currency: 'EUR',
      regions: ['de'],
      hasGrain: true,
      available: true,
    },
    {
      sku: 'B',
      name: 'Mat B',
      category: 'veneer',
      thickness: 3,
      pricePerSqM: 45,
      currency: 'EUR',
      regions: ['de', 'us'],
      hasGrain: true,
      available: false,
    },
    {
      sku: 'C',
      name: 'Mat C',
      category: 'panel',
      thickness: 25,
      pricePerSqM: 30,
      currency: 'USD',
      regions: ['us'],
      hasGrain: false,
      available: true,
    },
  ];

  it('returns all when no filter applied', () => {
    expect(filterMaterials(materials, {})).toHaveLength(3);
  });

  it('filters by region', () => {
    expect(filterMaterials(materials, { region: 'us' })).toHaveLength(2);
    expect(filterMaterials(materials, { region: 'DE' })).toHaveLength(2); // case-insensitive
  });

  it('filters by category', () => {
    expect(filterMaterials(materials, { category: 'panel' })).toHaveLength(2);
    expect(filterMaterials(materials, { category: 'veneer' })).toHaveLength(1);
  });

  it('filters by thickness range', () => {
    expect(filterMaterials(materials, { minThickness: 10 })).toHaveLength(2);
    expect(filterMaterials(materials, { maxThickness: 18 })).toHaveLength(2);
    expect(filterMaterials(materials, { minThickness: 10, maxThickness: 20 })).toHaveLength(1);
  });

  it('filters by availability', () => {
    expect(filterMaterials(materials, { availableOnly: true })).toHaveLength(2);
  });

  it('combines multiple filters', () => {
    expect(filterMaterials(materials, { region: 'de', category: 'panel', availableOnly: true })).toHaveLength(1);
  });
});

// ─── mergeCatalogs ────────────────────────────────────────────────────────────

describe('mergeCatalogs', () => {
  const cat1: ManufacturerCatalog = {
    apiVersion: MANUFACTURER_API_VERSION,
    generatedAt: '2026-01-01T00:00:00Z',
    manufacturer: { id: 'egger', name: 'EGGER', country: 'at' },
    materials: [
      {
        sku: 'A1',
        name: 'Mat',
        category: 'panel',
        thickness: 18,
        pricePerSqM: 20,
        currency: 'EUR',
        regions: ['de'],
        hasGrain: true,
        available: true,
      },
    ],
  };

  const cat2: ManufacturerCatalog = {
    apiVersion: MANUFACTURER_API_VERSION,
    generatedAt: '2026-01-01T00:00:00Z',
    manufacturer: { id: 'kronospan', name: 'Kronospan', country: 'at' },
    materials: [
      {
        sku: 'K1',
        name: 'KMat',
        category: 'laminate',
        thickness: 8,
        pricePerSqM: 15,
        currency: 'EUR',
        regions: ['de'],
        hasGrain: false,
        available: true,
      },
    ],
  };

  it('flattens materials from multiple catalogs', () => {
    const result = mergeCatalogs([cat1, cat2]);
    expect(result).toHaveLength(2);
  });

  it('prefixes SKU with manufacturer ID', () => {
    const result = mergeCatalogs([cat1, cat2]);
    expect(result[0].sku).toBe('egger/A1');
    expect(result[1].sku).toBe('kronospan/K1');
  });

  it('handles empty catalog array', () => {
    expect(mergeCatalogs([])).toHaveLength(0);
  });
});
