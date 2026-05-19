import type { CabinetConfig, Part } from './types';

/**
 * Cabinet Planner Plugin API — v1 draft (v3.49.2)
 *
 * A plugin can intercept the parts pipeline and/or hook into config changes.
 * All hooks are optional; a plugin only needs to implement what it cares about.
 *
 * Plugins are pure: hooks must be side-effect-free functions that return new
 * values instead of mutating their inputs.
 */
export interface CabinetPlannerPlugin {
  /** Unique identifier (reverse-domain recommended: "com.example.myPlugin"). */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** SemVer string of this plugin release. */
  version: string;

  /**
   * Called after `generateParts()` has produced the initial part list.
   * The plugin may return a modified copy; the original array must NOT be
   * mutated. Return the same array reference to signal no change.
   */
  onPartsGenerated?: (parts: Part[], cfg: CabinetConfig) => Part[];

  /**
   * Called before a config change is committed to the store.
   * May return a modified config; return the original object for no change.
   */
  onConfigChange?: (cfg: CabinetConfig) => CabinetConfig;
}

// ── Plugin registry ──────────────────────────────────────────────────────────

const _plugins: CabinetPlannerPlugin[] = [];

/** Register a plugin. Throws if a plugin with the same id is already registered. */
export function registerPlugin(plugin: CabinetPlannerPlugin): void {
  if (_plugins.some((p) => p.id === plugin.id)) {
    throw new Error(`Plugin "${plugin.id}" is already registered.`);
  }
  _plugins.push(plugin);
}

/** Unregister a previously registered plugin by id. No-op if not found. */
export function unregisterPlugin(id: string): void {
  const idx = _plugins.findIndex((p) => p.id === id);
  if (idx >= 0) _plugins.splice(idx, 1);
}

/** Return a read-only snapshot of the currently registered plugins. */
export function getPlugins(): readonly CabinetPlannerPlugin[] {
  return _plugins;
}

/**
 * Run the `onPartsGenerated` hook for all registered plugins in registration
 * order, passing the result of each plugin into the next.
 */
export function applyPartsPlugins(parts: Part[], cfg: CabinetConfig): Part[] {
  let result = parts;
  for (const plugin of _plugins) {
    if (plugin.onPartsGenerated) {
      result = plugin.onPartsGenerated(result, cfg);
    }
  }
  return result;
}

/**
 * Run the `onConfigChange` hook for all registered plugins in registration
 * order, passing the result of each plugin into the next.
 */
export function applyConfigPlugins(cfg: CabinetConfig): CabinetConfig {
  let result = cfg;
  for (const plugin of _plugins) {
    if (plugin.onConfigChange) {
      result = plugin.onConfigChange(result);
    }
  }
  return result;
}
