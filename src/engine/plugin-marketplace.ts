/**
 * Sprint 127 — Plugin marketplace foundation (Phase 29)
 *
 * Pure engine module — no React, no DOM, no side effects.
 * Implements a local plugin registry with install/enable/disable lifecycle.
 * Builds on top of the existing `plugin.ts` stability contract.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Plugin install / runtime state in the marketplace. */
export type MarketplacePluginState = 'available' | 'installed' | 'enabled' | 'disabled' | 'error';

/** Where the plugin package originates. */
export type PluginSource = 'official' | 'community' | 'local';

/** Category tag used for marketplace browsing. */
export type PluginCategory =
  | 'export'
  | 'optimization'
  | 'visualization'
  | 'hardware'
  | 'materials'
  | 'assembly'
  | 'pricing'
  | 'other';

/** A single plugin entry in the marketplace registry. */
export interface MarketplaceEntry {
  /** Reverse-DNS plugin identifier. e.g. `'com.example.my-plugin'` */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** One-sentence description. */
  description: string;
  /** Semver plugin version. e.g. `'1.2.0'` */
  version: string;
  /** Plugin author or organisation. */
  author: string;
  /** Registry origin. */
  source: PluginSource;
  /** Primary category. */
  category: PluginCategory;
  /** Comma-free download / install URL (may be a local path). */
  packageUrl: string;
  /** Semver range of Cabinet Planner API versions this plugin supports. e.g. `'>=1.0.0'` */
  apiVersionRange: string;
  /** ISO 8601 date of last publish. */
  publishedAt: string;
  /** Average star rating 0–5 (optional). */
  rating?: number;
  /** Total install count (optional). */
  installCount?: number;
}

/** Runtime installation record stored in the local registry. */
export interface InstalledPlugin {
  /** Plugin id. */
  id: string;
  /** Version that was installed. */
  installedVersion: string;
  /** Current lifecycle state. */
  state: MarketplacePluginState;
  /** ISO 8601 timestamp of installation. */
  installedAt: string;
  /** ISO 8601 timestamp of last state change. */
  updatedAt: string;
  /** Optional error message when state is `'error'`. */
  errorMessage?: string;
}

