import { describe, expect, it } from 'vitest';
import { calculateBiscuitLayout, recommendBiscuitSize } from '../../src/engine/biscuit-joint';

describe('recommendBiscuitSize', () => {
  it('returns #0 for thin stock', () => {
    expect(recommendBiscuitSize(12)).toBe('#0');
  });

  it('returns #10 for medium stock', () => {
    expect(recommendBiscuitSize(18)).toBe('#10');
  });

  it('returns #20 for thick stock', () => {
    expect(recommendBiscuitSize(25)).toBe('#20');
  });

  it('throws RangeError when thickness <= 0', () => {
    expect(() => recommendBiscuitSize(0)).toThrow(RangeError);
  });
});

describe('calculateBiscuitLayout', () => {
  const baseInput = {
    jointLengthMm: 600,
    boardThicknessMm: 18,
    jointType: 'edge' as const,
  };

  it('returns at least 2 biscuits with valid positions', () => {
    const result = calculateBiscuitLayout(baseInput);
    expect(result.count).toBeGreaterThanOrEqual(2);
    expect(result.positions).toHaveLength(result.count);
    expect(result.positions[0]?.centerMm).toBeGreaterThanOrEqual(0);
  });

  it('respects manual biscuit size override', () => {
    const result = calculateBiscuitLayout({ ...baseInput, biscuitSize: '#20' });
    expect(result.biscuitSize).toBe('#20');
  });

  it('miter joints reduce depth limit', () => {
    const edge = calculateBiscuitLayout({ ...baseInput, jointType: 'edge' });
    const miter = calculateBiscuitLayout({ ...baseInput, jointType: 'miter' });
    expect(miter.slotDepthMm).toBeLessThan(edge.slotDepthMm);
  });

  it('uses spacing to determine count', () => {
    const dense = calculateBiscuitLayout({ ...baseInput, spacingMm: 80 });
    const sparse = calculateBiscuitLayout({ ...baseInput, spacingMm: 180 });
    expect(dense.count).toBeGreaterThan(sparse.count);
  });

  it.each([
    { desc: 'jointLengthMm <= 0', input: { ...baseInput, jointLengthMm: 0 } },
    { desc: 'boardThicknessMm <= 0', input: { ...baseInput, boardThicknessMm: 0 } },
    { desc: 'spacingMm <= 0', input: { ...baseInput, spacingMm: 0 } },
    { desc: 'edgeMarginMm < 0', input: { ...baseInput, edgeMarginMm: -1 } },
    { desc: 'usable length <= 0', input: { ...baseInput, jointLengthMm: 70, edgeMarginMm: 40 } },
  ])('throws RangeError when $desc', ({ input }) => {
    expect(() => calculateBiscuitLayout(input)).toThrow(RangeError);
  });
});
