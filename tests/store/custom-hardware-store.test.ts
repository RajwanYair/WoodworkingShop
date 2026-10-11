import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('zustand/middleware', async () => {
  const actual = await vi.importActual<typeof import('zustand/middleware')>('zustand/middleware');
  return {
    ...actual,
    persist: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

import { HARDWARE_CATALOG_SCHEMA_VERSION, type HardwareItem } from '../../src/engine/hardware-catalog';
import { useCustomHardwareStore } from '../../src/store/custom-hardware-store';

const hinge: HardwareItem = {
  id: 'hinge-1',
  name: 'Soft-close hinge',
  category: 'hinge',
  sku: 'SC-1',
  manufacturer: 'Workshop',
  unitPrice: 2.5,
  packSize: 1,
  description: 'Test hinge',
  tags: ['soft-close'],
};

function catalog(items: unknown[]) {
  return { schemaVersion: HARDWARE_CATALOG_SCHEMA_VERSION, items };
}

describe('custom-hardware-store', () => {
  beforeEach(() => {
    useCustomHardwareStore.setState({ items: [] });
  });

  it('merges imported items by ID and appends new hardware', () => {
    const updated = { ...hinge, name: 'Updated hinge' };
    useCustomHardwareStore.getState().importCatalog(catalog([hinge]), 'replace');
    useCustomHardwareStore.getState().importCatalog(catalog([updated, { ...hinge, id: 'handle-1' }]), 'merge');

    expect(useCustomHardwareStore.getState().items).toEqual([updated, { ...hinge, id: 'handle-1' }]);
  });

  it('replaces all custom hardware when replace mode is selected', () => {
    useCustomHardwareStore.getState().importCatalog(catalog([hinge]), 'replace');
    const replacement = { ...hinge, id: 'handle-1', category: 'handle' as const };
    useCustomHardwareStore.getState().importCatalog(catalog([replacement]), 'replace');

    expect(useCustomHardwareStore.getState().items).toEqual([replacement]);
  });

  it('does not partially update the store when any imported row is invalid', () => {
    useCustomHardwareStore.getState().importCatalog(catalog([hinge]), 'replace');
    const previousItems = useCustomHardwareStore.getState().items;

    expect(() =>
      useCustomHardwareStore.getState().importCatalog(catalog([hinge, { ...hinge, id: '' }]), 'replace'),
    ).toThrow('Invalid hardware item at index 1');
    expect(useCustomHardwareStore.getState().items).toBe(previousItems);
  });
});
