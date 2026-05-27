import { describe, it, expect } from 'vitest';
import { calculateFingerJoint } from '../../src/engine/finger-joint';

describe('calculateFingerJoint', () => {
  describe('valid inputs', () => {
    it.each([
      {
        desc: 'default finger width from thickness',
        input: { boardWidthMm: 150, boardThicknessMm: 18 },
        expectFn: (r: ReturnType<typeof calculateFingerJoint>) => {
          expect(r.fingerCount).toBeGreaterThanOrEqual(3);
          expect(r.fingerCount % 2).toBe(1);
          expect(r.socketDepthMm).toBeCloseTo(18.5, 1);
          expect(r.layoutA).toHaveLength(r.fingerCount);
          expect(r.layoutB).toHaveLength(r.fingerCount);
        },
      },
      {
        desc: 'explicit fingerWidthMm',
        input: { boardWidthMm: 100, boardThicknessMm: 12, fingerWidthMm: 10 },
        expectFn: (r: ReturnType<typeof calculateFingerJoint>) => {
          expect(r.fingerCount).toBe(9);
          expect(r.fingerWidthMm).toBeCloseTo(11.11, 1);
        },
      },
      {
        desc: 'explicit fingerCount',
        input: { boardWidthMm: 90, boardThicknessMm: 15, fingerCount: 5 },
        expectFn: (r: ReturnType<typeof calculateFingerJoint>) => {
          expect(r.fingerCount).toBe(5);
          expect(r.fingerWidthMm).toBe(18);
        },
      },
      {
        desc: 'even fingerCount rounded to odd',
        input: { boardWidthMm: 80, boardThicknessMm: 10, fingerCount: 6 },
        expectFn: (r: ReturnType<typeof calculateFingerJoint>) => {
          expect(r.fingerCount).toBe(5);
        },
      },
      {
        desc: 'custom glue allowance',
        input: { boardWidthMm: 120, boardThicknessMm: 18, glueAllowanceMm: 1 },
        expectFn: (r: ReturnType<typeof calculateFingerJoint>) => {
          expect(r.socketDepthMm).toBe(19);
        },
      },
    ])('$desc', ({ input, expectFn }) => {
      const result = calculateFingerJoint(input);
      expectFn(result);
    });
  });

  describe('layout correctness', () => {
    it('board A and B are inverse', () => {
      const result = calculateFingerJoint({
        boardWidthMm: 100,
        boardThicknessMm: 12,
        fingerCount: 5,
      });
      for (let i = 0; i < result.fingerCount; i++) {
        expect(result.layoutA[i].isFinger).toBe(!result.layoutB[i].isFinger);
        expect(result.layoutA[i].startMm).toBe(result.layoutB[i].startMm);
      }
    });

    it('glue surface area is positive', () => {
      const result = calculateFingerJoint({
        boardWidthMm: 200,
        boardThicknessMm: 18,
      });
      expect(result.glueSurfaceMm2).toBeGreaterThan(0);
    });
  });

  describe('invalid inputs', () => {
    it.each([
      {
        desc: 'negative board width',
        input: { boardWidthMm: -10, boardThicknessMm: 12 },
        msg: 'boardWidthMm must be > 0',
      },
      {
        desc: 'zero thickness',
        input: { boardWidthMm: 100, boardThicknessMm: 0 },
        msg: 'boardThicknessMm must be > 0',
      },
      {
        desc: 'negative finger width',
        input: { boardWidthMm: 100, boardThicknessMm: 12, fingerWidthMm: -5 },
        msg: 'fingerWidthMm must be > 0',
      },
      {
        desc: 'fingerCount too small',
        input: { boardWidthMm: 100, boardThicknessMm: 12, fingerCount: 2 },
        msg: 'fingerCount must be >= 3',
      },
      {
        desc: 'finger width too large for board',
        input: { boardWidthMm: 10, boardThicknessMm: 12, fingerWidthMm: 8 },
        msg: 'board too narrow',
      },
    ])('throws on $desc', ({ input, msg }) => {
      expect(() => calculateFingerJoint(input)).toThrow(msg);
    });
  });
});
