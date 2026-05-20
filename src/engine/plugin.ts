import type { CabinetConfig, Part } from './types';

// ─── Plugin Contract ─────────────────────────────────────────────────────────

/**
 * Stability tier for a plugin API hook.
 *
 * - `stable`       — guaranteed not to break within a major version.
 * - `experimental` — may change without notice; opt-in only.
 * - `deprecated`   — will be removed in the next major release.
 */
export type PluginStability = 'stable' | 'experimental' | 'deprecated';

/**
 * Describes the versioned stability contract of a single hook
 * exposed by the Cabinet Planner plugin API.
 */
export interface PluginHookContract {
  /** Name of the hook as it appears on CabinetPlannerPlugin. */
  hookName: keyof Omit<CabinetPlannerPlugin, 'id' | 'name' | 'version'>;
  /** Stability tier for this hook. */
  stability: PluginStability;
  /** The API version (semver) at which this hook was introduced. */
  introducedIn: string;
  /** If deprecated, the API version when it was deprecated. */
  deprecatedIn?: string;
  /** Short description of what the hook does. */
  description: string;
}

/**
 * The formal, versioned contract document for the Cabinet Planner plugin API.
 *
 * Third-party plugin authors should check this object to understand which
 * hooks are safe to rely on in production.
 */
export interface PluginContract {
  /** The Cabinet Planner API semver version this contract describes. */
  apiVersion: string;
  /** Overall stability of the plugin API surface. */
  stability: PluginStability;
  /** List of hook contracts. */
  hooks: readonly PluginHookContract[];
}

/**
 * The published stability contract for the Cabinet Planner Plugin API v1.
 * Update this object whenever a hook is added, changed, or deprecated.
 */
export const PLUGIN_CONTRACT: PluginContract = {
  apiVersion: '1.0.0',
  stability: 'experimental',
  hooks: [
    {
      hookName: 'onPartsGenerated',
      stability: 'stable',
      introducedIn: '1.0.0',
      description:
        'Intercepts the generated Part[] list. Return a modified copy; never mutate the input. ' +
        'Return the same array reference to signal no change.',
    },
    {
      hookName: 'onConfigChange',
      stability: 'stable',
      introducedIn: '1.0.0',
      description:
        'Intercepts a config change before it is committed to the store. ' +
        'Return a modified CabinetConfig or the original object for no change.',
    },
  ],
} as const;

/**
 * Returns the published PluginContract for the current API version.
 * Use this to verify hook stability before depending on a hook.
 */
export function getPluginContract(): PluginContract {
  return PLUGIN_CONTRACT;
}

// ─── Plugin interface ────────────────────────────────────────────────────────

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

// ─── Plugin sandbox ──────────────────────────────────────────────────────────

/** Options for {@link runWithSandbox}. */
export interface SandboxOptions {
  /**
   * Soft wall-clock limit in milliseconds.
   * If the hook runs longer than this, `onError` is called with a
   * {@link SandboxTimeoutError}; the return value is still used.
   * Defaults to 50 ms.
   */
  timeoutMs?: number;
  /** Called when the function throws or exceeds `timeoutMs`. */
  onError?: (error: unknown) => void;
}

/** Thrown (via onError) when a sandboxed function exceeds its time budget. */
export class SandboxTimeoutError extends Error {
  readonly elapsedMs: number;
  readonly limitMs: number;

  constructor(elapsedMs: number, limitMs: number) {
    super(`Plugin exceeded time budget: ${elapsedMs} ms > ${limitMs} ms`);
    this.name = 'SandboxTimeoutError';
    this.elapsedMs = elapsedMs;
    this.limitMs = limitMs;
  }
}

/**
 * Execute `fn` within a soft sandbox:
 *
 * - Catches all synchronous exceptions and returns `fallback` instead.
 * - Measures wall-clock time; if `timeoutMs` is exceeded, reports a
 *   {@link SandboxTimeoutError} via `onError` (the computed return value
 *   is still returned to the caller).
 *
 * @param fn       The function to run inside the sandbox.
 * @param fallback Value returned when `fn` throws.
 * @param opts     Optional sandbox settings.
 */
export function runWithSandbox<T>(fn: () => T, fallback: T, opts: SandboxOptions = {}): T {
  const { timeoutMs = 50, onError } = opts;
  const t0 = Date.now();
  let result: T;
  try {
    result = fn();
  } catch (err) {
    onError?.(err);
    return fallback;
  }
  const elapsed = Date.now() - t0;
  if (elapsed > timeoutMs) {
    onError?.(new SandboxTimeoutError(elapsed, timeoutMs));
  }
  return result;
}

// ───────────────────────────────────────────────────────────────────────────
// Sprint 20 — Plugin Event Bus
// ───────────────────────────────────────────────────────────────────────────

/**
 * Sprint 20 — strongly-typed payloads emitted by the plugin event bus.
 *
 * Plugins subscribe via {@link pluginEventBus}.on(event, handler) and receive
 * the payload type associated with that event. Add new event entries here
 * when wiring a new emit site.
 */
export interface PluginEventMap {
  /** Cabinet configuration changed (any field). */
  'config:change': { config: CabinetConfig };
  /** Cut-optimization run completed. */
  'optimization:complete': { sheetCount: number; yieldPercent: number };
  /** A project session was saved (auto-save or explicit). */
  'project:save': { projectName: string };
  /** A part's rotation lock was toggled (Sprint 16 + 20). */
  'part:rotation-lock': { partId: string; locked: boolean };
}

export type PluginEventName = keyof PluginEventMap;
export type PluginEventHandler<E extends PluginEventName> = (payload: PluginEventMap[E]) => void;

/**
 * Sprint 20 — lightweight publish/subscribe event bus for the plugin API.
 *
 * Engine and store code can `emit()` named events; plugins (and other
 * subscribers) call `on()` to react. Each handler runs inside a try/catch so a
 * faulty subscriber cannot break the application.
 *
 * The bus is intentionally synchronous: handlers run on the emitter's tick.
 * Keep handlers fast; for slow work, defer with `queueMicrotask` or
 * `setTimeout`.
 */
export class PluginEventBus {
  private readonly handlers: Map<PluginEventName, Set<(payload: unknown) => void>> = new Map();

  /** Register a handler for `event`. Returns an `off` function for convenience. */
  on<E extends PluginEventName>(event: E, handler: PluginEventHandler<E>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set<(payload: unknown) => void>();
      this.handlers.set(event, set);
    }
    set.add(handler as (payload: unknown) => void);
    return () => this.off(event, handler);
  }

  /** Remove a handler previously registered with `on`. No-op if not present. */
  off<E extends PluginEventName>(event: E, handler: PluginEventHandler<E>): void {
    this.handlers.get(event)?.delete(handler as (payload: unknown) => void);
  }

  /**
   * Fire `event` with the given payload. Handlers run in registration order.
   * A thrown handler is caught and reported via `console.error` so it cannot
   * abort sibling handlers or the calling code.
   */
  emit<E extends PluginEventName>(event: E, payload: PluginEventMap[E]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[pluginEventBus] handler for "${event}" threw:`, err);
      }
    }
  }

  /** Remove all handlers (testing utility). */
  clear(): void {
    this.handlers.clear();
  }
}

/** Process-wide singleton plugin event bus. */
export const pluginEventBus = new PluginEventBus();
