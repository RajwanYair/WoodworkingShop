import { describe, it, expect } from 'vitest';
import { calculateDrillSpeed, maxBitDiameter, MATERIAL_SFM, BIT_TYPE_FACTOR } from '../../src/engine/drill-speed';
import type { DrillSpeedInput } from '../../src/engine/drill-speed';

const baseInput: DrillSpeedInput = {
  bitDiameterMm: 10,
  bitType: 'brad_point',
  material: 'hardwood',
};

describe('calculateDrillSpeed', () => {
  it('computes valid RPM for 10mm brad point in hardwood', () => {
    const result = calculateDrillSpeed(baseInput);
    expect(result.rpm).toBeGreaterThan(0);
    expect(result.rpm % 50).toBe(0); // rounded to nearest 50
    expect(result.sfm).toBe(250);
    expect(result.feedMmPerRev).toBeGreaterThan(0);
    expect(result.minRpm).toBeLessThan(result.rpm);
    expect(result.maxRpm).toBeGreaterThan(result.rpm);
  });

  it('slower RPM for larger diameter bits', () => {
    const small = calculateDrillSpeed({ ...baseInput, bitDiameterMm: 5 });
    const large = calculateDrillSpeed({ ...baseInput, bitDiameterMm: 25 });
    expect(large.rpm).toBeLessThan(small.rpm);
  });

  it('slower RPM for Forstner vs brad point at same diameter', () => {
    const brad = calculateDrillSpeed(baseInput);
    const forstner = calculateDrillSpeed({ ...baseInput, bitType: 'forstner' });
    expect(forstner.rpm).toBeLessThan(brad.rpm);
  });

  it('faster RPM for softwood vs hardwood', () => {
    const hard = calculateDrillSpeed(baseInput);
    const soft = calculateDrillSpeed({ ...baseInput, material: 'softwood' });
    expect(soft.rpm).toBeGreaterThan(hard.rpm);
  });

  it('calculates drill time when depth provided', () => {
    const result = calculateDrillSpeed({ ...baseInput, depthMm: 20 });
    expect(result.drillTimeSec).toBeGreaterThan(0);
  });

  it('returns 0 drill time when no depth', () => {
    const result = calculateDrillSpeed(baseInput);
    expect(result.drillTimeSec).toBe(0);
  });

  it.each([
    { rpm: 500, expected: 'low' },
    { rpm: 1500, expected: 'medium' },
    { rpm: 3000, expected: 'high' },
  ])('speed setting for ~$rpm RPM is $expected', ({ rpm, expected }) => {
    // Find a diameter that gives approximately the target RPM
    const sfm = 250;
    const dInches = (sfm * 12) / (Math.PI * rpm);
    const dMm = dInches * 25.4;
    const result = calculateDrillSpeed({ ...baseInput, bitDiameterMm: dMm });
    expect(result.speedSetting).toBe(expected);
  });

  it('hole saw has lowest factor (slowest speed)', () => {
    const holeSaw = calculateDrillSpeed({
      ...baseInput,
      bitType: 'hole_saw',
      bitDiameterMm: 50,
    });
    const twist = calculateDrillSpeed({
      ...baseInput,
      bitType: 'twist',
      bitDiameterMm: 50,
    });
    expect(holeSaw.rpm).toBeLessThan(twist.rpm);
  });

  it.each([
    { desc: 'bitDiameterMm = 0', override: { bitDiameterMm: 0 } },
    { desc: 'bitDiameterMm = -1', override: { bitDiameterMm: -1 } },
    { desc: 'depthMm = -5', override: { depthMm: -5 } },
  ])('throws RangeError for $desc', ({ override }) => {
    expect(() => calculateDrillSpeed({ ...baseInput, ...override })).toThrow(RangeError);
  });
});

describe('maxBitDiameter', () => {
  it('returns larger diameter for lower RPM', () => {
    const low = maxBitDiameter(500, 'hardwood', 'twist');
    const high = maxBitDiameter(3000, 'hardwood', 'twist');
    expect(low).toBeGreaterThan(high);
  });

  it('returns smaller diameter for Forstner (reduced factor)', () => {
    const twist = maxBitDiameter(1500, 'hardwood', 'twist');
    const forstner = maxBitDiameter(1500, 'hardwood', 'forstner');
    expect(forstner).toBeLessThan(twist);
  });

  it('throws RangeError for rpm ≤ 0', () => {
    expect(() => maxBitDiameter(0, 'hardwood', 'twist')).toThrow(RangeError);
  });
});

describe('MATERIAL_SFM', () => {
  it('has 6 materials defined', () => {
    expect(Object.keys(MATERIAL_SFM)).toHaveLength(6);
  });

  it('all SFM values are positive', () => {
    for (const sfm of Object.values(MATERIAL_SFM)) {
      expect(sfm).toBeGreaterThan(0);
    }
  });
});

describe('BIT_TYPE_FACTOR', () => {
  it('has 6 bit types defined', () => {
    expect(Object.keys(BIT_TYPE_FACTOR)).toHaveLength(6);
  });

  it('all factors are between 0 and 1 inclusive', () => {
    for (const factor of Object.values(BIT_TYPE_FACTOR)) {
      expect(factor).toBeGreaterThan(0);
      expect(factor).toBeLessThanOrEqual(1);
    }
  });
});
