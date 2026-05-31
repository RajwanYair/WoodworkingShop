/**
 * Plugin Marketplace — Sprint 18
 *
 * Browse, install, and manage Cabinet Planner plugins from a catalog.
 * The marketplace catalog is fetched from a CDN (or loaded from a bundled
 * stub in tests/offline) and cached in IndexedDB.  Installed plugin IDs are
 * persisted to localStorage.
 *
 * This module is the data layer.  The React UI consumes the functions here
 * and renders the marketplace component.
 */

import { get, set, del, createStore } from 'idb-keyval';
import { getPluginApiCompatibility, type PluginApiCompatibility } from '../engine/plugin';
import { getFetch } from './browser-compat';

// ── IDB store ─────────────────────────────────────────────────────────────────
const marketplaceStore = createStore('cabinet-planner-marketplace', 'marketplace');

const CATALOG_KEY = 'catalog';
const CATALOG_META_KEY = 'catalog-meta';
const INSTALLED_KEY = 'cabinet-planner-marketplace-installed';

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
  /** Minimum Cabinet Planner API version required. */
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
  await set(CATALOG_KEY, catalog, marketplaceStore);
  const meta: CatalogCacheMeta = {
    version: catalog.version,
    fetchedAt: catalog.fetchedAt,
    pluginCount: catalog.plugins.length,
  };
  await set(CATALOG_META_KEY, meta, marketplaceStore);
  return catalog;
}

/** Load the cached marketplace catalog.  Returns `null` when nothing is cached. */
export async function loadCachedCatalog(): Promise<MarketplaceCatalog | null> {
  const stored = await get<MarketplaceCatalog>(CATALOG_KEY, marketplaceStore);
  return stored ?? null;
}

/** Clear the cached catalog from IDB. */
export async function clearCatalogCache(): Promise<void> {
  await del(CATALOG_KEY, marketplaceStore);
  await del(CATALOG_META_KEY, marketplaceStore);
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

function _loadInstalledIds(): string[] {
  try {
    const raw = window.localStorage.getItem(INSTALLED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function _saveInstalledIds(ids: string[]): void {
  try {
    window.localStorage.setItem(INSTALLED_KEY, JSON.stringify(ids));
  } catch {
    // best-effort
  }
}

/** Return IDs of currently installed plugins. */
export function getInstalledPluginIds(): string[] {
  return _loadInstalledIds();
}

/** Return true when a plugin is installed. */
export function isPluginInstalled(id: string): boolean {
  return _loadInstalledIds().includes(id);
}

/** Mark a plugin as installed. */
export function installPlugin(id: string): void {
  const current = _loadInstalledIds().filter((i) => i !== id);
  _saveInstalledIds([...current, id]);
}

/** Mark a plugin as uninstalled. */
export function uninstallPlugin(id: string): void {
  const current = _loadInstalledIds().filter((i) => i !== id);
  _saveInstalledIds(current);
}

/** Remove all installed plugin records (factory reset). */
export function clearInstalledPlugins(): void {
  try {
    window.localStorage.removeItem(INSTALLED_KEY);
  } catch {
    // best-effort
  }
}
