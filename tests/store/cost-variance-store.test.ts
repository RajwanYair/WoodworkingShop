import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCostVarianceStore } from '../../src/store/cost-variance-store';

describe('useCostVarianceStore', () => {
  beforeEach(() => {
    useCostVarianceStore.getState().clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets and replaces an actual material cost', () => {
    const store = useCostVarianceStore.getState();

    store.setActualCost('birch-ply', 42.5);
    store.setActualCost('birch-ply', 47);

    expect(useCostVarianceStore.getState().actualCosts).toEqual({ 'birch-ply': 47 });
  });

  it('removes one cost and clears all remaining costs', () => {
    const store = useCostVarianceStore.getState();
    store.setActualCost('birch-ply', 42.5);
    store.setActualCost('oak-ply', 55);

    store.removeActualCost('birch-ply');
    expect(useCostVarianceStore.getState().actualCosts).toEqual({ 'oak-ply': 55 });

    useCostVarianceStore.getState().clearAll();
    expect(useCostVarianceStore.getState().actualCosts).toEqual({});
  });

  it('keeps the action usable when browser storage quota is exceeded', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    expect(() => useCostVarianceStore.getState().setActualCost('birch-ply', 42.5)).not.toThrow();
    expect(useCostVarianceStore.getState().actualCosts).toEqual({ 'birch-ply': 42.5 });
  });
});
