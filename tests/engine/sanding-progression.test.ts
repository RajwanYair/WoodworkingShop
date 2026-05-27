import { describe, expect, it } from 'vitest';
import { planSandingProgression, SANDING_GRITS } from '../../src/engine/sanding-progression';

describe('SANDING_GRITS', () => {
  it('contains ascending supported values', () => {
    for (let i = 1; i < SANDING_GRITS.length; i++) {
      expect(SANDING_GRITS[i]).toBeGreaterThan(SANDING_GRITS[i - 1]);
    }
  });
});

describe('planSandingProgression', () => {
  const baseInput = {
    startGrit: 80,
    targetGrit: 320,
    areaM2: 1,
    material: 'hardwood' as const,
    finishTarget: 'clear' as const,
  };

  it('returns contiguous grit sequence within supported range', () => {
    const result = planSandingProgression(baseInput);
    expect(result.gritSequence).toEqual([80, 100, 120, 150, 180, 220, 320]);
  });

  it('caps target grit by finish target recommendation', () => {
    const paint = planSandingProgression({ ...baseInput, finishTarget: 'paint' });
    expect(paint.gritSequence[paint.gritSequence.length - 1]).toBe(180);
  });

  it('hardwood takes longer than softwood', () => {
    const soft = planSandingProgression({ ...baseInput, material: 'softwood' });
    const hard = planSandingProgression({ ...baseInput, material: 'hardwood' });
    expect(hard.estimatedMinutes).toBeGreaterThan(soft.estimatedMinutes);
  });

  it('larger area increases sheets and time', () => {
    const small = planSandingProgression({ ...baseInput, areaM2: 0.8 });
    const large = planSandingProgression({ ...baseInput, areaM2: 2.4 });
    expect(large.estimatedMinutes).toBeGreaterThan(small.estimatedMinutes);
    expect(large.estimatedSheets).toBeGreaterThan(small.estimatedSheets);
  });

  it.each([
    { desc: 'unsupported start grit', input: { ...baseInput, startGrit: 90 } },
    { desc: 'unsupported target grit', input: { ...baseInput, targetGrit: 400 } },
    { desc: 'start > target', input: { ...baseInput, startGrit: 220, targetGrit: 120 } },
    { desc: 'area <= 0', input: { ...baseInput, areaM2: 0 } },
  ])('throws RangeError for $desc', ({ input }) => {
    expect(() => planSandingProgression(input)).toThrow(RangeError);
  });
});
