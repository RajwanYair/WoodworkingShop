/**
 * Community Material Catalog — Future Horizons / Sprint 13
 *
 * Fetches a crowd-sourced material price + availability catalog from a CDN
 * (default: the Cabinet Planner GitHub releases CDN).  The result is cached
 * in IndexedDB so the catalog is available offline after the first fetch.
 *
 * The community catalog can override built-in material prices and add new
 * regional materials.  Keys must be unique; community entries with the same
 * key as a built-in override the built-in price and name only.
 *
 * JSON schema (community-materials.json):
 * {
 *   "version": "1",
 *   "updatedAt": "2025-01-01T00:00:00Z",
 *   "materials": [
 *     {
 *       "key": "plywood-18-us",
 *       "name": { "en": "Birch Plywood 18mm (US)", "he": "..." },
 *       "thickness": 18,
 *       "sheetWidth": 1220, "sheetLength": 2440,
 *       "pricePerSheet": 85,
 *       "currencyCode": "USD",
 *       "category": "panel",
 *       "color": "#D4C4A0",
 *       "hasGrain": true,
 *       "densityKgM3": 640,
 *       "region": "us"
 *     }
 *   ]
 * }
 */

import { get, set, createStore } from 'idb-keyval';
import type { Material } from '../engine/types';

// ── IDB store ─────────────────────────────────────────────────────────────────
const catalogStore = createStore('cabinet-planner-community-catalog', 'catalog');
const CACHE_KEY = 'community-materials';
const META_KEY = 'community-materials-meta';

// ── Default CDN URL ───────────────────────────────────────────────────────────
export const DEFAULT_CATALOG_URL =
  'https://raw.githubusercontent.com/RajwanYair/WoodworkingShop/main/catalog/community-materials.json';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CommunityMaterial extends Material {
  /**
   * ISO 3166-1 alpha-2 region code, e.g. 'us', 'il', 'de'.
   * When absent, the material is treated as globally relevant.
   */
  region?: string;
  /** Community contributor handle. */
  contributor?: string;
}

export interface CommunityCatalog {
  /** Catalog schema version ('1'). */
  version: string;
  /** ISO timestamp of the last community update. */
  updatedAt: string;
  materials: CommunityMaterial[];
}

export interface CatalogCacheMeta {
  fetchedAt: number;
  url: string;
  version: string;
}

// ── Validation ────────────────────────────────────────────────────────────────

/** Validate that a raw JSON object looks like a CommunityCatalog. */
export function validateCatalog(raw: unknown): CommunityCatalog {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('Community catalog must be a JSON object');
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj['version'] !== 'string') throw new Error('Catalog missing version field');
  if (!Array.isArray(obj['materials'])) throw new Error('Catalog missing materials array');
  const materials = (obj['materials'] as unknown[]).filter(_isValidMaterial);
  return {
    version: obj['version'],
    updatedAt: typeof obj['updatedAt'] === 'string' ? obj['updatedAt'] : new Date().toISOString(),
    materials,
  };
}

function _isValidMaterial(m: unknown): m is CommunityMaterial {
  if (m === null || typeof m !== 'object') return false;
  const mat = m as Record<string, unknown>;
  return (
    typeof mat['key'] === 'string' && typeof mat['thickness'] === 'number' && typeof mat['pricePerSheet'] === 'number'
  );
}

// ── Fetch & cache ─────────────────────────────────────────────────────────────

/**
 * Fetch the community catalog from a URL and persist it to IndexedDB.
 *
 * @param url  Catalog URL (default: {@link DEFAULT_CATALOG_URL}).
 * @param fetchImpl  Inject a fetch implementation (used in tests).
 * @returns Validated {@link CommunityCatalog}.
 * @throws On network error or invalid JSON shape.
 */
export async function fetchCommunityMaterials(
  url: string = DEFAULT_CATALOG_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<CommunityCatalog> {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Community catalog fetch failed: HTTP ${response.status}`);
  }
  const raw = (await response.json()) as unknown;
  const catalog = validateCatalog(raw);

  // Persist to IDB
  await set(CACHE_KEY, catalog.materials, catalogStore);
  const meta: CatalogCacheMeta = {
    fetchedAt: Date.now(),
    url,
    version: catalog.version,
  };
  await set(META_KEY, meta, catalogStore);

  return catalog;
}

/**
 * Load the last-cached community materials from IndexedDB.
 * Returns an empty array and null meta when the cache is empty.
 */
export async function loadCachedCommunityMaterials(): Promise<{
  materials: CommunityMaterial[];
  meta: CatalogCacheMeta | null;
}> {
  const materials = await get<CommunityMaterial[]>(CACHE_KEY, catalogStore);
  const meta = await get<CatalogCacheMeta>(META_KEY, catalogStore);
  return {
    materials: Array.isArray(materials) ? materials : [],
    meta: meta ?? null,
  };
}

/**
 * Clear the community catalog cache from IndexedDB.
 */
export async function clearCommunityMaterialsCache(): Promise<void> {
  await set(CACHE_KEY, [], catalogStore);
  await set(META_KEY, null, catalogStore);
}

// ── Filtering ─────────────────────────────────────────────────────────────────

/**
 * Filter community materials by region code.
 * Materials without a region are included for every region query.
 */
export function getCommunityMaterialsByRegion(
  materials: readonly CommunityMaterial[],
  region: string,
): CommunityMaterial[] {
  const r = region.toLowerCase();
  return materials.filter((m) => !m.region || m.region.toLowerCase() === r);
}

// ── Merge ─────────────────────────────────────────────────────────────────────

/**
 * Merge community materials into the built-in material list.
 *
 * - Community materials with the same key as a built-in override the built-in.
 * - New community keys are appended after the built-ins.
 * - Order: built-in materials first (with overrides applied), then new community.
 *
 * @param builtIn   The baseline built-in materials array.
 * @param community The community catalog materials.
 * @returns Merged material list (new array; inputs not mutated).
 */
export function mergeMaterialCatalogs(
  builtIn: readonly Material[],
  community: readonly CommunityMaterial[],
): Material[] {
  const communityByKey = new Map(community.map((m) => [m.key, m]));
  const result: Material[] = [];
  const usedKeys = new Set<string>();

  for (const mat of builtIn) {
    const override = communityByKey.get(mat.key);
    result.push(override ? { ...mat, ...override } : { ...mat });
    usedKeys.add(mat.key);
  }

  // Append net-new community materials
  for (const mat of community) {
    if (!usedKeys.has(mat.key)) {
      result.push({ ...mat });
    }
  }

  return result;
}
