import { describe, it, expect } from 'vitest';
import { diffSnapshots } from '../../src/engine/snapshot-diff';
import { cfg } from '../helpers';

function makeSnap(overrides: Parameters<typeof cfg>[0] = {}) {
  return {
    cabinets: [
      { name: 'Cabinet 1', config: cfg(overrides) },
    ],
  };
}

describe('diffSnapshots', () => {
  it('returns identical when both snapshots have same config', () => {
    const a = makeSnap();
    const b = makeSnap();
    const diff = diffSnapshots(a, b);
    expect(diff.identical).toBe(true);
    expect(diff.cabinetDiffs).toHaveLength(0);
    expect(diff.addedCabinets).toBe(0);
    expect(diff.removedCabinets).toBe(0);
  });

  it('detects width change', () => {
    const a = makeSnap({ width: 600 });
    const b = makeSnap({ width: 800 });
    const diff = diffSnapshots(a, b);
    expect(diff.identical).toBe(false);
    expect(diff.cabinetDiffs).toHaveLength(1);
    const delta = diff.cabinetDiffs[0].deltas.find((d) => d.field === 'width');
    expect(delta).toBeDefined();
    expect(delta?.oldValue).toBe('600');
    expect(delta?.newValue).toBe('800');
  });

  it('detects material change', () => {
    const a = makeSnap({ carcassMaterial: 'plywood-18' });
    const b = makeSnap({ carcassMaterial: 'mdf-18' });
    const diff = diffSnapshots(a, b);
    const delta = diff.cabinetDiffs[0]?.deltas.find((d) => d.field === 'carcassMaterial');
    expect(delta?.oldValue).toBe('plywood-18');
    expect(delta?.newValue).toBe('mdf-18');
  });

  it('detects multiple field changes in one cabinet', () => {
    const a = makeSnap({ width: 600, shelfCount: 2 });
    const b = makeSnap({ width: 900, shelfCount: 4 });
    const diff = diffSnapshots(a, b);
    expect(diff.cabinetDiffs[0].deltas.length).toBeGreaterThanOrEqual(2);
  });

  it('reports added cabinets', () => {
    const a = { cabinets: [{ name: 'Cab1', config: cfg() }] };
    const b = {
      cabinets: [
        { name: 'Cab1', config: cfg() },
        { name: 'Cab2', config: cfg() },
      ],
    };
    const diff = diffSnapshots(a, b);
    expect(diff.addedCabinets).toBe(1);
    expect(diff.removedCabinets).toBe(0);
    expect(diff.identical).toBe(false);
  });

  it('reports removed cabinets', () => {
    const a = {
      cabinets: [
        { name: 'Cab1', config: cfg() },
        { name: 'Cab2', config: cfg() },
      ],
    };
    const b = { cabinets: [{ name: 'Cab1', config: cfg() }] };
    const diff = diffSnapshots(a, b);
    expect(diff.removedCabinets).toBe(1);
    expect(diff.addedCabinets).toBe(0);
    expect(diff.identical).toBe(false);
  });

  it('uses snapshotB cabinet name in diff', () => {
    const a = makeSnap({ width: 600 });
    const b = { cabinets: [{ name: 'My Wardrobe', config: cfg({ width: 900 }) }] };
    const diff = diffSnapshots(a, b);
    expect(diff.cabinetDiffs[0].cabinetName).toBe('My Wardrobe');
  });

  it('does not include unchanged cabinets in cabinetDiffs', () => {
    const a = {
      cabinets: [
        { name: 'Same', config: cfg() },
        { name: 'Changed', config: cfg({ width: 600 }) },
      ],
    };
    const b = {
      cabinets: [
        { name: 'Same', config: cfg() },
        { name: 'Changed', config: cfg({ width: 900 }) },
      ],
    };
    const diff = diffSnapshots(a, b);
    expect(diff.cabinetDiffs).toHaveLength(1);
    expect(diff.cabinetDiffs[0].cabinetName).toBe('Changed');
  });
});
