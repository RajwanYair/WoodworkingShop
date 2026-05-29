import { describe, it, expect } from 'vitest';
import { calculateHoningGuide } from '../../src/engine/honing-guide';

describe('calculateHoningGuide', () => {
  it('calculates projection for 25° bevel at 25 mm guide height', () => {
    const result = calculateHoningGuide({ bevelAngleDeg: 25, guideHeightMm: 25 });
    const expected = Math.round((25 / Math.tan((25 * Math.PI) / 180)) * 10) / 10;
    expect(result.projectionMm).toBe(expected);
    expect(result.actualBevelAngleDeg).toBe(25);
  });

  it('calculates projection for 30° bevel at 20 mm guide height', () => {
    const result = calculateHoningGuide({ bevelAngleDeg: 30, guideHeightMm: 20 });
    const expected = Math.round((20 / Math.tan((30 * Math.PI) / 180)) * 10) / 10;
    expect(result.projectionMm).toBe(expected);
  });

  it('returns null microbevelProjectionMm when microbevelDeg is 0 (default)', () => {
    const result = calculateHoningGuide({ bevelAngleDeg: 25, guideHeightMm: 25 });
    expect(result.microbevelProjectionMm).toBeNull();
  });

  it('returns null microbevelProjectionMm when microbevelDeg is explicitly 0', () => {
    const result = calculateHoningGuide({ bevelAngleDeg: 25, guideHeightMm: 25, microbevelDeg: 0 });
    expect(result.microbevelProjectionMm).toBeNull();
  });

  it('calculates shorter microbevel projection for a 5° micro-bevel', () => {
    const result = calculateHoningGuide({ bevelAngleDeg: 25, guideHeightMm: 25, microbevelDeg: 5 });
    expect(result.microbevelProjectionMm).not.toBeNull();
    // microbevel (25+5=30°) → shorter projection than 25°
    expect(result.microbevelProjectionMm!).toBeLessThan(result.projectionMm);
  });

  it('microbevel projection formula: guideHeight / tan(bevel + micro)', () => {
    const result = calculateHoningGuide({ bevelAngleDeg: 20, guideHeightMm: 30, microbevelDeg: 5 });
    const expected = Math.round((30 / Math.tan((25 * Math.PI) / 180)) * 10) / 10;
    expect(result.microbevelProjectionMm).toBe(expected);
  });

  it('echoes actualBevelAngleDeg', () => {
    const result = calculateHoningGuide({ bevelAngleDeg: 38, guideHeightMm: 22 });
    expect(result.actualBevelAngleDeg).toBe(38);
  });

  it.each([
    ['bevelAngleDeg = 0', { bevelAngleDeg: 0, guideHeightMm: 25 }],
    ['bevelAngleDeg = 90', { bevelAngleDeg: 90, guideHeightMm: 25 }],
    ['guideHeightMm = 0', { bevelAngleDeg: 25, guideHeightMm: 0 }],
    ['guideHeightMm negative', { bevelAngleDeg: 25, guideHeightMm: -1 }],
    ['microbevelDeg negative', { bevelAngleDeg: 25, guideHeightMm: 25, microbevelDeg: -1 }],
    ['microbevelDeg = 45', { bevelAngleDeg: 25, guideHeightMm: 25, microbevelDeg: 45 }],
    ['microbevelDeg >= 90 - bevel', { bevelAngleDeg: 25, guideHeightMm: 25, microbevelDeg: 65 }],
  ])('throws RangeError for invalid input: %s', (_label, input) => {
    expect(() => calculateHoningGuide(input as Parameters<typeof calculateHoningGuide>[0])).toThrow(RangeError);
  });
});
