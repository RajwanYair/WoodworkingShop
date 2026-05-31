import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerPlugin,
  unregisterPlugin,
  getPlugins,
  applyPartsPlugins,
  applyConfigPlugins,
  getPluginContract,
  comparePluginApiVersions,
  getPluginApiCompatibility,
  PLUGIN_API_VERSION,
  PLUGIN_CONTRACT,
  type CabinetPlannerPlugin,
} from '../../src/engine/plugin';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import type { Part } from '../../src/engine/types';

const mockPart: Part = {
  id: 'P01',
  name: { en: 'Side Panel', he: 'לוח צד' },
  qty: 2,
  material: 'melamine-18',
  thickness: 18,
  length: 720,
  width: 580,
  edgeBanding: { en: 'none', he: 'אין' },
};

beforeEach(() => {
  // Reset the registry before each test
  for (const p of [...getPlugins()]) {
    unregisterPlugin(p.id);
  }
});

describe('Plugin registry', () => {
  it('starts empty', () => {
    expect(getPlugins().length).toBe(0);
  });

  it('registers a plugin', () => {
    const plugin: CabinetPlannerPlugin = { id: 'test.plugin', name: 'Test', version: '1.0.0' };
    registerPlugin(plugin);
    expect(getPlugins()).toHaveLength(1);
    expect(getPlugins()[0].id).toBe('test.plugin');
  });

  it('returns an error result when registering duplicate id', () => {
    const plugin: CabinetPlannerPlugin = { id: 'dupe', name: 'Dupe', version: '1.0.0' };
    registerPlugin(plugin);
    const result = registerPlugin({ ...plugin });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch('already registered');
  });

  it('unregisters a plugin', () => {
    registerPlugin({ id: 'removable', name: 'R', version: '1.0.0' });
    expect(getPlugins()).toHaveLength(1);
    unregisterPlugin('removable');
    expect(getPlugins()).toHaveLength(0);
  });

  it('unregister is a no-op for unknown id', () => {
    expect(() => unregisterPlugin('ghost')).not.toThrow();
  });

  it('getPlugins returns the registered plugin list', () => {
    registerPlugin({ id: 'list-test', name: 'L', version: '1.0.0' });
    const snap = getPlugins();
    expect(snap.some((p) => p.id === 'list-test')).toBe(true);
    // Cleanup
    unregisterPlugin('list-test');
  });
});

describe('applyPartsPlugins', () => {
  it('returns parts unchanged when no plugins registered', () => {
    const result = applyPartsPlugins([mockPart], DEFAULT_CONFIG);
    expect(result).toEqual([mockPart]);
  });

  it('applies onPartsGenerated hook', () => {
    const extraPart: Part = { ...mockPart, id: 'P99', name: { en: 'Extra', he: 'נוסף' } };
    registerPlugin({
      id: 'parts.adder',
      name: 'Parts Adder',
      version: '1.0.0',
      onPartsGenerated: (parts) => [...parts, extraPart],
    });
    const result = applyPartsPlugins([mockPart], DEFAULT_CONFIG);
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('P99');
  });

  it('chains multiple onPartsGenerated hooks in order', () => {
    const log: string[] = [];
    registerPlugin({
      id: 'first',
      name: 'First',
      version: '1.0.0',
      onPartsGenerated: (parts) => {
        log.push('first');
        return parts;
      },
    });
    registerPlugin({
      id: 'second',
      name: 'Second',
      version: '1.0.0',
      onPartsGenerated: (parts) => {
        log.push('second');
        return parts;
      },
    });
    applyPartsPlugins([mockPart], DEFAULT_CONFIG);
    expect(log).toEqual(['first', 'second']);
  });
});

