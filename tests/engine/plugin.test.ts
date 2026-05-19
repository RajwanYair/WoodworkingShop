import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerPlugin,
  unregisterPlugin,
  getPlugins,
  applyPartsPlugins,
  applyConfigPlugins,
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

  it('throws when registering duplicate id', () => {
    const plugin: CabinetPlannerPlugin = { id: 'dupe', name: 'Dupe', version: '1.0.0' };
    registerPlugin(plugin);
    expect(() => registerPlugin({ ...plugin })).toThrow('already registered');
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
