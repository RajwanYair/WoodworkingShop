import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PLUGIN_API_V2_VERSION,
  PLUGIN_LIFECYCLE_STATES,
  createPluginContext,
  isPluginV2,
  registerPluginV2,
  deactivatePlugin,
  activatePlugin,
  unregisterPluginV2,
  getRegistryEntries,
  getRegistryEntry,
  getActivePlugins,
  clearRegistryV2,
  type CabinetPlannerPluginV2,
  type PluginContext,
} from '../../src/engine/plugin-v2';
import type { CabinetPlannerPlugin } from '../../src/engine/plugin';
import { pluginEventBus } from '../../src/engine/plugin';

// ── helpers ────────────────────────────────────────────────────────────────

function makeV1(id = 'v1.plugin'): CabinetPlannerPlugin {
  return { id, name: 'V1 Plugin', version: '1.0.0' };
}

function makeV2(
  id = 'v2.plugin',
  hooks: Partial<Pick<CabinetPlannerPluginV2, 'onInstall' | 'onUninstall' | 'onActivate' | 'onDeactivate'>> = {},
): CabinetPlannerPluginV2 {
  return { id, name: 'V2 Plugin', version: '2.0.0', apiVersion: '2', ...hooks };
}

beforeEach(() => {
  clearRegistryV2();
  pluginEventBus.clear();
});

// ── constants ──────────────────────────────────────────────────────────────

describe('PLUGIN_API_V2_VERSION', () => {
  it('is the string 2.0.0', () => {
    expect(PLUGIN_API_V2_VERSION).toBe('2.0.0');
  });
});

describe('PLUGIN_LIFECYCLE_STATES', () => {
  it('contains all expected states', () => {
    expect(PLUGIN_LIFECYCLE_STATES).toEqual(['installed', 'active', 'deactivated', 'error']);
  });
});

// ── createPluginContext ────────────────────────────────────────────────────

describe('createPluginContext', () => {
  it('returns context with correct pluginId and apiVersion', () => {
    const ctx = createPluginContext('my.plugin');
    expect(ctx.pluginId).toBe('my.plugin');
    expect(ctx.apiVersion).toBe('2.0.0');
  });

  it('emit() routes to the shared event bus', () => {
    const ctx = createPluginContext('ctx.test');
    const received: { projectName: string }[] = [];
    pluginEventBus.on('project:save', (p) => received.push(p));
    ctx.emit('project:save', { projectName: 'demo' });
    expect(received).toHaveLength(1);
    expect(received[0].projectName).toBe('demo');
  });

  it('on() subscribes via the shared event bus and returns an unsub function', () => {
    const ctx = createPluginContext('ctx.sub');
    const calls: string[] = [];
    const off = ctx.on('project:save', (p) => calls.push(p.projectName));
    pluginEventBus.emit('project:save', { projectName: 'first' });
    off();
    pluginEventBus.emit('project:save', { projectName: 'second' });
    expect(calls).toEqual(['first']);
  });

  it.each([
    ['info', 'info' as const],
    ['warn', 'warn' as const],
    ['error', 'error' as const],
  ])('log(%s) calls console.%s', (_, level) => {
    const spy = vi.spyOn(console, level).mockImplementation(() => undefined);
    const ctx = createPluginContext('log.plugin');
    ctx.log(level, 'test message');
    expect(spy).toHaveBeenCalledWith('[plugin:log.plugin]', 'test message');
    spy.mockRestore();
  });
});

// ── isPluginV2 ─────────────────────────────────────────────────────────────

describe('isPluginV2', () => {
  it.each([
    ['v1 plugin (no apiVersion)', makeV1(), false],
    ['v2 plugin (apiVersion: "2")', makeV2(), true],
    ['object with wrong apiVersion', { ...makeV1(), apiVersion: '1' }, false],
  ] as const)('%s → %s', (_, plugin, expected) => {
    expect(isPluginV2(plugin as CabinetPlannerPlugin)).toBe(expected);
  });
});

// ── registerPluginV2 ───────────────────────────────────────────────────────

describe('registerPluginV2 — v1 plugin', () => {
  it('registers and immediately becomes active', () => {
    registerPluginV2(makeV1());
    const entry = getRegistryEntry('v1.plugin');
    expect(entry?.state).toBe('active');
  });

  it('returns { ok: true }', () => {
    expect(registerPluginV2(makeV1()).ok).toBe(true);
  });

  it('returns { ok: false } for duplicate id', () => {
    registerPluginV2(makeV1());
    const result = registerPluginV2(makeV1());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch('already registered');
  });
});

