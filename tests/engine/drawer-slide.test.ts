import { describe, it, expect } from 'vitest';
import {
  calculateDrawerSlide,
  findRecommendedSlideLength,
  STANDARD_SLIDE_LENGTHS,
} from '../../src/engine/drawer-slide';

describe('calculateDrawerSlide', () => {
  const baseInput = {
    openingWidthMm: 500,
    openingHeightMm: 200,
    cabinetDepthMm: 550,
    mountStyle: 'side_mount' as const,
  };

  it('computes box dimensions for side-mount slides', () => {
    const result = calculateDrawerSlide(baseInput);
    // 500 - 2×12.7 - 2×15 = 444.6
    expect(result.boxWidthMm).toBeCloseTo(444.6, 1);
    expect(result.boxHeightMm).toBeGreaterThan(0);
    expect(result.boxDepthMm).toBeGreaterThan(0);
    expect(result.clearancePerSideMm).toBe(12.7);
    expect(result.totalHorizontalGapMm).toBe(25.4);
    expect(result.mountStyle).toBe('side_mount');
    expect(result.bottomClearanceMm).toBe(0);
  });

  it('computes box dimensions for under-mount slides', () => {
    const result = calculateDrawerSlide({ ...baseInput, mountStyle: 'under_mount' });
    // 500 - 2×3.2 - 2×15 = 463.6
    expect(result.boxWidthMm).toBeCloseTo(463.6, 1);
    expect(result.clearancePerSideMm).toBe(3.2);
    expect(result.bottomClearanceMm).toBe(13.5);
    // Height reduced by bottom clearance
    expect(result.boxHeightMm).toBeLessThan(calculateDrawerSlide(baseInput).boxHeightMm);
  });

  it('computes box dimensions for center-mount slides', () => {
    const result = calculateDrawerSlide({ ...baseInput, mountStyle: 'center_mount' });
    expect(result.clearancePerSideMm).toBe(0);
    expect(result.totalHorizontalGapMm).toBe(0);
    // Box width only reduced by side thickness
    expect(result.boxWidthMm).toBeCloseTo(470, 1);
  });

  it('respects custom drawer side thickness', () => {
    const result = calculateDrawerSlide({ ...baseInput, drawerSideThicknessMm: 12 });
    // 500 - 25.4 - 2×12 = 450.6
    expect(result.boxWidthMm).toBeCloseTo(450.6, 1);
  });

  it('selects correct slide length for cabinet depth', () => {
    const result = calculateDrawerSlide({ ...baseInput, cabinetDepthMm: 400 });
    // maxSlideLength = 400 - 25 = 375 → best standard is 350
    expect(result.recommendedSlideLengthMm).toBe(350);
  });

  it('defaults extension to full', () => {
    const result = calculateDrawerSlide(baseInput);
    expect(result.extension).toBe('full');
  });

  it('preserves specified extension type', () => {
    const result = calculateDrawerSlide({ ...baseInput, extension: 'over_travel' });
    expect(result.extension).toBe('over_travel');
  });

  it.each([
    { desc: 'openingWidthMm = 0', override: { openingWidthMm: 0 } },
    { desc: 'openingHeightMm = -1', override: { openingHeightMm: -1 } },
    { desc: 'cabinetDepthMm = 0', override: { cabinetDepthMm: 0 } },
    { desc: 'drawerSideThicknessMm = 0', override: { drawerSideThicknessMm: 0 } },
    { desc: 'drawerBottomThicknessMm = 0', override: { drawerBottomThicknessMm: 0 } },
    { desc: 'opening too narrow', override: { openingWidthMm: 20 } },
  ])('throws RangeError for $desc', ({ override }) => {
    expect(() => calculateDrawerSlide({ ...baseInput, ...override })).toThrow(RangeError);
  });
});

describe('findRecommendedSlideLength', () => {
  it('returns largest standard length that fits', () => {
    expect(findRecommendedSlideLength(425)).toBe(400);
    expect(findRecommendedSlideLength(600)).toBe(600);
    expect(findRecommendedSlideLength(601)).toBe(600);
    expect(findRecommendedSlideLength(275)).toBe(250);
  });

  it('returns smallest standard when depth is very limited', () => {
    expect(findRecommendedSlideLength(250)).toBe(250);
    expect(findRecommendedSlideLength(100)).toBe(250); // smallest always returned
  });

  it('throws RangeError for maxLengthMm <= 0', () => {
    expect(() => findRecommendedSlideLength(0)).toThrow(RangeError);
    expect(() => findRecommendedSlideLength(-10)).toThrow(RangeError);
  });
});

describe('STANDARD_SLIDE_LENGTHS', () => {
  it('has 8 standard sizes', () => {
    expect(STANDARD_SLIDE_LENGTHS).toHaveLength(8);
  });

  it('is sorted ascending', () => {
    for (let i = 1; i < STANDARD_SLIDE_LENGTHS.length; i++) {
      expect(STANDARD_SLIDE_LENGTHS[i]).toBeGreaterThan(STANDARD_SLIDE_LENGTHS[i - 1]);
    }
  });
});
