/**
 * Phase 12 / Sprint 8 — Engine plugin sub-module barrel.
 * Covers: plugin registry, lifecycle hooks, stability contract.
 *
 * @example
 * ```ts
 * import { registerPlugin, getPluginContract } from '../engine/plugin';
 * ```
 */
export {
  registerPlugin,
  unregisterPlugin,
  getPlugins,
  applyPartsPlugins,
  applyConfigPlugins,
  getPluginContract,
  PLUGIN_CONTRACT,
  pluginEventBus,
} from '../plugin.ts';
export type { CabinetPlannerPlugin, PluginContract, PluginHookContract, PluginStability } from '../plugin.ts';