describe('registerPluginV2 — v2 plugin', () => {
  it('calls onInstall then onActivate in order', () => {
    const order: string[] = [];
    registerPluginV2(
      makeV2('lifecycle.order', {
        onInstall: () => order.push('install'),
        onActivate: () => order.push('activate'),
      }),
    );
    expect(order).toEqual(['install', 'activate']);
  });

  it('ends in active state when hooks succeed', () => {
    registerPluginV2(makeV2());
    expect(getRegistryEntry('v2.plugin')?.state).toBe('active');
  });

  it('emits plugin:install and plugin:activate events', () => {
    const installs: string[] = [];
    const activates: string[] = [];
    pluginEventBus.on('plugin:install', (p) => installs.push(p.pluginId));
    pluginEventBus.on('plugin:activate', (p) => activates.push(p.pluginId));
    registerPluginV2(makeV2('emit.test'));
    expect(installs).toEqual(['emit.test']);
    expect(activates).toEqual(['emit.test']);
  });

  it('transitions to error state when onInstall throws', () => {
    registerPluginV2(
      makeV2('bad.install', {
        onInstall: () => {
          throw new Error('install failed');
        },
      }),
    );
    expect(getRegistryEntry('bad.install')?.state).toBe('error');
    expect(getRegistryEntry('bad.install')?.lastError).toMatch('install failed');
  });

  it('emits plugin:error when onInstall throws', () => {
    const errors: { pluginId: string; message: string }[] = [];
    pluginEventBus.on('plugin:error', (p) => errors.push(p));
    registerPluginV2(
      makeV2('err.install', {
        onInstall: () => {
          throw new Error('boom');
        },
      }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].pluginId).toBe('err.install');
  });

  it('transitions to error state when onActivate throws', () => {
    registerPluginV2(
      makeV2('bad.activate', {
        onActivate: () => {
          throw new Error('activate failed');
        },
      }),
    );
    expect(getRegistryEntry('bad.activate')?.state).toBe('error');
  });

  it('passes a PluginContext with the correct pluginId to onInstall', () => {
    let received: PluginContext | undefined;
    registerPluginV2(
      makeV2('ctx.check', {
        onInstall: (ctx) => {
          received = ctx;
        },
      }),
    );
    expect(received?.pluginId).toBe('ctx.check');
    expect(received?.apiVersion).toBe('2.0.0');
  });
});

// ── deactivatePlugin ───────────────────────────────────────────────────────

describe('deactivatePlugin', () => {
  it('returns error for unknown id', () => {
    const r = deactivatePlugin('no.such');
    expect(r.ok).toBe(false);
  });

  it('returns error when plugin is not active', () => {
    registerPluginV2(makeV2('already.inactive'));
    deactivatePlugin('already.inactive');
    const r = deactivatePlugin('already.inactive');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch('not active');
  });

  it('transitions state to deactivated', () => {
    registerPluginV2(makeV2());
    deactivatePlugin('v2.plugin');
    expect(getRegistryEntry('v2.plugin')?.state).toBe('deactivated');
  });

  it('calls onDeactivate for v2 plugins', () => {
    let called = false;
    registerPluginV2(
      makeV2('deact.test', {
        onDeactivate: () => {
          called = true;
        },
      }),
    );
    deactivatePlugin('deact.test');
    expect(called).toBe(true);
  });

  it('emits plugin:deactivate', () => {
    const deacts: string[] = [];
    pluginEventBus.on('plugin:deactivate', (p) => deacts.push(p.pluginId));
    registerPluginV2(makeV2('deact.emit'));
    deactivatePlugin('deact.emit');
    expect(deacts).toEqual(['deact.emit']);
  });

  it('does NOT call onDeactivate for v1 plugins', () => {
    registerPluginV2(makeV1());
    const r = deactivatePlugin('v1.plugin');
    expect(r.ok).toBe(true);
    expect(getRegistryEntry('v1.plugin')?.state).toBe('deactivated');
  });
});

// ── activatePlugin ─────────────────────────────────────────────────────────

