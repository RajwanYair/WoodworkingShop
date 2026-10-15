import { describe, expect, it } from 'vitest';
import { SLICE_PERSIST_VERSION, versionedPersistOptions } from '../../../src/store/slices/versionedPersist';

describe('versionedPersistOptions', () => {
  it('versions each slice and keeps version 0 data', () => {
    const options = versionedPersistOptions<{ materials: string[] }>('custom-materials');
    const stored = { materials: ['oak'] };

    expect(options.name).toBe('custom-materials');
    expect(options.version).toBe(SLICE_PERSIST_VERSION);
    expect(options.migrate?.(stored, 0)).toEqual(stored);
    expect(options.migrate?.(stored, 1)).toEqual(stored);
  });
});
