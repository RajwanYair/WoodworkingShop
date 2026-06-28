import { describe, expect, it } from 'vitest';
import { applyGrainConstraints, validateGrainConstraint } from '../../src/engine/grain-constraint';
import type { Part } from '../../src/engine/types';

// ── Fixture ────────────────────────────────────────────────────────────────────

function makePart(overrides: Partial<Part> = {}): Part {
  return {
    id: 'P1',
    name: { en: 'Side Panel', he: 'לוח צד' },
    qty: 2,
    material: 'plywood-18',
    thickness: 18,
    length: 720,
    width: 400,
    edgeBanding: { en: 'none', he: 'ללא' },
    ...overrides,
  };
}

// ── applyGrainConstraints ──────────────────────────────────────────────────────

describe('applyGrainConstraints', () => {
  it('passes through parts without a grainConstraint unchanged', () => {
    const part = makePart();
    const [result] = applyGrainConstraints([part]);
    expect(result).toBe(part); // exact same reference — no mutation
  });

  describe('along-length constraint', () => {
    it('sets rotationLocked to true without swapping dimensions', () => {
      const part = makePart({ grainConstraint: 'along-length' });
      const [result] = applyGrainConstraints([part]);
      expect(result.rotationLocked).toBe(true);
      expect(result.length).toBe(720);
      expect(result.width).toBe(400);
    });

    it('overrides an existing rotationLocked: false', () => {
      const part = makePart({ grainConstraint: 'along-length', rotationLocked: false });
      const [result] = applyGrainConstraints([part]);
      expect(result.rotationLocked).toBe(true);
    });
  });

  describe('along-width constraint', () => {
    it('swaps length and width, then locks rotation', () => {
      const part = makePart({ grainConstraint: 'along-width', length: 720, width: 400 });
      const [result] = applyGrainConstraints([part]);
      expect(result.length).toBe(400);
      expect(result.width).toBe(720);
      expect(result.rotationLocked).toBe(true);
    });
  });

  it('does not mutate the original part', () => {
    const original = makePart({ grainConstraint: 'along-width' });
    const originalLength = original.length;
    applyGrainConstraints([original]);
    expect(original.length).toBe(originalLength);
  });

  it('processes mixed parts list, transforming only constrained ones', () => {
    const parts = [
      makePart({ id: 'A', grainConstraint: undefined }),
      makePart({ id: 'B', grainConstraint: 'along-length' }),
      makePart({ id: 'C', grainConstraint: 'along-width', length: 600, width: 300 }),
    ];
    const result = applyGrainConstraints(parts);
    expect(result[0]).toBe(parts[0]); // unchanged reference
    expect(result[1].rotationLocked).toBe(true);
    expect(result[1].length).toBe(parts[1].length); // no swap
    expect(result[2].length).toBe(300); // swapped
    expect(result[2].width).toBe(600); // swapped
  });
});

// ── validateGrainConstraint ────────────────────────────────────────────────────

describe('validateGrainConstraint', () => {
  it.each([
    { value: undefined, expected: undefined },
    { value: null, expected: undefined },
    { value: 'along-length', expected: 'along-length' as const },
    { value: 'along-width', expected: 'along-width' as const },
  ])('returns $expected for $value', ({ value, expected }) => {
    expect(validateGrainConstraint(value)).toBe(expected);
  });

  it.each(['horizontal', 'vertical', '', 0, false])('throws RangeError for invalid value %s', (value) => {
    expect(() => validateGrainConstraint(value)).toThrow(RangeError);
  });
});
