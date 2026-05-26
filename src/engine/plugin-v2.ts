/**
 * Plugin API v2 — typed lifecycle hooks and sandboxed context.
 *
 * Extends the v1 plugin API (plugin.ts) with:
 *   - `PluginContext`             — scoped, sandboxed API surface for lifecycle hooks
 *   - `CabinetPlannerPluginV2`   — v2 plugin interface (onInstall / onActivate / etc.)
 *   - `PluginRegistryEntry`      — per-plugin state machine (installed → active → deactivated)
 *   - `registerPluginV2`         — install + activate in one call
 *   - `deactivatePlugin`         — pause a plugin without removing it
 *   - `activatePlugin`           — re-enable a deactivated plugin
 *   - `unregisterPluginV2`       — deactivate + uninstall + remove
 *
 * v1 plugins registered via `registerPlugin()` continue to work unchanged.
 * v2 plugins should use `registerPluginV2()` to benefit from lifecycle hooks.
 */

import { pluginEventBus } from './plugin';
import type { CabinetPlannerPlugin, PluginEventName, PluginEventHandler, PluginEventMap } from './plugin';

// ── API version ────────────────────────────────────────────────────────────

export const PLUGIN_API_V2_VERSION = '2.0.0' as const;

// ── Lifecycle state ────────────────────────────────────────────────────────

export const PLUGIN_LIFECYCLE_STATES = ['installed', 'active', 'deactivated', 'error'] as const;

export type PluginLifecycleState = (typeof PLUGIN_LIFECYCLE_STATES)[number];

// ── Sandboxed context ──────────────────────────────────────────────────────

/**
 * Scoped API surface passed to v2 lifecycle hooks.
 *
 * Provides access to the shared plugin event bus and structured logging
 * without exposing internal engine state directly. Plugins should not retain
 * references to `PluginContext` beyond the scope of the lifecycle hook.
 */
export type PluginContext = {
  /** The id of the plugin this context belongs to. */
  readonly pluginId: string;
  /** Cabinet Planner Plugin API version this context was created under. */
  readonly apiVersion: typeof PLUGIN_API_V2_VERSION;
  /** Emit a typed event on the shared plugin event bus. */
  emit<E extends PluginEventName>(event: E, payload: PluginEventMap[E]): void;
  /**
   * Subscribe to a typed event on the shared plugin event bus.
   * Returns an unsubscribe function.
   */
  on<E extends PluginEventName>(event: E, handler: PluginEventHandler<E>): () => void;
  /** Structured logging prefixed with the plugin id. */
  log(level: 'info' | 'warn' | 'error', message: string): void;
};

/** Create a `PluginContext` scoped to the given plugin id. */
export function createPluginContext(pluginId: string): PluginContext {
  return {
    pluginId,
    apiVersion: PLUGIN_API_V2_VERSION,
    emit(event, payload) {
      pluginEventBus.emit(event, payload);
    },
    on(event, handler) {
      return pluginEventBus.on(event, handler);
    },
    log(level, message) {
      const prefix = `[plugin:${pluginId}]`;
      if (level === 'error') console.error(prefix, message);
      else if (level === 'warn') console.warn(prefix, message);
      else console.info(prefix, message);
    },
  };
}

// ── Plugin v2 interface ────────────────────────────────────────────────────

/**
 * Cabinet Planner Plugin API v2.
 *
 * Extends the v1 `CabinetPlannerPlugin` interface with lifecycle hooks that
 * are called by the plugin runtime at key state transitions. A v2 plugin must
 * set `apiVersion: '2'` as a discriminator property to enable lifecycle
 * handling via `registerPluginV2`.
 */
export interface CabinetPlannerPluginV2 extends CabinetPlannerPlugin {
  /**
   * Discriminator required for the `isPluginV2` type guard.
   * Must be the string literal `'2'`.
   */
  readonly apiVersion: '2';

  /**
   * Called once when the plugin is first registered.
   * Use for one-time initialisation such as loading persisted settings.
   */
  onInstall?(ctx: PluginContext): void;

  /**
   * Called when the plugin is removed from the registry.
   * Use to release event subscriptions or external resources.
   */
  onUninstall?(ctx: PluginContext): void;

  /**
   * Called after `onInstall` (on first registration) and whenever the plugin
   * is re-activated after deactivation. Hook runners include this plugin
   * immediately after `onActivate` returns.
   */
  onActivate?(ctx: PluginContext): void;

  /**
   * Called when the plugin is deactivated but not removed.
   * Hook runners exclude this plugin after `onDeactivate` returns.
   */
  onDeactivate?(ctx: PluginContext): void;
}

// ── Type guard ─────────────────────────────────────────────────────────────

/** Returns `true` when `plugin` conforms to the v2 plugin interface. */
export function isPluginV2(plugin: CabinetPlannerPlugin): plugin is CabinetPlannerPluginV2 {
  return 'apiVersion' in plugin && (plugin as CabinetPlannerPluginV2).apiVersion === '2';
}

// ── Registry entry ─────────────────────────────────────────────────────────

/** A single plugin's state machine entry in the v2 registry. */
export type PluginRegistryEntry = {
  readonly plugin: CabinetPlannerPlugin | CabinetPlannerPluginV2;
  state: PluginLifecycleState;
  readonly installedAt: number;
  lastError: string | undefined;
};

// ── Registry ───────────────────────────────────────────────────────────────

const _registry = new Map<string, PluginRegistryEntry>();

/** Result type for registry operations that may fail. */
export type RegistryResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

/**
 * Invoke a lifecycle hook on a v2 plugin inside a try/catch.
 * If the hook throws, records the error on `entry` and sets its state to
 * `'error'`. Returns `true` on success, `false` on error.
 */
