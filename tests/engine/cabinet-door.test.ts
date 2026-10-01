import { describe, it, expect } from 'vitest';
import WOOD_MAGAZINE_OVERLAY_DOOR_ORACLE from '../fixtures/oracles/wood-magazine-overlay-door.json';
import { calculateCabinetDoor, recommendDoorCount } from '../../src/engine/cabinet-door';

describe('calculateCabinetDoor', () => {
  it('matches the published 1/2-inch overlay door sizing example', () => {
    const result = calculateCabinetDoor({
      ...WOOD_MAGAZINE_OVERLAY_DOOR_ORACLE.input,
      doorCount: 1,
      overlay: 'full',
    });

    expect(result.doorLeaf.widthMm).toBe(WOOD_MAGAZINE_OVERLAY_DOOR_ORACLE.expected.doorWidthMm);
    expect(result.doorLeaf.heightMm).toBe(WOOD_MAGAZINE_OVERLAY_DOOR_ORACLE.expected.doorHeightMm);
  });

  describe('full overlay — single door', () => {
    it.each([
      {
        desc: 'standard 600 mm base cabinet, full overlay',
        input: { openingWidthMm: 550, openingHeightMm: 700, doorCount: 1 as const, overlay: 'full' as const },
        expected: {
          leafWidthMm: 550 + 2 * 9.5 - 2 * 2,
          leafHeightMm: 700 + 2 * 9.5 - 2 * 2,
          hingeCount: 2,
        },
      },
      {
        desc: 'tall wall cabinet needs 3 hinges',
        input: { openingWidthMm: 400, openingHeightMm: 950, doorCount: 1 as const, overlay: 'full' as const },
        expected: {
          leafHeightMm: 950 + 2 * 9.5 - 2 * 2,
          hingeCount: 3,
        },
      },
      {
        desc: 'custom overlay amount',
        input: {
          openingWidthMm: 500,
          openingHeightMm: 600,
          doorCount: 1 as const,
          overlay: 'full' as const,
          overlayMm: 12,
        },
        expected: {
          leafWidthMm: 500 + 2 * 12 - 2 * 2,
        },
      },
    ])('$desc', ({ input, expected }) => {
      const result = calculateCabinetDoor(input);
      if (expected.leafWidthMm !== undefined) expect(result.doorLeaf.widthMm).toBeCloseTo(expected.leafWidthMm, 1);
      if (expected.leafHeightMm !== undefined) expect(result.doorLeaf.heightMm).toBeCloseTo(expected.leafHeightMm, 1);
      if (expected.hingeCount !== undefined) expect(result.hingeCount).toBe(expected.hingeCount);
      expect(result.isValid).toBe(true);
    });
  });

  describe('half overlay', () => {
    it('half overlay uses 4.75 mm default', () => {
      const result = calculateCabinetDoor({
        openingWidthMm: 500,
        openingHeightMm: 700,
        doorCount: 1,
        overlay: 'half',
      });
      expect(result.overlayMm).toBe(4.75);
      expect(result.doorLeaf.widthMm).toBeCloseTo(500 + 2 * 4.75 - 2 * 2, 1);
    });
  });

  describe('hinge thresholds and rounding', () => {
    it.each([
      { openingHeightMm: 884, expectedLeafHeightMm: 899, expectedHinges: 2 },
      { openingHeightMm: 885, expectedLeafHeightMm: 900, expectedHinges: 3 },
      { openingHeightMm: 1385, expectedLeafHeightMm: 1400, expectedHinges: 4 },
    ])(
      'uses $expectedHinges hinges at a $expectedLeafHeightMm mm leaf height',
      ({ openingHeightMm, expectedLeafHeightMm, expectedHinges }) => {
        const result = calculateCabinetDoor({
          openingWidthMm: 500,
          openingHeightMm,
          doorCount: 1,
          overlay: 'full',
        });

        expect(result.doorLeaf.heightMm).toBe(expectedLeafHeightMm);
        expect(result.hingeCount).toBe(expectedHinges);
      },
    );

    it('rounds each calculated door leaf to one decimal millimetre', () => {
      const result = calculateCabinetDoor({
        openingWidthMm: 500.06,
        openingHeightMm: 700,
        doorCount: 1,
        overlay: 'full',
      });

      expect(result.doorLeaf.widthMm).toBe(515.1);
    });
  });

  describe('inset doors', () => {
    it('inset door fits inside opening minus gap', () => {
      const result = calculateCabinetDoor({
        openingWidthMm: 500,
        openingHeightMm: 700,
        doorCount: 1,
        overlay: 'inset',
      });
      expect(result.overlayMm).toBe(0);
      expect(result.doorLeaf.widthMm).toBeCloseTo(500 - 2 * 1.5, 1);
      expect(result.doorLeaf.heightMm).toBeCloseTo(700 - 2 * 1.5, 1);
    });

    it('custom inset gap', () => {
      const result = calculateCabinetDoor({
        openingWidthMm: 400,
        openingHeightMm: 600,
        doorCount: 1,
        overlay: 'inset',
        gapMm: 2,
      });
      expect(result.gapMm).toBe(2);
      expect(result.doorLeaf.widthMm).toBeCloseTo(396, 1);
    });
  });

  describe('double doors', () => {
    it('two-door pair splits width and doubles hinge count', () => {
      const result = calculateCabinetDoor({
        openingWidthMm: 900,
        openingHeightMm: 700,
        doorCount: 2,
        overlay: 'full',
      });
      // total = 900 + 2*9.5 - 2*2 - 2 (centre gap) = 919 - 4 = 915; per leaf = 915/2 = 457.5
      const expectedLeaf = (900 + 2 * 9.5 - 2 * 2 - 2) / 2;
      expect(result.doorLeaf.widthMm).toBeCloseTo(expectedLeaf, 1);
      expect(result.hingeCount).toBe(4); // 2 per leaf × 2 leaves
    });
  });

  describe('advisory notes', () => {
    it('warns on very wide single door', () => {
      const result = calculateCabinetDoor({
        openingWidthMm: 700,
        openingHeightMm: 700,
        doorCount: 1,
        overlay: 'full',
      });
      expect(result.notes).toContain('wideLeaf');
    });

    it.each([
      { openingWidthMm: 286.9, hasNarrowNote: true },
      { openingWidthMm: 287, hasNarrowNote: false },
    ])(
      'applies the narrow double-door note at opening width $openingWidthMm mm',
      ({ openingWidthMm, hasNarrowNote }) => {
        const result = calculateCabinetDoor({ openingWidthMm, openingHeightMm: 700, doorCount: 2, overlay: 'full' });

        expect(result.notes.includes('narrowLeaf')).toBe(hasNarrowNote);
      },
    );

    it.each([
      { openingWidthMm: 585, hasWideNote: false },
      { openingWidthMm: 585.1, hasWideNote: true },
    ])('applies the wide single-door note at opening width $openingWidthMm mm', ({ openingWidthMm, hasWideNote }) => {
      const result = calculateCabinetDoor({ openingWidthMm, openingHeightMm: 700, doorCount: 1, overlay: 'full' });

      expect(result.notes.includes('wideLeaf')).toBe(hasWideNote);
    });

    it.each([
      { openingWidthMm: 199, hasSmallInsetNote: true },
      { openingWidthMm: 200, hasSmallInsetNote: false },
    ])('applies the inset-size note at opening width $openingWidthMm mm', ({ openingWidthMm, hasSmallInsetNote }) => {
      const result = calculateCabinetDoor({ openingWidthMm, openingHeightMm: 300, doorCount: 1, overlay: 'inset' });

      expect(result.notes.includes('smallInset')).toBe(hasSmallInsetNote);
    });

    it.each([
      { openingHeightMm: 1785, hasTallNote: false },
      { openingHeightMm: 1785.1, hasTallNote: true },
    ])('applies the tall-door note at opening height $openingHeightMm mm', ({ openingHeightMm, hasTallNote }) => {
      const result = calculateCabinetDoor({ openingWidthMm: 500, openingHeightMm, doorCount: 1, overlay: 'full' });

      expect(result.notes.includes('tallDoor')).toBe(hasTallNote);
    });
  });

  describe('invalid inputs', () => {
    it.each([
      {
        desc: 'zero opening width',
        input: { openingWidthMm: 0, openingHeightMm: 700, doorCount: 1 as const, overlay: 'full' as const },
      },
      {
        desc: 'negative opening height',
        input: { openingWidthMm: 500, openingHeightMm: -10, doorCount: 1 as const, overlay: 'full' as const },
      },
      {
        desc: 'negative overlay',
        input: {
          openingWidthMm: 500,
          openingHeightMm: 700,
          doorCount: 1 as const,
          overlay: 'full' as const,
          overlayMm: -1,
        },
      },
      {
        desc: 'NaN opening width',
        input: { openingWidthMm: Number.NaN, openingHeightMm: 700, doorCount: 1 as const, overlay: 'full' as const },
      },
      {
        desc: 'infinite opening height',
        input: {
          openingWidthMm: 500,
          openingHeightMm: Number.POSITIVE_INFINITY,
          doorCount: 1 as const,
          overlay: 'full' as const,
        },
      },
      {
        desc: 'NaN overlay',
        input: {
          openingWidthMm: 500,
          openingHeightMm: 700,
          doorCount: 1 as const,
          overlay: 'full' as const,
          overlayMm: Number.NaN,
        },
      },
      {
        desc: 'infinite gap',
        input: {
          openingWidthMm: 500,
          openingHeightMm: 700,
          doorCount: 1 as const,
          overlay: 'full' as const,
          gapMm: Number.POSITIVE_INFINITY,
        },
      },
    ])('throws RangeError for $desc', ({ input }) => {
      expect(() => calculateCabinetDoor(input)).toThrow(RangeError);
    });
  });
});

describe('recommendDoorCount', () => {
  it.each([
    { width: 300, expected: 1 },
    { width: 450, expected: 1 },
    { width: 451, expected: 2 },
    { width: 900, expected: 2 },
  ])('width $width mm → $expected door(s)', ({ width, expected }) => {
    expect(recommendDoorCount(width)).toBe(expected);
  });
});
