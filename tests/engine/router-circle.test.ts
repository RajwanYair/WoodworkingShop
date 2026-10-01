import { describe, it, expect } from 'vitest';
import FESTOOL_ROUTER_CIRCLE_ORACLE from '../fixtures/oracles/festool-router-circle.json';
import { calculateRouterCircle } from '../../src/engine/router-circle';

describe('calculateRouterCircle', () => {
  it('calculates disc mode arm length as radius - bit/2', () => {
    const result = calculateRouterCircle({
      targetDiameterMm: 300,
      bitDiameterMm: 12,
      cutMode: 'disc',
    });

    expect(result.armLengthMm).toBe(144);
  });

  it('calculates hole mode arm length as radius + bit/2', () => {
    const result = calculateRouterCircle({
      targetDiameterMm: 300,
      bitDiameterMm: 12,
      cutMode: 'hole',
    });

    expect(result.armLengthMm).toBe(156);
  });

  it.each([
    { cutMode: 'disc' as const, armLengthMm: 95 },
    { cutMode: 'hole' as const, armLengthMm: 105 },
  ])('matches the 200 mm diameter $cutMode oracle', ({ cutMode, armLengthMm }) => {
    expect(calculateRouterCircle({ targetDiameterMm: 200, bitDiameterMm: 10, cutMode })).toEqual({
      armLengthMm,
      circumferenceMm: 628.3,
      areaMm2: 31415.9,
      pivotOffsetMm: 3,
    });
  });

  it.each(FESTOOL_ROUTER_CIRCLE_ORACLE.cases)(
    'matches Festool 200 mm radius / 14 mm cutter setting for $cutMode',
    ({ cutMode, armLengthMm }) => {
      if (cutMode !== 'disc' && cutMode !== 'hole') {
        throw new Error(`Unexpected Festool oracle cut mode: ${cutMode}`);
      }

      expect(
        calculateRouterCircle({
          ...FESTOOL_ROUTER_CIRCLE_ORACLE.input,
          cutMode,
        }).armLengthMm,
      ).toBe(armLengthMm);
    },
  );

  it('calculates circumference as pi × diameter', () => {
    const result = calculateRouterCircle({
      targetDiameterMm: 200,
      bitDiameterMm: 10,
      cutMode: 'disc',
    });

    expect(result.circumferenceMm).toBe(628.3);
  });

  it('calculates area as pi × r^2', () => {
    const result = calculateRouterCircle({
      targetDiameterMm: 200,
      bitDiameterMm: 10,
      cutMode: 'disc',
    });

    expect(result.areaMm2).toBe(31415.9);
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

  it.each([
    ['NaN targetDiameterMm', { targetDiameterMm: Number.NaN, bitDiameterMm: 10, cutMode: 'disc' as const }],
    [
      'infinite bitDiameterMm',
      { targetDiameterMm: 200, bitDiameterMm: Number.POSITIVE_INFINITY, cutMode: 'disc' as const },
    ],
    [
      'NaN pivotHoleDiameterMm',
      { targetDiameterMm: 200, bitDiameterMm: 10, pivotHoleDiameterMm: Number.NaN, cutMode: 'disc' as const },
    ],
    ['overflowing area', { targetDiameterMm: Number.MAX_VALUE, bitDiameterMm: 10, cutMode: 'disc' as const }],
  ])('throws RangeError for non-finite input: %s', (_label, input) => {
    expect(() => calculateRouterCircle(input)).toThrow(RangeError);
  });
});
