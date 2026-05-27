import { describe, it, expect } from 'vitest';
import { calculateDovetailLayout, recommendedDovetailAngle } from '../../src/engine/dovetail-layout';

describe('calculateDovetailLayout', () => {
  const baseInput = {
    boardWidthMm: 200,
    boardThicknessMm: 18,
    tailCount: 4,
    angleDegrees: 8,
    jointType: 'through' as const,
  };

  it('generates correct number of tails and pins', () => {
    const result = calculateDovetailLayout(baseInput);
    expect(result.tailCount).toBe(4);
    expect(result.pinCount).toBe(5); // 2 half-pins + 3 full pins
    expect(result.tails).toHaveLength(4);
    expect(result.pins).toHaveLength(5);
  });

  it('first and last pins are half-pins', () => {
    const result = calculateDovetailLayout(baseInput);
    expect(result.pins[0].isHalfPin).toBe(true);
    expect(result.pins[result.pins.length - 1].isHalfPin).toBe(true);
  });

  it('interior pins are not half-pins', () => {
    const result = calculateDovetailLayout(baseInput);
    const fullPins = result.pins.filter((p) => !p.isHalfPin);
    expect(fullPins).toHaveLength(3);
    for (const pin of fullPins) {
      expect(pin.isHalfPin).toBe(false);
    }
  });

  it('tail wide width is greater than narrow width for hand-cut', () => {
    const result = calculateDovetailLayout(baseInput);
    for (const tail of result.tails) {
      expect(tail.wideWidthMm).toBeGreaterThan(tail.narrowWidthMm);
    }
  });

  it('machine-cut style produces equal narrow and wide widths', () => {
    const result = calculateDovetailLayout({ ...baseInput, style: 'machine_cut' });
    for (const tail of result.tails) {
      expect(tail.wideWidthMm).toBeCloseTo(tail.narrowWidthMm, 1);
    }
  });

  it('layout fills the full board width', () => {
    const result = calculateDovetailLayout(baseInput);
    const lastPin = result.pins[result.pins.length - 1];
    expect(lastPin.endMm).toBeCloseTo(200, 0);
  });

  it('computes slope ratio string', () => {
    const result = calculateDovetailLayout({ ...baseInput, angleDegrees: 8 });
    // tan(8°) ≈ 0.1405 → 1/0.1405 ≈ 7
    expect(result.slopeRatio).toBe('1:7');
  });

  it('half-blind joint has reduced socket depth', () => {
    const result = calculateDovetailLayout({ ...baseInput, jointType: 'half_blind' });
    expect(result.socketDepthMm).toBeCloseTo(12, 0); // 2/3 of 18
    expect(result.socketDepthMm).toBeLessThan(baseInput.boardThicknessMm);
  });

  it('through joint socket depth equals board thickness', () => {
    const result = calculateDovetailLayout(baseInput);
    expect(result.socketDepthMm).toBe(18);
  });

  it('respects custom pinToTailRatio', () => {
    const narrow = calculateDovetailLayout({ ...baseInput, pinToTailRatio: 0.3 });
    const wide = calculateDovetailLayout({ ...baseInput, pinToTailRatio: 1.5 });
    const narrowFullPin = narrow.pins.find((p) => !p.isHalfPin)!;
    const wideFullPin = wide.pins.find((p) => !p.isHalfPin)!;
    expect(wideFullPin.widthMm).toBeGreaterThan(narrowFullPin.widthMm);
  });

  it.each([
    { desc: 'boardWidthMm = 0', override: { boardWidthMm: 0 } },
    { desc: 'boardThicknessMm = -1', override: { boardThicknessMm: -1 } },
    { desc: 'tailCount = 0', override: { tailCount: 0 } },
    { desc: 'angleDegrees = 4', override: { angleDegrees: 4 } },
    { desc: 'angleDegrees = 21', override: { angleDegrees: 21 } },
    { desc: 'pinToTailRatio = 0', override: { pinToTailRatio: 0 } },
    { desc: 'pinToTailRatio = 4', override: { pinToTailRatio: 4 } },
  ])('throws RangeError for $desc', ({ override }) => {
    expect(() => calculateDovetailLayout({ ...baseInput, ...override })).toThrow(RangeError);
  });
});

describe('recommendedDovetailAngle', () => {
  it('returns 8° for hardwood', () => {
    expect(recommendedDovetailAngle('hardwood')).toBe(8);
  });

  it('returns 12° for softwood', () => {
    expect(recommendedDovetailAngle('softwood')).toBe(12);
  });
});
