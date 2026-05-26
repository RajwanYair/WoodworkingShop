import { describe, it, expect } from 'vitest';
import {
  createFeatureRegistry,
  registerFeature,
  isFeatureEnabled,
  setFeatureEnabled,
  getFeatureChunks,
  resolveLoadOrder,
  estimateBundleImpact,
  getFeaturesByPriority,
} from '../../src/engine/lazy-features';
import type { LazyFeature, FeatureFlag } from '../../src/engine/lazy-features';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFeature(flag: FeatureFlag, overrides: Partial<LazyFeature> = {}): LazyFeature {
  return {
    flag,
    label: `Feature ${flag}`,
    enabled: true,
    chunks: [`chunks/${flag}.js`],
    estimatedBytes: 50000,
    priority: 'normal',
    registeredAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ─── createFeatureRegistry ────────────────────────────────────────────────────

describe('createFeatureRegistry', () => {
  it('returns an empty registry', () => {
    const reg = createFeatureRegistry();
    expect(Object.keys(reg.features)).toHaveLength(0);
  });
});

// ─── registerFeature ──────────────────────────────────────────────────────────

describe('registerFeature', () => {
  it('adds a feature to the registry', () => {
    let reg = createFeatureRegistry();
    reg = registerFeature(reg, makeFeature('pdf-export'));
    expect(reg.features['pdf-export']).toBeDefined();
  });

  it('throws RangeError on duplicate flag', () => {
    let reg = createFeatureRegistry();
    reg = registerFeature(reg, makeFeature('pdf-export'));
    expect(() => registerFeature(reg, makeFeature('pdf-export'))).toThrow(RangeError);
  });

  it.each([
    ['empty flag', { flag: '' as FeatureFlag, label: 'ok' }],
    ['empty label', { label: '' }],
  ] as const)('throws RangeError for %s', (_label, overrides) => {
    const reg = createFeatureRegistry();
    expect(() => registerFeature(reg, makeFeature('pdf-export', overrides))).toThrow(RangeError);
  });
});

// ─── isFeatureEnabled ─────────────────────────────────────────────────────────

describe('isFeatureEnabled', () => {
  it('returns true for an enabled feature', () => {
    let reg = createFeatureRegistry();
    reg = registerFeature(reg, makeFeature('pdf-export', { enabled: true }));
    expect(isFeatureEnabled(reg, 'pdf-export')).toBe(true);
  });

  it('returns false for a disabled feature', () => {
    let reg = createFeatureRegistry();
    reg = registerFeature(reg, makeFeature('pdf-export', { enabled: false }));
    expect(isFeatureEnabled(reg, 'pdf-export')).toBe(false);
  });

  it('throws RangeError for unregistered flag', () => {
    const reg = createFeatureRegistry();
    expect(() => isFeatureEnabled(reg, 'pdf-export')).toThrow(RangeError);
  });
});

// ─── setFeatureEnabled ────────────────────────────────────────────────────────

describe('setFeatureEnabled', () => {
  it('enables a disabled feature', () => {
    let reg = createFeatureRegistry();
    reg = registerFeature(reg, makeFeature('pdf-export', { enabled: false }));
    reg = setFeatureEnabled(reg, 'pdf-export', true);
    expect(reg.features['pdf-export']?.enabled).toBe(true);
  });

  it('disables an enabled feature', () => {
    let reg = createFeatureRegistry();
    reg = registerFeature(reg, makeFeature('pdf-export', { enabled: true }));
    reg = setFeatureEnabled(reg, 'pdf-export', false);
    expect(reg.features['pdf-export']?.enabled).toBe(false);
  });

  it('throws RangeError for unregistered flag', () => {
    const reg = createFeatureRegistry();
    expect(() => setFeatureEnabled(reg, 'pdf-export', true)).toThrow(RangeError);
  });
});

// ─── getFeatureChunks ─────────────────────────────────────────────────────────

describe('getFeatureChunks', () => {
  it('returns the chunk list for a registered feature', () => {
    let reg = createFeatureRegistry();
    reg = registerFeature(reg, makeFeature('dxf-export', { chunks: ['chunks/dxf.js', 'chunks/dxf-worker.js'] }));
    const chunks = getFeatureChunks(reg, 'dxf-export');
    expect(chunks).toEqual(['chunks/dxf.js', 'chunks/dxf-worker.js']);
  });

  it('throws RangeError for unregistered flag', () => {
    const reg = createFeatureRegistry();
    expect(() => getFeatureChunks(reg, 'dxf-export')).toThrow(RangeError);
  });
});

// ─── resolveLoadOrder ─────────────────────────────────────────────────────────

describe('resolveLoadOrder', () => {
  it('sorts features by priority: critical → high → normal → low', () => {
    let reg = createFeatureRegistry();
    reg = registerFeature(reg, makeFeature('pdf-export', { priority: 'low' }));
    reg = registerFeature(reg, makeFeature('cut-optimizer', { priority: 'critical' }));
    reg = registerFeature(reg, makeFeature('assembly-view', { priority: 'normal' }));
    const order = resolveLoadOrder(reg);
    expect(order[0]?.priority).toBe('critical');
    expect(order[order.length - 1]?.priority).toBe('low');
  });

  it('sorts by estimatedBytes asc within the same priority', () => {
    let reg = createFeatureRegistry();
    reg = registerFeature(reg, makeFeature('pdf-export', { priority: 'high', estimatedBytes: 200000 }));
    reg = registerFeature(reg, makeFeature('dxf-export', { priority: 'high', estimatedBytes: 50000 }));
    const order = resolveLoadOrder(reg);
    expect(order[0]?.flag).toBe('dxf-export');
  });
});

// ─── estimateBundleImpact ─────────────────────────────────────────────────────

describe('estimateBundleImpact', () => {
  it('sums estimatedBytes of enabled features', () => {
    let reg = createFeatureRegistry();
    reg = registerFeature(reg, makeFeature('pdf-export', { enabled: true, estimatedBytes: 100000 }));
    reg = registerFeature(reg, makeFeature('dxf-export', { enabled: true, estimatedBytes: 50000 }));
    reg = registerFeature(reg, makeFeature('cut-optimizer', { enabled: false, estimatedBytes: 80000 }));
    expect(estimateBundleImpact(reg)).toBe(150000);
  });

  it('returns 0 for empty registry', () => {
    expect(estimateBundleImpact(createFeatureRegistry())).toBe(0);
  });
});

// ─── getFeaturesByPriority ────────────────────────────────────────────────────

describe('getFeaturesByPriority', () => {
  it('returns only features matching the given priority', () => {
    let reg = createFeatureRegistry();
    reg = registerFeature(reg, makeFeature('pdf-export', { priority: 'critical' }));
    reg = registerFeature(reg, makeFeature('dxf-export', { priority: 'normal' }));
    expect(getFeaturesByPriority(reg, 'critical')).toHaveLength(1);
    expect(getFeaturesByPriority(reg, 'critical')[0]?.flag).toBe('pdf-export');
  });
});
