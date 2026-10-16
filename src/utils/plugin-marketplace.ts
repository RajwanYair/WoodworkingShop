import { browserLocalStorage, createIndexedDbAdapter } from '../platform/storage/index';

/**
 * Plugin Marketplace — Sprint 18
 *
 * Browse catalog listings and manage saved listing IDs.
 * The marketplace catalog is fetched from a CDN (or loaded from a bundled
 * stub in tests/offline) and cached in IndexedDB. Saved listing IDs are
 * persisted to localStorage; saving a listing does not install or activate
 * plugin code.
 *
 * This module is the data layer.  The React UI consumes the functions here
 * and renders the marketplace component.
 */

import { getPluginApiCompatibility, type PluginApiCompatibility } from '../engine/core/plugin';
import { getFetch } from '../platform/network/index';

// ── IDB store ─────────────────────────────────────────────────────────────────
const marketplaceStore = createIndexedDbAdapter('cabinet-planner-marketplace', 'marketplace');

const CATALOG_KEY = 'catalog';
const CATALOG_META_KEY = 'catalog-meta';
const SAVED_LISTINGS_KEY = 'cabinet-planner-marketplace-installed';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PluginCategory = 'export' | 'optimizer' | 'preview' | 'utility' | 'theme';

/** Entry in the marketplace catalog. */
export interface MarketplacePlugin {
  /** Unique plugin ID, e.g. 'com.example.my-plugin'. */
  id: string;
  /** Display name. */
  name: string;
  /** Short description, one to two sentences. */
  description: string;
  /** Published version string, e.g. '1.0.3'. */
  version: string;
  /** Plugin author or organisation. */
  author: string;
  /** Plugin category for filtering. */
  category: PluginCategory;
  /** NPM package name or CDN URL for the plugin bundle. */
  packageUrl: string;
  /** Optional homepage URL. */
  homepageUrl?: string;
  /** Star rating 0–5 (community). */
  rating?: number;
  /** Download count hint. */
  downloads?: number;
  /** ISO timestamp of last publish. */
  publishedAt: string;
  /** Minimum WoodworkingShop API version required. */
  minApiVersion: string;
  /** Optional array of tags for search. */
  tags?: string[];
}

export interface MarketplaceCatalog {
  version: string;
  fetchedAt: string;
  plugins: MarketplacePlugin[];
}

export interface CatalogCacheMeta {
  version: string;
  fetchedAt: string;
  pluginCount: number;
}

export interface CompatibilityPartition {
  compatible: MarketplacePlugin[];
  incompatible: MarketplacePlugin[];
}

// ── Default catalog URL ───────────────────────────────────────────────────────
export const DEFAULT_MARKETPLACE_URL = 'https://cdn.cabinet-planner.app/marketplace/catalog.json';

// ── Catalog fetch & cache ─────────────────────────────────────────────────────

/**
 * Validate that a parsed object looks like a `MarketplaceCatalog`.
 */
export function validateCatalog(obj: unknown): obj is MarketplaceCatalog {
  if (typeof obj !== 'object' || obj === null) return false;
  const c = obj as Record<string, unknown>;
  return typeof c['version'] === 'string' && typeof c['fetchedAt'] === 'string' && Array.isArray(c['plugins']);
}

/**
 * Fetch the marketplace catalog from `url` and cache it in IDB.
 * Returns the fetched catalog.
 * @throws On network error or invalid payload.
 */
export async function fetchMarketplaceCatalog(url: string = DEFAULT_MARKETPLACE_URL): Promise<MarketplaceCatalog> {
  const fetchFn = getFetch();
  if (!fetchFn) {
    throw new Error('Fetch API is not available in this browser.');
  }
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(`Marketplace catalog fetch failed: HTTP ${response.status}`);
  }
  const raw: unknown = await response.json();
  if (!validateCatalog(raw)) {
    throw new Error('Marketplace catalog has invalid format');
  }
  const catalog: MarketplaceCatalog = { ...raw, fetchedAt: new Date().toISOString() };
  await marketplaceStore.set(CATALOG_KEY, catalog);
  const meta: CatalogCacheMeta = {
    version: catalog.version,
    fetchedAt: catalog.fetchedAt,
    pluginCount: catalog.plugins.length,
  };
  await marketplaceStore.set(CATALOG_META_KEY, meta);
  return catalog;
}