function callLifecycle(
  plugin: CabinetPlannerPluginV2,
  hook: 'onInstall' | 'onUninstall' | 'onActivate' | 'onDeactivate',
  entry: PluginRegistryEntry,
): boolean {
  const fn = plugin[hook];
  if (!fn) return true;
  const ctx = createPluginContext(plugin.id);
  try {
    fn.call(plugin, ctx);
    return true;
  } catch (e) {
    entry.lastError = String(e);
    entry.state = 'error';
    return false;
  }
}

/**
 * Register a plugin (v1 or v2).
 *
 * - v2 plugins: `onInstall` is called first; if it succeeds, `onActivate` is
 *   called. `plugin:install` and `plugin:activate` events are emitted.
 * - v1 plugins: skip lifecycle hooks and immediately become active.
 *
 * Returns `{ ok: false, error }` if a plugin with the same id is already
 * registered. Returns `{ ok: true }` in all other cases (including when a
 * lifecycle hook throws — the plugin enters the `'error'` state).
 */
export function registerPluginV2(plugin: CabinetPlannerPlugin | CabinetPlannerPluginV2): RegistryResult {
  if (_registry.has(plugin.id)) {
    return { ok: false, error: `Plugin "${plugin.id}" is already registered.` };
  }

  const entry: PluginRegistryEntry = {
    plugin,
    state: 'installed',
    installedAt: Date.now(),
    lastError: undefined,
  };
  _registry.set(plugin.id, entry);

  if (isPluginV2(plugin)) {
    if (!callLifecycle(plugin, 'onInstall', entry)) {
      pluginEventBus.emit('plugin:error', {
        pluginId: plugin.id,
        message: entry.lastError ?? '',
      });
      return { ok: true };
    }
    pluginEventBus.emit('plugin:install', { pluginId: plugin.id });

    if (!callLifecycle(plugin, 'onActivate', entry)) {
      pluginEventBus.emit('plugin:error', {
        pluginId: plugin.id,
        message: entry.lastError ?? '',
      });
      return { ok: true };
    }
    entry.state = 'active';
    pluginEventBus.emit('plugin:activate', { pluginId: plugin.id });
  } else {
    entry.state = 'active';
  }

  return { ok: true };
}

/**
 * Deactivate an active plugin without removing it.
 * Calls `onDeactivate` for v2 plugins then emits `plugin:deactivate`.
 *
 * The plugin can be re-enabled with {@link activatePlugin}.
 */
export function deactivatePlugin(id: string): RegistryResult {
  const entry = _registry.get(id);
  if (!entry) return { ok: false, error: `Plugin "${id}" not found.` };
  if (entry.state !== 'active') {
    return {
      ok: false,
      error: `Plugin "${id}" is not active (state: ${entry.state}).`,
    };
  }

  if (isPluginV2(entry.plugin)) {
    if (!callLifecycle(entry.plugin, 'onDeactivate', entry)) {
      pluginEventBus.emit('plugin:error', {
        pluginId: id,
        message: entry.lastError ?? '',
      });
      pluginEventBus.emit('plugin:deactivate', { pluginId: id });
      return { ok: true };
    }
  }
  entry.state = 'deactivated';
  pluginEventBus.emit('plugin:deactivate', { pluginId: id });
  return { ok: true };
}

/**
 * Reactivate a previously deactivated plugin.
 * Calls `onActivate` for v2 plugins then emits `plugin:activate`.
 */
export function activatePlugin(id: string): RegistryResult {
  const entry = _registry.get(id);
  if (!entry) return { ok: false, error: `Plugin "${id}" not found.` };
  if (entry.state !== 'deactivated') {
    return {
      ok: false,
      error: `Plugin "${id}" is not deactivated (state: ${entry.state}).`,
    };
  }

  if (isPluginV2(entry.plugin)) {
    if (!callLifecycle(entry.plugin, 'onActivate', entry)) {
      pluginEventBus.emit('plugin:error', {
        pluginId: id,
        message: entry.lastError ?? '',
      });
      return { ok: true };
    }
  }
  entry.state = 'active';
  pluginEventBus.emit('plugin:activate', { pluginId: id });
  return { ok: true };
}

/**
 * Unregister (remove) a plugin from the v2 registry.
 *
 * For v2 plugins: calls `onDeactivate` (if active), then `onUninstall`, then
 * emits `plugin:uninstall`. No-op if the id is not in the registry.
 */
export function unregisterPluginV2(id: string): void {
  const entry = _registry.get(id);
  if (!entry) return;

  if (entry.state === 'active' && isPluginV2(entry.plugin)) {
    callLifecycle(entry.plugin, 'onDeactivate', entry);
  }
  if (isPluginV2(entry.plugin)) {
    callLifecycle(entry.plugin, 'onUninstall', entry);
  }
  _registry.delete(id);
  pluginEventBus.emit('plugin:uninstall', { pluginId: id });
}

/** Return a snapshot of all registry entries (active, deactivated, and error). */
export function getRegistryEntries(): readonly PluginRegistryEntry[] {
  return Array.from(_registry.values());
}

/** Return the registry entry for `id`, or `undefined` if not registered. */
export function getRegistryEntry(id: string): PluginRegistryEntry | undefined {
  return _registry.get(id);
}

/**
 * Return only the plugins whose state is `'active'`.
 * Intended for use by hook runners that should skip deactivated plugins.
 */
export function getActivePlugins(): readonly (CabinetPlannerPlugin | CabinetPlannerPluginV2)[] {
  return Array.from(_registry.values())
    .filter((e) => e.state === 'active')
    .map((e) => e.plugin);
}

/** Clear all registry entries. For use in tests only. */
export function clearRegistryV2(): void {
  _registry.clear();
}
