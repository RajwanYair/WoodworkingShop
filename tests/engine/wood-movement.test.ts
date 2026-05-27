import { describe, it, expect } from 'vitest';
import {
  calculateWoodMovement,
  calculatePanelMovement,
  seasonalMovement,
  SPECIES_COEFFICIENTS,
  SEASONAL_PRESETS,
} from '../../src/engine/wood-movement';

describe('calculateWoodMovement', () => {
  it.each([
    {
      desc: 'oak 300mm, MC 6→12 (expansion)',
      input: { widthMm: 300, species: 'oak' as const, mcStart: 6, mcEnd: 12 },
      direction: 'expansion',
    },
    {
      desc: 'maple 450mm, MC 12→7 (contraction)',
      input: { widthMm: 450, species: 'maple' as const, mcStart: 12, mcEnd: 7 },
      direction: 'contraction',
    },
    {
      desc: 'walnut 200mm, MC 8→8 (none)',
      input: { widthMm: 200, species: 'walnut' as const, mcStart: 8, mcEnd: 8 },
      direction: 'none',
    },
  ])('$desc → direction=$direction', ({ input, direction }) => {
    const result = calculateWoodMovement(input);
    expect(result.direction).toBe(direction);
    expect(result.finalWidthMm).toBeGreaterThan(0);
  });

  it('computes correct expansion for oak 300mm MC 6→12', () => {
    const result = calculateWoodMovement({
      widthMm: 300,
      species: 'oak',
      mcStart: 6,
      mcEnd: 12,
    });
    // 300 * 0.00369 * 6 = 6.642
    expect(result.changeMm).toBeCloseTo(6.642, 2);
    expect(result.finalWidthMm).toBeCloseTo(306.642, 2);
    expect(result.changePercent).toBeCloseTo(2.214, 2);
    expect(result.absoluteChangeMm).toBeCloseTo(6.642, 2);
    expect(result.gapPerSideMm).toBeCloseTo(3.32, 1);
  });

  it('computes correct contraction for cherry 500mm MC 14→6', () => {
    const result = calculateWoodMovement({
      widthMm: 500,
      species: 'cherry',
      mcStart: 14,
      mcEnd: 6,
    });
    // 500 * 0.00301 * (-8) = -12.04
    expect(result.changeMm).toBeCloseTo(-12.04, 1);
    expect(result.direction).toBe('contraction');
    expect(result.finalWidthMm).toBeCloseTo(487.96, 1);
  });

  it('accepts custom numeric coefficient', () => {
    const result = calculateWoodMovement({
      widthMm: 400,
      species: 0.005,
      mcStart: 8,
      mcEnd: 14,
    });
    // 400 * 0.005 * 6 = 12
    expect(result.changeMm).toBeCloseTo(12, 1);
    expect(result.direction).toBe('expansion');
  });

  it('returns zero movement when MC is unchanged', () => {
    const result = calculateWoodMovement({
      widthMm: 600,
      species: 'beech',
      mcStart: 10,
      mcEnd: 10,
    });
    expect(result.changeMm).toBe(0);
    expect(result.absoluteChangeMm).toBe(0);
    expect(result.direction).toBe('none');
    expect(result.gapPerSideMm).toBe(0);
  });

  it('provides minimum 0.5mm gap when there is any movement', () => {
    const result = calculateWoodMovement({
      widthMm: 50,
      species: 'cedar',
      mcStart: 10,
      mcEnd: 11,
    });
    // 50 * 0.00198 * 1 = 0.099mm total → gap would be 0.0495 per side
    // but minimum is 0.5
    expect(result.gapPerSideMm).toBe(0.5);
  });

  it.each([
    { desc: 'widthMm = 0', input: { widthMm: 0, species: 'oak' as const, mcStart: 8, mcEnd: 12 } },
    { desc: 'widthMm = -1', input: { widthMm: -1, species: 'oak' as const, mcStart: 8, mcEnd: 12 } },
    { desc: 'mcStart = -1', input: { widthMm: 300, species: 'oak' as const, mcStart: -1, mcEnd: 12 } },
    { desc: 'mcEnd = 31', input: { widthMm: 300, species: 'oak' as const, mcStart: 8, mcEnd: 31 } },
    { desc: 'coefficient = 0', input: { widthMm: 300, species: 0, mcStart: 8, mcEnd: 12 } },
    { desc: 'coefficient = -1', input: { widthMm: 300, species: -1, mcStart: 8, mcEnd: 12 } },
  ])('throws RangeError when $desc', ({ input }) => {
    expect(() => calculateWoodMovement(input)).toThrow(RangeError);
  });
});

describe('calculatePanelMovement', () => {
  it('sums board widths and calculates total movement', () => {
    const result = calculatePanelMovement([100, 150, 100], 'oak', 6, 12);
    // Total 350mm * 0.00369 * 6 = 7.749
    expect(result.changeMm).toBeCloseTo(7.749, 2);
    expect(result.finalWidthMm).toBeCloseTo(357.749, 2);
  });

  it('throws RangeError for empty boards array', () => {
    expect(() => calculatePanelMovement([], 'oak', 8, 12)).toThrow(RangeError);
  });
});

describe('seasonalMovement', () => {
  it('uses temperate_indoor preset (MC 6→12)', () => {
    const result = seasonalMovement(400, 'maple', 'temperate_indoor');
    // 400 * 0.00353 * 6 = 8.472
    expect(result.changeMm).toBeCloseTo(8.472, 2);
    expect(result.direction).toBe('expansion');
  });

  it('uses controlled_indoor preset (MC 7→9)', () => {
    const result = seasonalMovement(400, 'maple', 'controlled_indoor');
    // 400 * 0.00353 * 2 = 2.824
    expect(result.changeMm).toBeCloseTo(2.824, 2);
  });

  it.each(Object.keys(SEASONAL_PRESETS) as Array<keyof typeof SEASONAL_PRESETS>)(
    'preset "%s" produces valid result',
    (preset) => {
      const result = seasonalMovement(300, 'oak', preset);
      expect(result.finalWidthMm).toBeGreaterThan(0);
      expect(result.direction).toBe('expansion');
    },
  );
});

describe('SPECIES_COEFFICIENTS', () => {
  it('has 14 species defined', () => {
    expect(Object.keys(SPECIES_COEFFICIENTS)).toHaveLength(14);
  });

  it.each(Object.entries(SPECIES_COEFFICIENTS))('%s coefficient is positive and < 0.01', (_species, coeff) => {
    expect(coeff).toBeGreaterThan(0);
    expect(coeff).toBeLessThan(0.01);
  });
});
