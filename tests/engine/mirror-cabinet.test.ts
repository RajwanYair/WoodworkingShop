import { describe, it, expect } from 'vitest';
import { mirrorConfig, mirrorName } from '../../src/engine/mirror-cabinet';
import type { CabinetConfig } from '../../src/engine/types';
import { cfg } from '../helpers';

// ─── mirrorConfig ─────────────────────────────────────────────────────────────

describe('mirrorConfig', () => {
  it('sets isMirrored to true on a standard (non-mirrored) config', () => {
    const original = cfg({});
    const mirrored = mirrorConfig(original);
    expect(mirrored.isMirrored).toBe(true);
  });

  it('toggles isMirrored false when called on an already-mirrored config', () => {
    const mirrored = cfg({ isMirrored: true } as Partial<CabinetConfig>);
    const restored = mirrorConfig(mirrored);
    expect(restored.isMirrored).toBe(false);
  });

  it('preserves all other config properties unchanged', () => {
    const original = cfg({ width: 600, height: 720, depth: 560, doorCount: 2 });
    const mirrored = mirrorConfig(original);
    expect(mirrored.width).toBe(600);
    expect(mirrored.height).toBe(720);
    expect(mirrored.depth).toBe(560);
    expect(mirrored.doorCount).toBe(2);
  });

  it('does not mutate the original config', () => {
    const original = cfg({});
    const before = original.isMirrored;
    mirrorConfig(original);
    expect(original.isMirrored).toBe(before);
  });

  it('produces a new object reference (shallow copy)', () => {
    const original = cfg({});
    const mirrored = mirrorConfig(original);
    expect(mirrored).not.toBe(original);
  });
});

// ─── mirrorName ───────────────────────────────────────────────────────────────

describe('mirrorName', () => {
  it.each([
    ['standard name → appends (mirror)', 'Base Cabinet', 'Base Cabinet (mirror)'],
    ['already (mirror) → appends (mirror 2)', 'Base Cabinet (mirror)', 'Base Cabinet (mirror 2)'],
    ['(mirror 2) suffix → increments to (mirror 3)', 'Base Cabinet (mirror 2)', 'Base Cabinet (mirror 3)'],
    ['single word name', 'Wardrobe', 'Wardrobe (mirror)'],
    ['name with numbers', 'Cabinet 01', 'Cabinet 01 (mirror)'],
    ['high mirror number increments', 'Unit (mirror 9)', 'Unit (mirror 10)'],
  ] as const)('%s', (_label, input, expected) => {
    expect(mirrorName(input)).toBe(expected);
  });

  it('strips existing mirror suffix before computing the new name', () => {
    const result = mirrorName('Kitchen Base (mirror)');
    expect(result).toBe('Kitchen Base (mirror 2)');
    expect(result).not.toContain('(mirror) (mirror');
  });
});
