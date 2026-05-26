import { describe, it, expect } from 'vitest';
import {
  createRegistry,
  registerPlugin,
  installPlugin,
  uninstallPlugin,
  enablePlugin,
  disablePlugin,
  markPluginError,
  searchPlugins,
  getInstalledPlugins,
  getEnabledPlugins,
  filterByCategory,
  getTopPlugins,
} from '../../src/engine/plugin-marketplace';
import type { MarketplaceEntry } from '../../src/engine/plugin-marketplace';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEntry(id: string, overrides: Partial<MarketplaceEntry> = {}): MarketplaceEntry {
  return {
    id,
    name: `Plugin ${id}`,
    description: `Description for ${id}`,
    version: '1.0.0',
    author: 'Test Author',
    source: 'community',
    category: 'export',
    packageUrl: `https://example.com/${id}.tgz`,
    apiVersionRange: '>=1.0.0',
    publishedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ─── createRegistry ───────────────────────────────────────────────────────────

describe('createRegistry', () => {
  it('returns an empty registry', () => {
    const reg = createRegistry();
    expect(reg.catalog).toHaveLength(0);
    expect(Object.keys(reg.installed)).toHaveLength(0);
  });
});

// ─── registerPlugin ───────────────────────────────────────────────────────────

describe('registerPlugin', () => {
  it('adds an entry to the catalog', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.plugin1'));
    expect(reg.catalog).toHaveLength(1);
    expect(reg.catalog[0]?.id).toBe('com.test.plugin1');
  });

  it('throws RangeError for duplicate plugin id', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.p1'));
    expect(() => registerPlugin(reg, makeEntry('com.test.p1'))).toThrow(RangeError);
  });

  it.each([
    ['empty id', { id: '', name: 'Valid' }],
    ['empty name', { id: 'com.test.x', name: '' }],
  ])('throws RangeError for %s', (_label, overrides) => {
    const reg = createRegistry();
    expect(() => registerPlugin(reg, makeEntry('', overrides))).toThrow(RangeError);
  });
});

// ─── installPlugin ────────────────────────────────────────────────────────────

describe('installPlugin', () => {
  it('adds an installation record with state=installed', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.p1'));
    reg = installPlugin(reg, 'com.test.p1');
    expect(reg.installed['com.test.p1']?.state).toBe('installed');
    expect(reg.installed['com.test.p1']?.installedVersion).toBe('1.0.0');
  });

  it('throws RangeError for unknown plugin id', () => {
    const reg = createRegistry();
    expect(() => installPlugin(reg, 'ghost')).toThrow(RangeError);
  });

  it('throws RangeError if already installed', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.p1'));
    reg = installPlugin(reg, 'com.test.p1');
    expect(() => installPlugin(reg, 'com.test.p1')).toThrow(RangeError);
  });
});

// ─── uninstallPlugin ──────────────────────────────────────────────────────────

describe('uninstallPlugin', () => {
  it('removes the installation record', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.p1'));
    reg = installPlugin(reg, 'com.test.p1');
    reg = uninstallPlugin(reg, 'com.test.p1');
    expect(reg.installed['com.test.p1']).toBeUndefined();
  });

  it('throws RangeError for unknown id', () => {
    const reg = createRegistry();
    expect(() => uninstallPlugin(reg, 'ghost')).toThrow(RangeError);
  });
});

// ─── enablePlugin / disablePlugin ────────────────────────────────────────────

describe('enablePlugin', () => {
  it('transitions installed → enabled', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.p1'));
    reg = installPlugin(reg, 'com.test.p1');
    reg = enablePlugin(reg, 'com.test.p1');
    expect(reg.installed['com.test.p1']?.state).toBe('enabled');
  });

  it('transitions disabled → enabled', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.p1'));
    reg = installPlugin(reg, 'com.test.p1');
    reg = enablePlugin(reg, 'com.test.p1');
    reg = disablePlugin(reg, 'com.test.p1');
    reg = enablePlugin(reg, 'com.test.p1');
    expect(reg.installed['com.test.p1']?.state).toBe('enabled');
  });

  it('throws RangeError if already enabled', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.p1'));
    reg = installPlugin(reg, 'com.test.p1');
    reg = enablePlugin(reg, 'com.test.p1');
    expect(() => enablePlugin(reg, 'com.test.p1')).toThrow(RangeError);
  });
});

