import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSavedConfigs, saveConfig, deleteSavedConfig } from '../../src/utils/local-storage';
import { cfg } from '../helpers';

// Mock indexed-db-storage with an in-memory implementation so tests don't
// require a real IndexedDB environment.
const memStore: Record<string, unknown[]> = {};
vi.mock('../../src/utils/indexed-db-storage', () => ({
  idbLoadConfigs: vi.fn(async () => memStore['configs'] ?? []),
  idbSaveConfigs: vi.fn(async (data: unknown[]) => {
    memStore['configs'] = data;
  }),
  // Provide stubs for other exports used by indexed-db-storage consumers
  idbLoadProjects: vi.fn(async () => []),
  idbSaveProjects: vi.fn(async () => {}),
  idbLoadSnapshots: vi.fn(async () => []),
  idbSaveSnapshots: vi.fn(async () => {}),
  idbDeleteSnapshot: vi.fn(async () => {}),
  getStorageEstimate: vi.fn(async () => ({
    usedBytes: 0,
    quotaBytes: 0,
    usedKb: 0,
    quotaMb: 0,
    percentUsed: 0,
    nearLimit: false,
  })),
}));

describe('local-storage', () => {
  beforeEach(() => {
    memStore['configs'] = [];
    // Reset module-level cache by re-importing — vitest caches modules across
    // tests, so we reset the in-memory store above and rely on idbLoadConfigs
    // returning fresh data each test.
    vi.clearAllMocks();
    memStore['configs'] = [];
  });

  describe('loadSavedConfigs', () => {
    it('returns empty array when nothing is stored', async () => {
      expect(await loadSavedConfigs()).toEqual([]);
    });

    it('returns stored configs', async () => {
      const data = [{ id: '1', name: 'Test', config: cfg(), savedAt: new Date().toISOString() }];
      memStore['configs'] = data;
      const result = await loadSavedConfigs();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test');
    });
  });

  describe('saveConfig', () => {
    it('persists a config and returns it with id and timestamp', async () => {
      const mockUUID = '550e8400-e29b-41d4-a716-446655440000';
      vi.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID as `${string}-${string}-${string}-${string}-${string}`);

      const result = await saveConfig('My Cabinet', cfg());
      expect(result.id).toBe(mockUUID);
      expect(result.name).toBe('My Cabinet');
      expect(result.savedAt).toBeTruthy();
      expect(result.config.width).toBe(cfg().width);

      vi.restoreAllMocks();
    });

    it('appends to existing configs', async () => {
      await saveConfig('First', cfg());
      await saveConfig('Second', cfg({ width: 500 }));
      const loaded = await loadSavedConfigs();
      expect(loaded).toHaveLength(2);
      expect(loaded[0].name).toBe('First');
      expect(loaded[1].name).toBe('Second');
    });
  });

  describe('deleteSavedConfig', () => {
    it('removes a config by ID', async () => {
      const saved = await saveConfig('ToDelete', cfg());
      await deleteSavedConfig(saved.id);
      const loaded = await loadSavedConfigs();
      expect(loaded).toHaveLength(0);
    });

    it('leaves other configs intact', async () => {
      const a = await saveConfig('Keep', cfg());
      const b = await saveConfig('Remove', cfg());
      await deleteSavedConfig(b.id);
      const loaded = await loadSavedConfigs();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe(a.id);
    });

    it('is a no-op when ID does not exist', async () => {
      await saveConfig('Safe', cfg());
      await deleteSavedConfig('nonexistent-id');
      const loaded = await loadSavedConfigs();
      expect(loaded).toHaveLength(1);
    });
  });
});