describe('activatePlugin', () => {
  it('returns error for unknown id', () => {
    const r = activatePlugin('no.such');
    expect(r.ok).toBe(false);
  });

  it('returns error when plugin is already active', () => {
    registerPluginV2(makeV2());
    const r = activatePlugin('v2.plugin');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch('not deactivated');
  });

  it('transitions state back to active', () => {
    registerPluginV2(makeV2());
    deactivatePlugin('v2.plugin');
    activatePlugin('v2.plugin');
    expect(getRegistryEntry('v2.plugin')?.state).toBe('active');
  });

  it('calls onActivate for v2 plugins', () => {
    let activateCount = 0;
    registerPluginV2(
      makeV2('reactivate.test', {
        onActivate: () => {
          activateCount++;
        },
      }),
    );
    deactivatePlugin('reactivate.test');
    activatePlugin('reactivate.test');
    expect(activateCount).toBe(2); // once on register, once on reactivate
  });

  it('emits plugin:activate on reactivation', () => {
    const activates: string[] = [];
    pluginEventBus.on('plugin:activate', (p) => activates.push(p.pluginId));
    registerPluginV2(makeV2('react.emit'));
    deactivatePlugin('react.emit');
    activates.length = 0; // clear the initial activate event
    activatePlugin('react.emit');
    expect(activates).toEqual(['react.emit']);
  });
});

// ── unregisterPluginV2 ─────────────────────────────────────────────────────

describe('unregisterPluginV2', () => {
  it('is a no-op for unknown id', () => {
    expect(() => unregisterPluginV2('no.such')).not.toThrow();
  });

  it('removes the plugin from the registry', () => {
    registerPluginV2(makeV2());
    unregisterPluginV2('v2.plugin');
    expect(getRegistryEntry('v2.plugin')).toBeUndefined();
  });

  it('calls onDeactivate then onUninstall for active v2 plugins', () => {
    const order: string[] = [];
    registerPluginV2(
      makeV2('uninstall.order', {
        onDeactivate: () => order.push('deactivate'),
        onUninstall: () => order.push('uninstall'),
      }),
    );
    unregisterPluginV2('uninstall.order');
    expect(order).toEqual(['deactivate', 'uninstall']);
  });

  it('emits plugin:uninstall', () => {
    const uninstalls: string[] = [];
    pluginEventBus.on('plugin:uninstall', (p) => uninstalls.push(p.pluginId));
    registerPluginV2(makeV2('uninstall.emit'));
    unregisterPluginV2('uninstall.emit');
    expect(uninstalls).toEqual(['uninstall.emit']);
  });
});

// ── getRegistryEntries / getRegistryEntry / getActivePlugins ───────────────

describe('registry queries', () => {
  it('getRegistryEntries returns all entries', () => {
    registerPluginV2(makeV1('a'));
    registerPluginV2(makeV2('b'));
    expect(getRegistryEntries()).toHaveLength(2);
  });

  it('getRegistryEntry returns undefined for missing id', () => {
    expect(getRegistryEntry('missing')).toBeUndefined();
  });

  it('getActivePlugins excludes deactivated plugins', () => {
    registerPluginV2(makeV1('active'));
    registerPluginV2(makeV2('inactive'));
    deactivatePlugin('inactive');
    const active = getActivePlugins();
    expect(active.map((p) => p.id)).toEqual(['active']);
  });

  it('getActivePlugins returns empty array when registry is empty', () => {
    expect(getActivePlugins()).toHaveLength(0);
  });
});

// ── pluginEventBus — once() and listenerCount() ────────────────────────────

describe('pluginEventBus.once()', () => {
  it('fires exactly once', () => {
    let count = 0;
    pluginEventBus.once('project:save', () => {
      count++;
    });
    pluginEventBus.emit('project:save', { projectName: 'a' });
    pluginEventBus.emit('project:save', { projectName: 'b' });
    expect(count).toBe(1);
  });

  it('receives the correct payload', () => {
    let name = '';
    pluginEventBus.once('project:save', (p) => {
      name = p.projectName;
    });
    pluginEventBus.emit('project:save', { projectName: 'once-payload' });
    expect(name).toBe('once-payload');
  });

  it('returned off() cancels before firing', () => {
    let count = 0;
    const off = pluginEventBus.once('project:save', () => {
      count++;
    });
    off();
    pluginEventBus.emit('project:save', { projectName: 'cancelled' });
    expect(count).toBe(0);
  });
});

describe('pluginEventBus.listenerCount()', () => {
  it('returns 0 when no handlers registered', () => {
    expect(pluginEventBus.listenerCount('project:save')).toBe(0);
  });

  it('counts registered handlers', () => {
    const off1 = pluginEventBus.on('project:save', () => undefined);
    const off2 = pluginEventBus.on('project:save', () => undefined);
    expect(pluginEventBus.listenerCount('project:save')).toBe(2);
    off1();
    off2();
  });

  it('decrements after off()', () => {
    const off = pluginEventBus.on('project:save', () => undefined);
    expect(pluginEventBus.listenerCount('project:save')).toBe(1);
    off();
    expect(pluginEventBus.listenerCount('project:save')).toBe(0);
  });
});
