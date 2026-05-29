import { describe, it, expect } from 'vitest';
import { calculateBoxJoint } from '../../src/engine/box-joint';

describe('calculateBoxJoint', () => {
  const BASE = { boardWidthMm: 150, fingerWidthMm: 15, depthMm: 18 };

  it('returns an odd fingerCount', () => {
    const r = calculateBoxJoint(BASE);
    expect(r.fingerCount % 2).toBe(1);
  });

  it('fingerCount ≥ 3', () => {
    const r = calculateBoxJoint(BASE);
    expect(r.fingerCount).toBeGreaterThanOrEqual(3);
  });

  it('socketCount is floor(fingerCount / 2)', () => {
    const r = calculateBoxJoint(BASE);
    expect(r.socketCount).toBe(Math.floor(r.fingerCount / 2));
  });

  it('actualFingerWidth × fingerCount ≈ boardWidth', () => {
    const r = calculateBoxJoint(BASE);
    expect(r.actualFingerWidthMm * r.fingerCount).toBeCloseTo(BASE.boardWidthMm, 1);
  });

  it('glueSurface equals fingerCount × actualWidth × depth × 2', () => {
    const r = calculateBoxJoint(BASE);
    const expected = r.fingerCount * r.actualFingerWidthMm * BASE.depthMm * 2;
    expect(r.glueSurfaceMm2).toBeCloseTo(expected, 0);
  });

  it('forces fingerCount to 3 minimum for very wide requested finger', () => {
    // boardWidth=150, fingerWidth=60 → floor(150/60)=2 → force to 3
    const r = calculateBoxJoint({ boardWidthMm: 150, fingerWidthMm: 60, depthMm: 18 });
    expect(r.fingerCount).toBe(3);
  });

  it('handles board width not evenly divisible by finger width', () => {
    const r = calculateBoxJoint({ boardWidthMm: 100, fingerWidthMm: 12, depthMm: 15 });
    expect(r.fingerCount % 2).toBe(1);
    expect(r.actualFingerWidthMm * r.fingerCount).toBeCloseTo(100, 1);
  });

  it('edgeWaste is zero when board divides evenly into odd count', () => {
    // 90 / 9 = 10 fingers but 9 is odd so actualFingerWidth = 90/9 = 10
    const r = calculateBoxJoint({ boardWidthMm: 90, fingerWidthMm: 10, depthMm: 18 });
    expect(r.edgeWasteMm).toBeCloseTo(0, 2);
  });

  describe('error guards', () => {
    it.each([
      ['zero boardWidth', { boardWidthMm: 0, fingerWidthMm: 15, depthMm: 18 }],
      ['zero fingerWidth', { boardWidthMm: 150, fingerWidthMm: 0, depthMm: 18 }],
      ['zero depth', { boardWidthMm: 150, fingerWidthMm: 15, depthMm: 0 }],
      ['fingerWidth ≥ boardWidth', { boardWidthMm: 50, fingerWidthMm: 60, depthMm: 18 }],
    ])('throws RangeError for %s', (_, input) => {
      expect(() => calculateBoxJoint(input)).toThrow(RangeError);
    });
  });
});
