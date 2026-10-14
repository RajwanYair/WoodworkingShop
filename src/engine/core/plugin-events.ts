import type { CabinetConfig } from './types';

/** Plugin events shared by the lifecycle registry and compatibility API. */
export interface PluginEventMap {
  'config:change': { config: CabinetConfig };
  'optimization:complete': { sheetCount: number; yieldPercent: number };
  'project:save': { projectName: string };
  'part:rotation-lock': { partId: string; locked: boolean };
  'plugin:install': { pluginId: string };
  'plugin:uninstall': { pluginId: string };
  'plugin:activate': { pluginId: string };
  'plugin:deactivate': { pluginId: string };
  'plugin:error': { pluginId: string; message: string };
}

export type PluginEventName = keyof PluginEventMap;
export type PluginEventHandler<E extends PluginEventName> = (payload: PluginEventMap[E]) => void;

/** Synchronous publish/subscribe bus for engine and plugin lifecycle events. */
export class PluginEventBus {
  private readonly handlers: Map<PluginEventName, Set<(payload: unknown) => void>> = new Map();

  /** Register a handler for `event`. Returns an unsubscribe function. */
  on<E extends PluginEventName>(event: E, handler: PluginEventHandler<E>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set<(payload: unknown) => void>();
      this.handlers.set(event, set);
    }
    set.add(handler as (payload: unknown) => void);
    return () => this.off(event, handler);
  }

  /** Remove a handler previously registered with `on`. */
  off<E extends PluginEventName>(event: E, handler: PluginEventHandler<E>): void {
    this.handlers.get(event)?.delete(handler as (payload: unknown) => void);
  }

  /** Emit an event without allowing a failing subscriber to interrupt others. */
  emit<E extends PluginEventName>(event: E, payload: PluginEventMap[E]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[pluginEventBus] handler for "${event}" threw:`, error);
      }
    }
  }

  /** Remove all handlers. Intended for tests. */
  clear(): void {
    this.handlers.clear();
  }

  /** Register a one-shot handler and return a function that cancels it. */
  once<E extends PluginEventName>(event: E, handler: PluginEventHandler<E>): () => void {
    const wrapper: PluginEventHandler<E> = (payload) => {
      remove();
      handler(payload);
    };
    const remove = this.on(event, wrapper);
    return remove;
  }

  /** Return the active subscriber count for `event`. */
  listenerCount(event: PluginEventName): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}

export const pluginEventBus = new PluginEventBus();