/** Load the cached marketplace catalog.  Returns `null` when nothing is cached. */
export async function loadCachedCatalog(): Promise<MarketplaceCatalog | null> {
  const stored = await marketplaceStore.get<MarketplaceCatalog>(CATALOG_KEY);
  return stored ?? null;
}

/** Clear the cached catalog from IDB. */
export async function clearCatalogCache(): Promise<void> {
  await marketplaceStore.delete(CATALOG_KEY);
  await marketplaceStore.delete(CATALOG_META_KEY);
}

// ── Search ────────────────────────────────────────────────────────────────────

/**
 * Search plugins in `catalog` by query string and optional category filter.
 * Matching checks name, description, tags, and author (case-insensitive).
 */
export function searchPlugins(
  catalog: MarketplaceCatalog,
  query: string,
  category?: PluginCategory,
): MarketplacePlugin[] {
  const q = query.trim().toLowerCase();
  return catalog.plugins.filter((p) => {
    if (category && p.category !== category) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.author.toLowerCase().includes(q) ||
      (p.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  });
}

/**
 * Compute plugin API compatibility for a marketplace plugin entry.
 */
export function getMarketplacePluginCompatibility(
  plugin: MarketplacePlugin,
  currentApiVersion?: string,
): PluginApiCompatibility {
  return getPluginApiCompatibility(plugin.minApiVersion, currentApiVersion);
}

/**
 * Return `true` if a marketplace plugin can run on the current plugin API version.
 */
export function isMarketplacePluginCompatible(plugin: MarketplacePlugin, currentApiVersion?: string): boolean {
  return getMarketplacePluginCompatibility(plugin, currentApiVersion).compatible;
}

/**
 * Split a catalog into compatible and incompatible plugins for the current API version.
 */
export function splitPluginsByCompatibility(
  catalog: MarketplaceCatalog,
  currentApiVersion?: string,
): CompatibilityPartition {
  return catalog.plugins.reduce<CompatibilityPartition>(
    (acc, plugin) => {
      if (isMarketplacePluginCompatible(plugin, currentApiVersion)) {
        acc.compatible.push(plugin);
      } else {
        acc.incompatible.push(plugin);
      }
      return acc;
    },
    { compatible: [], incompatible: [] },
  );
}

// ── Install / uninstall ───────────────────────────────────────────────────────

function _loadSavedListingIds(): string[] {
  try {
    const raw = browserLocalStorage.getItem(SAVED_LISTINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function _saveSavedListingIds(ids: string[]): void {
  try {
    browserLocalStorage.setItem(SAVED_LISTINGS_KEY, JSON.stringify(ids));
  } catch {
    // best-effort
  }
}

/** Return IDs of saved catalog listings. */
export function getSavedPluginListingIds(): string[] {
  return _loadSavedListingIds();
}

/** Return true when a catalog listing has been saved. */
export function isPluginListingSaved(id: string): boolean {
  return _loadSavedListingIds().includes(id);
}

/** Save a catalog listing without installing or activating its plugin code. */
export function savePluginListing(id: string): void {
  const current = _loadSavedListingIds().filter((i) => i !== id);
  _saveSavedListingIds([...current, id]);
}

/** Remove a saved catalog listing. */
export function removeSavedPluginListing(id: string): void {
  const current = _loadSavedListingIds().filter((i) => i !== id);
  _saveSavedListingIds(current);
}

/** Remove all saved catalog listing IDs. */
export function clearSavedPluginListings(): void {
  try {
    browserLocalStorage.removeItem(SAVED_LISTINGS_KEY);
  } catch {
    // best-effort
  }
}
