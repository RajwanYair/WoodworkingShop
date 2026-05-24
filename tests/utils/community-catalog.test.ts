/**
 * Community Material Catalog — Future Horizons / Sprint 13
 *
 * Tests for src/utils/community-catalog.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateCatalog,
  fetchCommunityMaterials,
  loadCachedCommunityMaterials,
  clearCommunityMaterialsCache,
  getCommunityMaterialsByRegion,
  mergeMaterialCatalogs,
  DEFAULT_CATALOG_URL,
} from '../../src/utils/community-catalog';
import { MATERIALS } from '../../src/engine/materials';
import type { CommunityMaterial, CommunityCatalog } from '../../src/utils/community-catalog';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeMaterial(key: string, region?: string): CommunityMaterial {
  return {
    key,
    name: { en: `Mat ${key}`, he: `חומר ${key}` },
    thickness: 18,
    sheetWidth: 1220,
    sheetLength: 2440,
    pricePerSheet: 100,
    currencyCode: 'USD',
    category: 'panel',
    color: '#ffffff',
    hasGrain: false,
    densityKgM3: 650,
    region,
  };
}

function makeCatalog(materials: CommunityMaterial[] = []): CommunityCatalog {
  return { version: '1', updatedAt: '2025-01-01T00:00:00Z', materials };
}

function makeFetch(catalog: CommunityCatalog, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => catalog,
  }) as unknown as typeof fetch;
}

// ── DEFAULT_CATALOG_URL ───────────────────────────────────────────────────────

describe('DEFAULT_CATALOG_URL', () => {
  it('is a non-empty string', () => {
    expect(typeof DEFAULT_CATALOG_URL).toBe('string');
    expect(DEFAULT_CATALOG_URL.length).toBeGreaterThan(0);
  });
});

// ── validateCatalog ───────────────────────────────────────────────────────────

describe('validateCatalog', () => {
  it('accepts valid catalog', () => {
    const raw = { version: '1', updatedAt: '2025-01-01T00:00:00Z', materials: [makeMaterial('x')] };
    expect(() => validateCatalog(raw)).not.toThrow();
  });

  it('throws on non-object input', () => {
    expect(() => validateCatalog('string')).toThrow();
    expect(() => validateCatalog(null)).toThrow();
  });

  it('throws when version missing', () => {
    expect(() => validateCatalog({ materials: [] })).toThrow('version');
  });

  it('throws when materials missing', () => {
    expect(() => validateCatalog({ version: '1' })).toThrow('materials');
  });

  it('filters out invalid material entries silently', () => {
    const raw = {
      version: '1',
      materials: [makeMaterial('valid'), { not: 'a material' }, makeMaterial('also-valid')],
    };
    const result = validateCatalog(raw);
    expect(result.materials).toHaveLength(2);
  });

  it('uses current timestamp when updatedAt missing', () => {
    const result = validateCatalog({ version: '1', materials: [] });
    expect(typeof result.updatedAt).toBe('string');
  });
});

// ── fetchCommunityMaterials ───────────────────────────────────────────────────

describe('fetchCommunityMaterials', () => {
  beforeEach(() => clearCommunityMaterialsCache());

  it('returns a validated catalog on success', async () => {
    const catalog = makeCatalog([makeMaterial('plywood-us')]);
    const catalog2 = await fetchCommunityMaterials('https://example.com', makeFetch(catalog));
    expect(catalog2.materials).toHaveLength(1);
    expect(catalog2.materials[0].key).toBe('plywood-us');
  });

  it('persists materials to IDB cache', async () => {
    const catalog = makeCatalog([makeMaterial('cached-mat')]);
    await fetchCommunityMaterials('https://example.com', makeFetch(catalog));
    const { materials } = await loadCachedCommunityMaterials();
    expect(materials.find((m) => m.key === 'cached-mat')).toBeDefined();
  });

  it('stores fetch metadata in IDB', async () => {
    const catalog = makeCatalog([]);
    await fetchCommunityMaterials('https://example.com', makeFetch(catalog));
    const { meta } = await loadCachedCommunityMaterials();
    expect(meta).not.toBeNull();
    expect(meta!.url).toBe('https://example.com');
    expect(meta!.version).toBe('1');
    expect(typeof meta!.fetchedAt).toBe('number');
  });

  it('throws on non-OK HTTP response', async () => {
    const badFetch = makeFetch(makeCatalog(), 404);
    await expect(fetchCommunityMaterials('https://x.com', badFetch)).rejects.toThrow('HTTP 404');
  });
});

// ── loadCachedCommunityMaterials ──────────────────────────────────────────────

describe('loadCachedCommunityMaterials', () => {
  beforeEach(() => clearCommunityMaterialsCache());

  it('returns empty array and null meta when cache is empty', async () => {
    const { materials, meta } = await loadCachedCommunityMaterials();
    expect(materials).toEqual([]);
    expect(meta).toBeNull();
  });

  it('returns previously fetched materials', async () => {
    const catalog = makeCatalog([makeMaterial('cached-x')]);
    await fetchCommunityMaterials('https://test', makeFetch(catalog));
    const { materials } = await loadCachedCommunityMaterials();
    expect(materials[0].key).toBe('cached-x');
  });
});

// ── clearCommunityMaterialsCache ──────────────────────────────────────────────

describe('clearCommunityMaterialsCache', () => {
  it('clears materials and meta', async () => {
    await fetchCommunityMaterials('https://test', makeFetch(makeCatalog([makeMaterial('x')])));
    await clearCommunityMaterialsCache();
    const { materials, meta } = await loadCachedCommunityMaterials();
    expect(materials).toHaveLength(0);
    expect(meta).toBeNull();
  });
});

// ── getCommunityMaterialsByRegion ─────────────────────────────────────────────

describe('getCommunityMaterialsByRegion', () => {
  const mats: CommunityMaterial[] = [
    makeMaterial('global'), // no region
    makeMaterial('us-ply', 'us'),
    makeMaterial('de-ply', 'de'),
    makeMaterial('IL-ply', 'IL'), // mixed case
  ];

  it('returns global + matching region materials', () => {
    const result = getCommunityMaterialsByRegion(mats, 'us');
    const keys = result.map((m) => m.key);
    expect(keys).toContain('global');
    expect(keys).toContain('us-ply');
    expect(keys).not.toContain('de-ply');
  });

  it('is case-insensitive', () => {
    const result = getCommunityMaterialsByRegion(mats, 'il');
    expect(result.map((m) => m.key)).toContain('IL-ply');
  });

  it('returns only global materials for unknown region', () => {
    const result = getCommunityMaterialsByRegion(mats, 'au');
    expect(result.map((m) => m.key)).toEqual(['global']);
  });

  it('returns empty when input empty', () => {
    expect(getCommunityMaterialsByRegion([], 'us')).toHaveLength(0);
  });
});

// ── mergeMaterialCatalogs ─────────────────────────────────────────────────────

describe('mergeMaterialCatalogs', () => {
  it('returns built-in materials unchanged when community is empty', () => {
    const result = mergeMaterialCatalogs(MATERIALS, []);
    expect(result).toHaveLength(MATERIALS.length);
  });

  it('overrides built-in price when community has same key', () => {
    const override = { ...makeMaterial('plywood-18'), pricePerSheet: 9999 };
    const result = mergeMaterialCatalogs(MATERIALS, [override]);
    const mat = result.find((m) => m.key === 'plywood-18');
    expect(mat?.pricePerSheet).toBe(9999);
  });

  it('preserves built-in order and places new materials after', () => {
    const newMat = makeMaterial('brand-new');
    const result = mergeMaterialCatalogs(MATERIALS, [newMat]);
    expect(result.length).toBe(MATERIALS.length + 1);
    expect(result[result.length - 1].key).toBe('brand-new');
  });

  it('does not mutate the built-in materials array', () => {
    const originalLength = MATERIALS.length;
    mergeMaterialCatalogs(MATERIALS, [makeMaterial('new-mat')]);
    expect(MATERIALS).toHaveLength(originalLength);
  });

  it('deduplications community entries: same key appears only once', () => {
    const dup = [makeMaterial('plywood-18'), makeMaterial('plywood-18')];
    const result = mergeMaterialCatalogs(MATERIALS, dup);
    const matches = result.filter((m) => m.key === 'plywood-18');
    expect(matches).toHaveLength(1);
  });

  it('handles empty built-in with community materials', () => {
    const result = mergeMaterialCatalogs([], [makeMaterial('solo')]);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('solo');
  });
});
