import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../../src/engine/materials/materials';
import {
  appendCabinetPatch,
  applyCabinetPatch,
  createCabinetPatch,
  MAX_CABINET_HISTORY,
  measureSerializedBytes,
} from '../../../src/store/slices/cabinetHistory';
import type { CabinetEntry } from '../../../src/store/cabinet-store';

const cabinet = (name: string, width = DEFAULT_CONFIG.width): CabinetEntry => ({
  name,
  config: { ...DEFAULT_CONFIG, width },
});

describe('cabinet history patches', () => {
  it('stores only changed entries and applies a replacement in both directions', () => {
    const unchanged = cabinet('Unchanged');
    const before = [cabinet('First', 700), unchanged];
    const after = [cabinet('First', 800), unchanged];
    const patch = createCabinetPatch(before, after);

    expect(patch.changes).toEqual([{ op: 'set', index: 0, path: ['config', 'width'], before: 700, after: 800 }]);
    expect(applyCabinetPatch(before, patch, 'forward')).toEqual(after);
    expect(applyCabinetPatch(after, patch, 'backward')).toEqual(before);
  });

  it.each([
    { before: [cabinet('First')], after: [cabinet('First'), cabinet('Added')] },
    { before: [cabinet('First'), cabinet('Removed')], after: [cabinet('First')] },
    { before: [cabinet('First'), cabinet('Second')], after: [cabinet('First'), cabinet('Added'), cabinet('Second')] },
    { before: [cabinet('First'), cabinet('Removed'), cabinet('Second')], after: [cabinet('First'), cabinet('Second')] },
    { before: [cabinet('First'), cabinet('Second')], after: [cabinet('Second'), cabinet('First')] },
  ])('reverses list insertion, removal, and reorder patches', ({ before, after }) => {
    const patch = createCabinetPatch(before, after);

    expect(applyCabinetPatch(before, patch, 'forward')).toEqual(after);
    expect(applyCabinetPatch(after, patch, 'backward')).toEqual(before);
  });

  it('records a reference reorder as a permutation instead of copying entries', () => {
    const first = cabinet('First');
    const second = cabinet('Second');
    const patch = createCabinetPatch([first, second], [second, first]);

    expect(patch.changes).toEqual([]);
    expect(patch.permute).toEqual({ forward: [1, 0], backward: [1, 0] });
    expect(applyCabinetPatch([first, second], patch, 'forward')).toEqual([second, first]);
    expect(applyCabinetPatch([second, first], patch, 'backward')).toEqual([first, second]);
  });

  it('returns an empty patch for an unchanged list', () => {
    const cabinets = [cabinet('First')];
    const patch = createCabinetPatch(cabinets, cabinets);

    expect(patch.changes).toEqual([]);
    expect(applyCabinetPatch(cabinets, patch, 'forward')).toEqual(cabinets);
    expect(applyCabinetPatch(cabinets, patch, 'backward')).toEqual(cabinets);
  });

  it('bounds history to 50 patches and stores field edits instead of cabinet snapshots', () => {
    const cabinets = Array.from({ length: 50 }, (_, index) => cabinet(`Cabinet ${index + 1}`));
    let current = cabinets;
    let history = [] as ReturnType<typeof createCabinetPatch>[];
    const arraySnapshots: CabinetEntry[][] = [];
    const entrySnapshots: CabinetEntry[] = [];

    for (let edit = 0; edit < MAX_CABINET_HISTORY + 5; edit += 1) {
      const next = current.map((entry, index) =>
        index === 0 ? { ...entry, config: { ...entry.config, width: entry.config.width + 1 } } : entry,
      );
      if (arraySnapshots.length < MAX_CABINET_HISTORY) {
        arraySnapshots.push(next);
        entrySnapshots.push(current[0], next[0]);
      }
      history = appendCabinetPatch(history, current, next);
      current = next;
    }

    const structuralBytes = measureSerializedBytes(history);
    const entrySnapshotBytes = measureSerializedBytes(entrySnapshots);
    const arraySnapshotBytes = measureSerializedBytes(arraySnapshots);

    expect(history).toHaveLength(MAX_CABINET_HISTORY);
    expect(history.every((patch) => patch.changes.length === 1 && patch.changes[0]?.op === 'set')).toBe(true);
    expect(structuralBytes).toBeLessThan(entrySnapshotBytes);
    expect(structuralBytes).toBeLessThan(arraySnapshotBytes / 10);
    expect(structuralBytes).toBeGreaterThan(0);
  });
});
