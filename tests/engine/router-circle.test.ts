import { describe, it, expect } from 'vitest';
import { calculateRouterCircle } from '../../src/engine/router-circle';

describe('calculateRouterCircle', () => {
  it('calculates disc mode arm length as radius + bit/2', () => {
    const result = calculateRouterCircle({
      targetDiameterMm: 300,
      bitDiameterMm: 12,
      cutMode: 'disc',
    });

    expect(result.armLengthMm).toBe(156);
  });

  it('calculates hole mode arm length as radius - bit/2', () => {
    const result = calculateRouterCircle({
      targetDiameterMm: 300,
      bitDiameterMm: 12,
      cutMode: 'hole',
    });

    expect(result.armLengthMm).toBe(144);
  });

  it('calculates circumference as pi × diameter', () => {
    const result = calculateRouterCircle({
      targetDiameterMm: 200,
      bitDiameterMm: 10,
      cutMode: 'disc',
    });

    const expected = Math.round(Math.PI * 200 * 10) / 10;
    expect(result.circumferenceMm).toBe(expected);
  });

  it('calculates area as pi × r^2', () => {
    const result = calculateRouterCircle({
      targetDiameterMm: 200,
      bitDiameterMm: 10,
      cutMode: 'disc',
    });

    const expected = Math.round(Math.PI * 100 * 100 * 10) / 10;
    expect(result.areaMm2).toBe(expected);
  });

  it('uses default pivot hole diameter of 6 mm', () => {
    const result = calculateRouterCircle({
      targetDiameterMm: 200,
      bitDiameterMm: 10,
      cutMode: 'disc',
    });

    expect(result.pivotOffsetMm).toBe(3);
  });

  it('uses custom pivot hole diameter', () => {
    const result = calculateRouterCircle({
      targetDiameterMm: 200,
      bitDiameterMm: 10,
      pivotHoleDiameterMm: 8,
      cutMode: 'disc',
    });

    expect(result.pivotOffsetMm).toBe(4);
  });

  it.each([
    ['targetDiameterMm = 0', { targetDiameterMm: 0, bitDiameterMm: 10, cutMode: 'disc' as const }],
    ['bitDiameterMm = 0', { targetDiameterMm: 200, bitDiameterMm: 0, cutMode: 'disc' as const }],
    ['bitDiameterMm >= targetDiameterMm', { targetDiameterMm: 200, bitDiameterMm: 200, cutMode: 'disc' as const }],
    [
      'pivotHoleDiameterMm = 0',
      { targetDiameterMm: 200, bitDiameterMm: 10, pivotHoleDiameterMm: 0, cutMode: 'disc' as const },
    ],
  ])('throws RangeError for invalid input: %s', (_label, input) => {
    expect(() => calculateRouterCircle(input)).toThrow(RangeError);
  });
});
