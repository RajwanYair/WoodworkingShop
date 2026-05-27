import { describe, it, expect } from 'vitest';
import { calculatePolygonMiter, calculateCompoundMiter, calculateCrownMolding } from '../../src/engine/miter-angle';

describe('calculatePolygonMiter', () => {
  it.each([
    { sides: 4, miter: 45, interior: 90, sum: 360 },
    { sides: 6, miter: 30, interior: 120, sum: 720 },
    { sides: 8, miter: 22.5, interior: 135, sum: 1080 },
    { sides: 3, miter: 60, interior: 60, sum: 180 },
    { sides: 12, miter: 15, interior: 150, sum: 1800 },
  ])('polygon with $sides sides → miter=$miter°, interior=$interior°', ({ sides, miter, interior, sum }) => {
    const result = calculatePolygonMiter({ sides });
    expect(result.miterAngle).toBe(miter);
    expect(result.interiorAngle).toBe(interior);
    expect(result.angleSum).toBe(sum);
  });

  it('handles 5-sided polygon (pentagon)', () => {
    const result = calculatePolygonMiter({ sides: 5 });
    expect(result.miterAngle).toBe(36);
    expect(result.interiorAngle).toBe(108);
    expect(result.angleSum).toBe(540);
  });

  it.each([
    { desc: 'sides = 2', sides: 2 },
    { desc: 'sides = 0', sides: 0 },
    { desc: 'sides = 37', sides: 37 },
    { desc: 'sides = 4.5', sides: 4.5 },
  ])('throws RangeError for $desc', ({ sides }) => {
    expect(() => calculatePolygonMiter({ sides })).toThrow(RangeError);
  });
});

describe('calculateCompoundMiter', () => {
  it('zero tilt with 90° corner gives 0 miter, 45 bevel', () => {
    const result = calculateCompoundMiter({ tiltDeg: 0, cornerDeg: 90 });
    expect(result.miterAngle).toBe(0);
    expect(result.bevelAngle).toBe(45);
  });

  it('increasing tilt increases miter angle', () => {
    const low = calculateCompoundMiter({ tiltDeg: 10, cornerDeg: 90 });
    const high = calculateCompoundMiter({ tiltDeg: 45, cornerDeg: 90 });
    expect(high.miterAngle).toBeGreaterThan(low.miterAngle);
  });

  it('narrower corner increases bevel angle', () => {
    const wide = calculateCompoundMiter({ tiltDeg: 30, cornerDeg: 120 });
    const narrow = calculateCompoundMiter({ tiltDeg: 30, cornerDeg: 60 });
    expect(narrow.bevelAngle).toBeGreaterThan(wide.bevelAngle);
  });

  it('produces reasonable angles for 30° tilt, 90° corner', () => {
    const result = calculateCompoundMiter({ tiltDeg: 30, cornerDeg: 90 });
    expect(result.miterAngle).toBeGreaterThan(0);
    expect(result.miterAngle).toBeLessThan(45);
    expect(result.bevelAngle).toBeGreaterThan(0);
    expect(result.bevelAngle).toBeLessThan(90);
  });

  it.each([
    { desc: 'tiltDeg = 90', input: { tiltDeg: 90, cornerDeg: 90 } },
    { desc: 'tiltDeg = -1', input: { tiltDeg: -1, cornerDeg: 90 } },
    { desc: 'cornerDeg = 0', input: { tiltDeg: 30, cornerDeg: 0 } },
    { desc: 'cornerDeg = 180', input: { tiltDeg: 30, cornerDeg: 180 } },
  ])('throws RangeError for $desc', ({ input }) => {
    expect(() => calculateCompoundMiter(input)).toThrow(RangeError);
  });
});

describe('calculateCrownMolding', () => {
  it('standard 38° spring, 90° inside corner', () => {
    const result = calculateCrownMolding({ springAngle: 38, wallAngle: 90 });
    expect(result.cornerType).toBe('inside');
    expect(result.miterAngle).toBeGreaterThan(20);
    expect(result.miterAngle).toBeLessThan(40);
    expect(result.bevelAngle).toBeGreaterThan(20);
    expect(result.bevelAngle).toBeLessThan(50);
  });

  it('45° spring, 90° inside corner', () => {
    const result = calculateCrownMolding({ springAngle: 45, wallAngle: 90 });
    expect(result.cornerType).toBe('inside');
    expect(result.miterAngle).toBeGreaterThan(25);
    expect(result.miterAngle).toBeLessThan(40);
    expect(result.bevelAngle).toBeGreaterThan(25);
    expect(result.bevelAngle).toBeLessThan(45);
  });

  it('outside corner (wallAngle > 180)', () => {
    const result = calculateCrownMolding({ springAngle: 38, wallAngle: 270 });
    expect(result.cornerType).toBe('outside');
    expect(result.miterAngle).toBeGreaterThan(0);
    expect(result.bevelAngle).toBeGreaterThan(0);
  });

  it.each([
    { desc: 'springAngle = 0', input: { springAngle: 0, wallAngle: 90 } },
    { desc: 'springAngle = 90', input: { springAngle: 90, wallAngle: 90 } },
    { desc: 'wallAngle = 0', input: { springAngle: 38, wallAngle: 0 } },
    { desc: 'wallAngle = 360', input: { springAngle: 38, wallAngle: 360 } },
  ])('throws RangeError for $desc', ({ input }) => {
    expect(() => calculateCrownMolding(input)).toThrow(RangeError);
  });
});
