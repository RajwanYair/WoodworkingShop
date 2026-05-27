import { describe, it, expect } from 'vitest';
import { calculateTablesawBladeHeight } from '../../src/engine/tablesaw-blade';
import type { TablesawBladeResult } from '../../src/engine/tablesaw-blade';

describe('calculateTablesawBladeHeight', () => {
  describe('through cuts', () => {
    it.each([
      {
        desc: '10" blade through 19mm plywood',
        input: {
          bladeDiameterMm: 254,
          kerfMm: 3.2,
          workpieceThicknessMm: 19,
          cutType: 'through' as const,
        },
        expectFn: (r: TablesawBladeResult) => {
          expect(r.bladeHeightMm).toBe(25);
          expect(r.bladeExposureMm).toBe(6);
          expect(r.safetyMarginMm).toBe(6);
          expect(r.isFeasible).toBe(true);
          expect(r.kerfWasteMm).toBe(3.2);
          expect(r.maxCutDepthMm).toBe(127);
        },
      },
      {
        desc: '12" blade through 50mm hardwood',
        input: {
          bladeDiameterMm: 305,
          kerfMm: 3.5,
          workpieceThicknessMm: 50,
          cutType: 'through' as const,
        },
        expectFn: (r: TablesawBladeResult) => {
          expect(r.bladeHeightMm).toBe(56);
          expect(r.isFeasible).toBe(true);
        },
      },
      {
        desc: 'unfeasible through cut (blade too small)',
        input: {
          bladeDiameterMm: 100,
          kerfMm: 2,
          workpieceThicknessMm: 60,
          cutType: 'through' as const,
        },
        expectFn: (r: TablesawBladeResult) => {
          expect(r.bladeHeightMm).toBe(66);
          expect(r.maxCutDepthMm).toBe(50);
          expect(r.isFeasible).toBe(false);
        },
      },
    ])('$desc', ({ input, expectFn }) => {
      const result = calculateTablesawBladeHeight(input);
      expectFn(result);
    });
  });

  describe('dado/rabbet/groove cuts', () => {
    it.each([
      {
        desc: 'dado at 8mm depth',
        input: {
          bladeDiameterMm: 254,
          kerfMm: 3.2,
          workpieceThicknessMm: 19,
          cutType: 'dado' as const,
          dadoDepthMm: 8,
        },
        expectFn: (r: TablesawBladeResult) => {
          expect(r.bladeHeightMm).toBe(8);
          expect(r.bladeExposureMm).toBe(0);
          expect(r.safetyMarginMm).toBe(0);
          expect(r.isFeasible).toBe(true);
        },
      },
      {
        desc: 'rabbet defaults to half thickness',
        input: {
          bladeDiameterMm: 254,
          kerfMm: 3.2,
          workpieceThicknessMm: 20,
          cutType: 'rabbet' as const,
        },
        expectFn: (r: TablesawBladeResult) => {
          expect(r.bladeHeightMm).toBe(10);
        },
      },
      {
        desc: 'groove cut',
        input: {
          bladeDiameterMm: 254,
          kerfMm: 6.35,
          workpieceThicknessMm: 19,
          cutType: 'groove' as const,
          dadoDepthMm: 6,
        },
        expectFn: (r: TablesawBladeResult) => {
          expect(r.bladeHeightMm).toBe(6);
          expect(r.kerfWasteMm).toBe(6.35);
        },
      },
    ])('$desc', ({ input, expectFn }) => {
      const result = calculateTablesawBladeHeight(input);
      expectFn(result);
    });
  });

  describe('invalid inputs', () => {
    it.each([
      {
        desc: 'zero blade diameter',
        input: { bladeDiameterMm: 0, kerfMm: 3, workpieceThicknessMm: 19, cutType: 'through' as const },
        msg: 'bladeDiameterMm must be > 0',
      },
      {
        desc: 'negative kerf',
        input: { bladeDiameterMm: 254, kerfMm: -1, workpieceThicknessMm: 19, cutType: 'through' as const },
        msg: 'kerfMm must be > 0',
      },
      {
        desc: 'zero workpiece thickness',
        input: { bladeDiameterMm: 254, kerfMm: 3, workpieceThicknessMm: 0, cutType: 'through' as const },
        msg: 'workpieceThicknessMm must be > 0',
      },
      {
        desc: 'dado depth >= workpiece',
        input: { bladeDiameterMm: 254, kerfMm: 3, workpieceThicknessMm: 19, cutType: 'dado' as const, dadoDepthMm: 19 },
        msg: 'dadoDepthMm must be < workpieceThicknessMm',
      },
      {
        desc: 'negative dado depth',
        input: { bladeDiameterMm: 254, kerfMm: 3, workpieceThicknessMm: 19, cutType: 'dado' as const, dadoDepthMm: -2 },
        msg: 'dadoDepthMm must be > 0',
      },
    ])('throws on $desc', ({ input, msg }) => {
      expect(() => calculateTablesawBladeHeight(input)).toThrow(msg);
    });
  });
});