/** The local plugin registry (immutable value). */
export interface PluginRegistry {
  /** All entries known to this registry (available + installed). */
  catalog: MarketplaceEntry[];
  /** Installation records keyed by plugin id. */
  installed: Record<string, InstalledPlugin>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function requireEntry(registry: PluginRegistry, id: string): MarketplaceEntry {
  const entry = registry.catalog.find((e) => e.id === id);
  if (!entry) throw new RangeError(`Plugin not found in catalog: ${id}`);
  return entry;
}

function requireInstalled(registry: PluginRegistry, id: string): InstalledPlugin {
  const rec = registry.installed[id];
  if (!rec) throw new RangeError(`Plugin not installed: ${id}`);
  return rec;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create an empty plugin registry.
 */
export function createRegistry(): PluginRegistry {
  return { catalog: [], installed: {} };
}

/**
 * Add a new plugin entry to the registry catalog.
 * Throws if a plugin with the same id already exists.
 */
export function registerPlugin(registry: PluginRegistry, entry: MarketplaceEntry): PluginRegistry {
  if (!entry.id.trim()) throw new RangeError('Plugin id must not be empty');
  if (!entry.name.trim()) throw new RangeError('Plugin name must not be empty');
  if (registry.catalog.some((e) => e.id === entry.id)) {
    throw new RangeError(`Plugin already registered: ${entry.id}`);
  }
  return { ...registry, catalog: [...registry.catalog, entry] };
}

/**
 * Install a plugin from the catalog into the local registry.
 * Transitions state: available → installed.
 *
 * @throws RangeError if the plugin is not in the catalog or is already installed.
 */
export function installPlugin(registry: PluginRegistry, id: string): PluginRegistry {
  requireEntry(registry, id);
  if (registry.installed[id]) throw new RangeError(`Plugin already installed: ${id}`);
  const entry = registry.catalog.find((e) => e.id === id)!;
  const ts = now();
  const record: InstalledPlugin = {
    id,
    installedVersion: entry.version,
    state: 'installed',
    installedAt: ts,
    updatedAt: ts,
  };
  return { ...registry, installed: { ...registry.installed, [id]: record } };
}

/**
 * Uninstall a plugin, removing its installation record.
 *
 * @throws RangeError if the plugin is not installed.
 */
export function uninstallPlugin(registry: PluginRegistry, id: string): PluginRegistry {
  requireInstalled(registry, id);
  const installed = { ...registry.installed };
  delete installed[id];
  return { ...registry, installed };
}

/**
 * Enable an installed plugin.
 * Allowed transitions: installed → enabled, disabled → enabled.
 *
 * @throws RangeError if the plugin is not installed or already enabled.
 */
export function enablePlugin(registry: PluginRegistry, id: string): PluginRegistry {
  const rec = requireInstalled(registry, id);
  if (rec.state === 'enabled') throw new RangeError(`Plugin already enabled: ${id}`);
  if (rec.state === 'error') throw new RangeError(`Cannot enable plugin in error state: ${id}`);
  const updated: InstalledPlugin = { ...rec, state: 'enabled', updatedAt: now() };
  return { ...registry, installed: { ...registry.installed, [id]: updated } };
}

/**
 * Disable an installed plugin.
 * Allowed transitions: enabled → disabled.
 *
 * @throws RangeError if the plugin is not installed or already disabled/not-enabled.
 */
export function disablePlugin(registry: PluginRegistry, id: string): PluginRegistry {
  const rec = requireInstalled(registry, id);
  if (rec.state === 'disabled') throw new RangeError(`Plugin already disabled: ${id}`);
  if (rec.state !== 'enabled') throw new RangeError(`Plugin is not enabled: ${id}`);
  const updated: InstalledPlugin = { ...rec, state: 'disabled', updatedAt: now() };
  return { ...registry, installed: { ...registry.installed, [id]: updated } };
}

/**
 * Mark a plugin as errored with an optional message.
 */
export function markPluginError(registry: PluginRegistry, id: string, errorMessage: string): PluginRegistry {
  const rec = requireInstalled(registry, id);
  const updated: InstalledPlugin = { ...rec, state: 'error', errorMessage, updatedAt: now() };
  return { ...registry, installed: { ...registry.installed, [id]: updated } };
}

/**
 * Search the catalog by name, description, or author.
 * Returns entries sorted by relevance (name match first, then description).
 */
export function searchPlugins(registry: PluginRegistry, query: string): MarketplaceEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...registry.catalog];
  const scored = registry.catalog.map((e) => {
    let score = 0;
    if (e.id.toLowerCase().includes(q)) score += 3;
    if (e.name.toLowerCase().includes(q)) score += 2;
    if (e.description.toLowerCase().includes(q)) score += 1;
    if (e.author.toLowerCase().includes(q)) score += 1;
    return { entry: e, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.entry);
}

/**
 * Return all installed plugin records.
 */
export function getInstalledPlugins(registry: PluginRegistry): InstalledPlugin[] {
  return Object.values(registry.installed);
}

/**
 * Return only enabled plugin records.
 */
export function getEnabledPlugins(registry: PluginRegistry): InstalledPlugin[] {
  return Object.values(registry.installed).filter((r) => r.state === 'enabled');
}

/**
 * Filter catalog entries by category.
 */
export function filterByCategory(registry: PluginRegistry, category: PluginCategory): MarketplaceEntry[] {
  return registry.catalog.filter((e) => e.category === category);
}

/**
 * Return a sorted leaderboard of catalog entries by install count (descending).
 */
export function getTopPlugins(registry: PluginRegistry, limit = 10): MarketplaceEntry[] {
  return [...registry.catalog]
    .filter((e) => (e.installCount ?? 0) > 0)
    .sort((a, b) => (b.installCount ?? 0) - (a.installCount ?? 0))
    .slice(0, limit);
}