describe('applyConfigPlugins', () => {
  it('returns config unchanged when no plugins registered', () => {
    const result = applyConfigPlugins(DEFAULT_CONFIG);
    expect(result).toBe(DEFAULT_CONFIG);
  });

  it('applies onConfigChange hook', () => {
    registerPlugin({
      id: 'config.forcer',
      name: 'Config Forcer',
      version: '1.0.0',
      onConfigChange: (cfg) => ({ ...cfg, width: 999 }),
    });
    const result = applyConfigPlugins(DEFAULT_CONFIG);
    expect(result.width).toBe(999);
  });

  it('chains multiple onConfigChange hooks', () => {
    registerPlugin({
      id: 'cfg.a',
      name: 'A',
      version: '1.0.0',
      onConfigChange: (cfg) => ({ ...cfg, width: 100 }),
    });
    registerPlugin({
      id: 'cfg.b',
      name: 'B',
      version: '1.0.0',
      onConfigChange: (cfg) => ({ ...cfg, height: 200 }),
    });
    const result = applyConfigPlugins(DEFAULT_CONFIG);
    expect(result.width).toBe(100);
    expect(result.height).toBe(200);
  });
});

describe('PluginContract', () => {
  it('PLUGIN_API_VERSION is independent semver', () => {
    expect(PLUGIN_API_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(PLUGIN_CONTRACT.apiVersion).toBe(PLUGIN_API_VERSION);
  });

  it('PLUGIN_CONTRACT has apiVersion string', () => {
    expect(typeof PLUGIN_CONTRACT.apiVersion).toBe('string');
    expect(PLUGIN_CONTRACT.apiVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('PLUGIN_CONTRACT.stability is a valid tier', () => {
    expect(['stable', 'experimental', 'deprecated']).toContain(PLUGIN_CONTRACT.stability);
  });

  it('PLUGIN_CONTRACT.hooks is a non-empty array', () => {
    expect(Array.isArray(PLUGIN_CONTRACT.hooks)).toBe(true);
    expect(PLUGIN_CONTRACT.hooks.length).toBeGreaterThan(0);
  });

  it('every hook contract has a hookName, stability, introducedIn, and description', () => {
    for (const hook of PLUGIN_CONTRACT.hooks) {
      expect(typeof hook.hookName).toBe('string');
      expect(['stable', 'experimental', 'deprecated']).toContain(hook.stability);
      expect(typeof hook.introducedIn).toBe('string');
      expect(typeof hook.description).toBe('string');
      expect(hook.description.length).toBeGreaterThan(10);
    }
  });

  it('getPluginContract() returns the same object as PLUGIN_CONTRACT', () => {
    expect(getPluginContract()).toBe(PLUGIN_CONTRACT);
  });

  it('onPartsGenerated hook is listed as stable', () => {
    const hook = PLUGIN_CONTRACT.hooks.find((h) => h.hookName === 'onPartsGenerated');
    expect(hook).toBeDefined();
    expect(hook?.stability).toBe('stable');
  });

  it('onConfigChange hook is listed as stable', () => {
    const hook = PLUGIN_CONTRACT.hooks.find((h) => h.hookName === 'onConfigChange');
    expect(hook).toBeDefined();
    expect(hook?.stability).toBe('stable');
  });
});

describe('plugin API semver helpers', () => {
  it.each([
    ['1.0.0', '1.0.0', 0],
    ['1.2.0', '1.1.9', 1],
    ['1.1.9', '1.2.0', -1],
    ['2.0.0', '1.9.9', 1],
  ] as const)('comparePluginApiVersions(%s, %s) -> %s', (left, right, expected) => {
    const result = comparePluginApiVersions(left, right);
    expect(Math.sign(result)).toBe(Math.sign(expected));
  });

  it('comparePluginApiVersions throws RangeError for invalid semver', () => {
    expect(() => comparePluginApiVersions('1.0', '1.0.0')).toThrow(RangeError);
  });

  it.each([
    ['1.0.0', '1.2.0', true, 'satisfied'],
    ['1.2.0', '1.2.0', true, 'satisfied'],
    ['1.2.1', '1.2.0', false, 'requires-newer-api'],
    ['1.x.0', '1.2.0', false, 'invalid-version'],
  ] as const)(
    'getPluginApiCompatibility(%s, %s) -> compatible=%s, reason=%s',
    (requiredVersion, currentVersion, compatible, reason) => {
      const result = getPluginApiCompatibility(requiredVersion, currentVersion);
      expect(result.compatible).toBe(compatible);
      expect(result.reason).toBe(reason);
    },
  );
});
