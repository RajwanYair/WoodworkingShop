import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import WOOD_MAGAZINE_BOX_JOINT_ORACLE from '../fixtures/oracles/wood-magazine-box-joint-quarter-inch.json';
import { calculateBoxJoint } from '../../src/engine/box-joint';
import { propertyRunOptions } from '../property-seeds';

describe('calculateBoxJoint', () => {
  const BASE = { boardWidthMm: 150, fingerWidthMm: 15, depthMm: 18 };

  it('matches WOOD Magazine quarter-inch box-joint dimensions', () => {
    const result = calculateBoxJoint(WOOD_MAGAZINE_BOX_JOINT_ORACLE.input);

    expect(result.fingerCount).toBe(WOOD_MAGAZINE_BOX_JOINT_ORACLE.expected.fingerCount);
    expect(result.actualFingerWidthMm).toBe(WOOD_MAGAZINE_BOX_JOINT_ORACLE.expected.actualFingerWidthMm);
    expect(result.edgeWasteMm).toBe(WOOD_MAGAZINE_BOX_JOINT_ORACLE.expected.edgeWasteMm);
  });

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

  it('matches the dimensional oracle after adjusting to an odd finger count', () => {
    const result = calculateBoxJoint({ boardWidthMm: 160, fingerWidthMm: 25, depthMm: 19 });

    expect(result).toEqual({
      fingerCount: 5,
      actualFingerWidthMm: 32,
      socketCount: 2,
      glueSurfaceMm2: 6080,
      edgeWasteMm: 0,
    });
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

  it('preserves generated finger-count and board-width geometry invariants', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 5000 }).chain((boardWidthMm) =>
          fc.record({
            boardWidthMm: fc.constant(boardWidthMm),
            fingerWidthMm: fc.integer({ min: 1, max: boardWidthMm - 1 }),
            depthMm: fc.integer({ min: 1, max: 100 }),
          }),
        ),
        (input) => {
          const result = calculateBoxJoint(input);
          const coveredBoardWidthMm = result.fingerCount * result.actualFingerWidthMm;

          expect(result.fingerCount).toBeGreaterThanOrEqual(3);
          expect(result.fingerCount % 2).toBe(1);
          expect(result.socketCount).toBe(Math.floor(result.fingerCount / 2));
          expect(Math.abs(coveredBoardWidthMm - input.boardWidthMm)).toBeLessThanOrEqual(
            result.fingerCount * 0.005 + 0.000001,
          );
          expect(Math.abs(2 * result.edgeWasteMm - (coveredBoardWidthMm - input.boardWidthMm))).toBeLessThanOrEqual(
            0.010001,
          );
          expect(Math.abs(result.glueSurfaceMm2 - coveredBoardWidthMm * input.depthMm * 2)).toBeLessThanOrEqual(
            0.050001,
          );
        },
      ),
      propertyRunOptions('tests/engine/box-joint.test.ts', 200),
    );
  });

  describe('error guards', () => {
    it.each([
      ['zero boardWidth', { boardWidthMm: 0, fingerWidthMm: 15, depthMm: 18 }],
      ['zero fingerWidth', { boardWidthMm: 150, fingerWidthMm: 0, depthMm: 18 }],
      ['zero depth', { boardWidthMm: 150, fingerWidthMm: 15, depthMm: 0 }],
      ['fingerWidth ≥ boardWidth', { boardWidthMm: 50, fingerWidthMm: 60, depthMm: 18 }],
      ['NaN boardWidth', { boardWidthMm: Number.NaN, fingerWidthMm: 15, depthMm: 18 }],
      ['infinite fingerWidth', { boardWidthMm: 150, fingerWidthMm: Number.POSITIVE_INFINITY, depthMm: 18 }],
      ['NaN depth', { boardWidthMm: 150, fingerWidthMm: 15, depthMm: Number.NaN }],
      ['overflowing glue surface', { boardWidthMm: 150, fingerWidthMm: 15, depthMm: Number.MAX_VALUE }],
    ])('throws RangeError for %s', (_, input) => {
      expect(() => calculateBoxJoint(input)).toThrow(RangeError);
    });
  });
});
