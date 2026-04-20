import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSavedConfigs, saveConfig, deleteSavedConfig } from '../../src/utils/local-storage';
import { cfg } from '../helpers';

const STORAGE_KEY = 'cabinet-planner-saved-configs';

// Simple in-memory localStorage mock
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

describe('local-storage', () => {
  beforeEach(() => {
    delete store[STORAGE_KEY];
  });

  describe('loadSavedConfigs', () => {
    it('returns empty array when nothing is stored', () => {
      expect(loadSavedConfigs()).toEqual([]);
    });

    it('returns empty array when stored value is not an array', () => {
      localStorage.setItem('cabinet-planner-saved-configs', JSON.stringify({ not: 'array' }));
      expect(loadSavedConfigs()).toEqual([]);
    });

    it('returns empty array when stored value is invalid JSON', () => {
      localStorage.setItem('cabinet-planner-saved-configs', 'not-json{{');
      expect(loadSavedConfigs()).toEqual([]);
    });

    it('returns stored configs', () => {
      const data = [{ id: '1', name: 'Test', config: cfg(), savedAt: new Date().toISOString() }];
      localStorage.setItem('cabinet-planner-saved-configs', JSON.stringify(data));
      const result = loadSavedConfigs();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test');
    });
  });

  describe('saveConfig', () => {
    it('persists a config and returns it with id and timestamp', () => {
      const mockUUID = '550e8400-e29b-41d4-a716-446655440000';
      vi.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID as `${string}-${string}-${string}-${string}-${string}`);

      const result = saveConfig('My Cabinet', cfg());
      expect(result.id).toBe(mockUUID);
      expect(result.name).toBe('My Cabinet');
      expect(result.savedAt).toBeTruthy();
      expect(result.config.width).toBe(cfg().width);

      // Verify it's persisted
      const loaded = loadSavedConfigs();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('My Cabinet');

      vi.restoreAllMocks();
    });

    it('appends to existing configs', () => {
      saveConfig('First', cfg());
      saveConfig('Second', cfg({ width: 500 }));
      const loaded = loadSavedConfigs();
      expect(loaded).toHaveLength(2);
      expect(loaded[0].name).toBe('First');
      expect(loaded[1].name).toBe('Second');
    });
  });

  describe('deleteSavedConfig', () => {
    it('removes a config by ID', () => {
      const saved = saveConfig('ToDelete', cfg());
      expect(loadSavedConfigs()).toHaveLength(1);
      deleteSavedConfig(saved.id);
      expect(loadSavedConfigs()).toHaveLength(0);
    });

    it('leaves other configs intact', () => {
      const a = saveConfig('Keep', cfg());
      const b = saveConfig('Remove', cfg());
      deleteSavedConfig(b.id);
      const loaded = loadSavedConfigs();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe(a.id);
    });

    it('is a no-op when ID does not exist', () => {
      saveConfig('Safe', cfg());
      deleteSavedConfig('nonexistent-id');
      expect(loadSavedConfigs()).toHaveLength(1);
    });
  });
});
