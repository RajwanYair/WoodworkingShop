/**
 * Plugin Marketplace — Sprint 18
 *
 * Tests for src/utils/plugin-marketplace.ts
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import {
  validateCatalog,
  fetchMarketplaceCatalog,
  loadCachedCatalog,
  clearCatalogCache,
  searchPlugins,
  getInstalledPluginIds,
  isPluginInstalled,
  installPlugin,
  uninstallPlugin,
  clearInstalledPlugins,
} from '../../src/utils/plugin-marketplace';
import type { MarketplaceCatalog, MarketplacePlugin } from '../../src/utils/plugin-marketplace';

// ── localStorage stub ─────────────────────────────────────────────────────────
const localStorageMock = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };
})();

beforeAll(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function makePlugin(id: string, overrides: Partial<MarketplacePlugin> = {}): MarketplacePlugin {
  return {
    id,
    name: `Plugin ${id}`,
    description: `Description for ${id}`,
    version: '1.0.0',
    author: 'Test Author',
    category: 'utility',
    packageUrl: `https://example.com/${id}`,
    publishedAt: '2025-01-01T00:00:00Z',
    minApiVersion: '1.0.0',
    ...overrides,
  };
}

function makeCatalog(plugins: MarketplacePlugin[] = []): MarketplaceCatalog {
  return { version: '1.0', fetchedAt: '2025-01-01T00:00:00Z', plugins };
}

async function resetStore() {
  await clearCatalogCache();
}

// ── validateCatalog ───────────────────────────────────────────────────────────

describe('validateCatalog', () => {
  it('returns true for valid catalog', () => {
    expect(validateCatalog(makeCatalog())).toBe(true);
  });

  it('returns false for null', () => {
    expect(validateCatalog(null)).toBe(false);
  });

  it('returns false when plugins is missing', () => {
    expect(validateCatalog({ version: '1', fetchedAt: '' })).toBe(false);
  });

  it('returns false when version is not a string', () => {
    expect(validateCatalog({ version: 1, fetchedAt: '', plugins: [] })).toBe(false);
  });
});

// ── fetchMarketplaceCatalog ───────────────────────────────────────────────────

describe('fetchMarketplaceCatalog', () => {
  beforeEach(resetStore);
  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });
  });

  it('fetches and caches catalog', async () => {
    const catalog = makeCatalog([makePlugin('p1')]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(catalog),
      }),
    );
    const result = await fetchMarketplaceCatalog('https://example.com/catalog.json');
    expect(result.plugins).toHaveLength(1);
  });

  it('throws on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchMarketplaceCatalog('https://example.com/catalog.json')).rejects.toThrow('404');
  });

  it('throws on invalid payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: true }),
      }),
    );
    await expect(fetchMarketplaceCatalog('https://example.com/catalog.json')).rejects.toThrow('invalid format');
  });
});

// ── loadCachedCatalog ─────────────────────────────────────────────────────────

describe('loadCachedCatalog', () => {
  beforeEach(resetStore);

  it('returns null when nothing is cached', async () => {
    expect(await loadCachedCatalog()).toBeNull();
  });

  it('returns cached catalog after fetch', async () => {
    const catalog = makeCatalog([makePlugin('cached')]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(catalog),
      }),
    );
    await fetchMarketplaceCatalog('https://example.com/catalog.json');
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });
    const cached = await loadCachedCatalog();
    expect(cached).not.toBeNull();
    expect(cached!.plugins).toHaveLength(1);
  });
});

// ── searchPlugins ─────────────────────────────────────────────────────────────

describe('searchPlugins', () => {
  const catalog = makeCatalog([
    makePlugin('export-svg', { name: 'SVG Exporter', category: 'export', tags: ['svg', 'vector'] }),
    makePlugin('theme-dark', { name: 'Dark Theme', category: 'theme', author: 'ThemeAuthor' }),
    makePlugin('utility-calc', { name: 'Calculator', description: 'Useful math utility', category: 'utility' }),
  ]);

  it('returns all plugins when query is empty', () => {
    expect(searchPlugins(catalog, '')).toHaveLength(3);
  });

  it('filters by category', () => {
    const results = searchPlugins(catalog, '', 'export');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('export-svg');
  });

  it('matches by plugin name', () => {
    const results = searchPlugins(catalog, 'dark');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('theme-dark');
  });

  it('matches by tag', () => {
    const results = searchPlugins(catalog, 'vector');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('export-svg');
  });

  it('matches by author', () => {
    const results = searchPlugins(catalog, 'themeauthor');
    expect(results[0].author).toBe('ThemeAuthor');
  });

  it('matches by description', () => {
    const results = searchPlugins(catalog, 'math');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('utility-calc');
  });

  it('returns empty when nothing matches', () => {
    expect(searchPlugins(catalog, 'xxxxxxxx')).toHaveLength(0);
  });

  it('combines category and query filter', () => {
    const results = searchPlugins(catalog, 'svg', 'export');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('export-svg');
    // same query, wrong category → no results
    expect(searchPlugins(catalog, 'svg', 'theme')).toHaveLength(0);
  });
});

// ── install / uninstall ───────────────────────────────────────────────────────

describe('installPlugin / uninstallPlugin', () => {
  beforeEach(() => clearInstalledPlugins());

  it('returns empty list initially', () => {
    expect(getInstalledPluginIds()).toHaveLength(0);
  });

  it('installs a plugin', () => {
    installPlugin('plugin-a');
    expect(isPluginInstalled('plugin-a')).toBe(true);
  });

  it('uninstalls a plugin', () => {
    installPlugin('plugin-b');
    uninstallPlugin('plugin-b');
    expect(isPluginInstalled('plugin-b')).toBe(false);
  });

  it('does not duplicate on re-install', () => {
    installPlugin('plugin-c');
    installPlugin('plugin-c');
    expect(getInstalledPluginIds().filter((id) => id === 'plugin-c')).toHaveLength(1);
  });

  it('clearInstalledPlugins removes all', () => {
    installPlugin('a');
    installPlugin('b');
    clearInstalledPlugins();
    expect(getInstalledPluginIds()).toHaveLength(0);
  });
});