describe('disablePlugin', () => {
  it('transitions enabled → disabled', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.p1'));
    reg = installPlugin(reg, 'com.test.p1');
    reg = enablePlugin(reg, 'com.test.p1');
    reg = disablePlugin(reg, 'com.test.p1');
    expect(reg.installed['com.test.p1']?.state).toBe('disabled');
  });

  it('throws RangeError if not enabled', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.p1'));
    reg = installPlugin(reg, 'com.test.p1');
    expect(() => disablePlugin(reg, 'com.test.p1')).toThrow(RangeError);
  });
});

// ─── markPluginError ──────────────────────────────────────────────────────────

describe('markPluginError', () => {
  it('sets state to error with message', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.p1'));
    reg = installPlugin(reg, 'com.test.p1');
    reg = markPluginError(reg, 'com.test.p1', 'Incompatible API version');
    expect(reg.installed['com.test.p1']?.state).toBe('error');
    expect(reg.installed['com.test.p1']?.errorMessage).toBe('Incompatible API version');
  });

  it('throws RangeError for unknown id', () => {
    const reg = createRegistry();
    expect(() => markPluginError(reg, 'ghost', 'err')).toThrow(RangeError);
  });

  it('throws RangeError on enablePlugin when in error state', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.p1'));
    reg = installPlugin(reg, 'com.test.p1');
    reg = markPluginError(reg, 'com.test.p1', 'crash');
    expect(() => enablePlugin(reg, 'com.test.p1')).toThrow(RangeError);
  });
});

// ─── searchPlugins ────────────────────────────────────────────────────────────

describe('searchPlugins', () => {
  it('returns all entries for empty query', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.p1', { name: 'DXF Exporter' }));
    reg = registerPlugin(reg, makeEntry('com.test.p2', { name: 'PDF Builder' }));
    expect(searchPlugins(reg, '')).toHaveLength(2);
  });

  it('finds by name match', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.dxf', { name: 'DXF Exporter' }));
    reg = registerPlugin(reg, makeEntry('com.test.pdf', { name: 'PDF Builder' }));
    const results = searchPlugins(reg, 'dxf');
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('com.test.dxf');
  });

  it('ranks name matches above description matches', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.a', { name: 'Something', description: 'optimizer tool' }));
    reg = registerPlugin(reg, makeEntry('com.test.b', { name: 'Optimizer Pro', description: 'fast cuts' }));
    const results = searchPlugins(reg, 'optimizer');
    expect(results[0]?.id).toBe('com.test.b');
  });

  it('returns empty array when no matches', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.p1', { name: 'DXF Exporter' }));
    expect(searchPlugins(reg, 'quantum-physics')).toHaveLength(0);
  });
});

// ─── getInstalledPlugins / getEnabledPlugins ──────────────────────────────────

describe('getInstalledPlugins / getEnabledPlugins', () => {
  it('getInstalledPlugins returns all installed records', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.p1'));
    reg = registerPlugin(reg, makeEntry('com.test.p2'));
    reg = installPlugin(reg, 'com.test.p1');
    expect(getInstalledPlugins(reg)).toHaveLength(1);
  });

  it('getEnabledPlugins returns only enabled records', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.p1'));
    reg = registerPlugin(reg, makeEntry('com.test.p2'));
    reg = installPlugin(reg, 'com.test.p1');
    reg = installPlugin(reg, 'com.test.p2');
    reg = enablePlugin(reg, 'com.test.p1');
    expect(getEnabledPlugins(reg)).toHaveLength(1);
    expect(getEnabledPlugins(reg)[0]?.id).toBe('com.test.p1');
  });
});

// ─── filterByCategory ─────────────────────────────────────────────────────────

describe('filterByCategory', () => {
  it('returns only entries matching the given category', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.e1', { category: 'export' }));
    reg = registerPlugin(reg, makeEntry('com.test.v1', { category: 'visualization' }));
    const results = filterByCategory(reg, 'visualization');
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('com.test.v1');
  });
});

// ─── getTopPlugins ────────────────────────────────────────────────────────────

describe('getTopPlugins', () => {
  it('returns entries sorted by installCount descending', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.a', { installCount: 50 }));
    reg = registerPlugin(reg, makeEntry('com.test.b', { installCount: 200 }));
    reg = registerPlugin(reg, makeEntry('com.test.c', { installCount: 10 }));
    const top = getTopPlugins(reg, 2);
    expect(top[0]?.id).toBe('com.test.b');
    expect(top[1]?.id).toBe('com.test.a');
  });

  it('excludes entries with no installCount', () => {
    let reg = createRegistry();
    reg = registerPlugin(reg, makeEntry('com.test.a'));
    reg = registerPlugin(reg, makeEntry('com.test.b', { installCount: 5 }));
    expect(getTopPlugins(reg)).toHaveLength(1);
  });
});
