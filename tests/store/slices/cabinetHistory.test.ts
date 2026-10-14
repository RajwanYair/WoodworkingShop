import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../../src/engine/materials/materials';
import {
  appendCabinetPatch,
  applyCabinetPatch,
  createCabinetPatch,
  MAX_CABINET_HISTORY,
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

    expect(patch.changes).toEqual([{ index: 0, before: before[0], after: after[0] }]);
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

  it('returns an empty patch for an unchanged list', () => {
    const cabinets = [cabinet('First')];
    const patch = createCabinetPatch(cabinets, cabinets);

    expect(patch.changes).toEqual([]);
    expect(applyCabinetPatch(cabinets, patch, 'forward')).toEqual(cabinets);
    expect(applyCabinetPatch(cabinets, patch, 'backward')).toEqual(cabinets);
  });

  it('bounds history to 50 patches and retains only changed entries for a 50-cabinet project', () => {
    const cabinets = Array.from({ length: 50 }, (_, index) => cabinet(`Cabinet ${index + 1}`));
    let history = [] as ReturnType<typeof createCabinetPatch>[];

    for (let edit = 0; edit < MAX_CABINET_HISTORY + 5; edit += 1) {
      const next = cabinets.map((entry, index) =>
        index === 0 ? { ...entry, config: { ...entry.config, width: entry.config.width + 1 } } : entry,
      );
      history = appendCabinetPatch(history, cabinets, next);
    }

    const retainedEntryReferences = history.reduce(
      (count, patch) =>
        count +
        patch.changes.filter((change) => change.before).length +
        patch.changes.filter((change) => change.after).length,
      0,
    );

    expect(history).toHaveLength(MAX_CABINET_HISTORY);
    expect(history.every((patch) => patch.changes.length === 1)).toBe(true);
    expect(retainedEntryReferences).toBe(MAX_CABINET_HISTORY * 2);
  });
});
