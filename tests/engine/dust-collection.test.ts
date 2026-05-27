import { describe, it, expect } from 'vitest';
import {
  machineCfm,
  machineStaticPressure,
  recommendTrunkDiameter,
  recommendHp,
  calculateSystem,
  validateCollector,
} from '../../src/engine/dust-collection';
import type { DustMachine, CollectorSpec } from '../../src/engine/dust-collection';

function makeMachine(overrides: Partial<DustMachine> = {}): DustMachine {
  return {
    id: 'ts-1',
    name: 'Table Saw',
    type: 'tablesaw',
    portDiameter: 4,
    ductRunFeet: 10,
    elbowCount: 2,
    ...overrides,
  };
}

describe('dust-collection', () => {
  describe('machineCfm', () => {
    it.each([
      { type: 'tablesaw' as const, port: 4, expected: 350 },
      { type: 'planer' as const, port: 4, expected: 400 },
      { type: 'drill-press' as const, port: 4, expected: 150 },
      { type: 'tablesaw' as const, port: 6, expected: 788 },
    ])('returns $expected CFM for $type with $port" port', ({ type, port, expected }) => {
      const m = makeMachine({ type, portDiameter: port });
      expect(machineCfm(m)).toBe(expected);
    });

    it('throws RangeError for non-positive port diameter', () => {
      expect(() => machineCfm(makeMachine({ portDiameter: 0 }))).toThrow(RangeError);
      expect(() => machineCfm(makeMachine({ portDiameter: -1 }))).toThrow(RangeError);
    });

    it('caps CFM at 2.25x area ratio', () => {
      // 8" port => (8/4)^2 = 4 area ratio, capped at 2.25
      const m = makeMachine({ type: 'tablesaw', portDiameter: 8 });
      expect(machineCfm(m)).toBe(Math.round(350 * 2.25));
    });
  });

  describe('machineStaticPressure', () => {
    it('calculates pressure loss with elbows as equivalent feet', () => {
      const m = makeMachine({ ductRunFeet: 10, elbowCount: 2, portDiameter: 4 });
      // (10 + 2*5) * 0.02 * (4/4)^1.22 = 20 * 0.02 = 0.4
      expect(machineStaticPressure(m)).toBeCloseTo(0.4, 2);
    });

    it('scales inversely with larger diameter', () => {
      const small = makeMachine({ portDiameter: 4, ductRunFeet: 20, elbowCount: 0 });
      const large = makeMachine({ portDiameter: 6, ductRunFeet: 20, elbowCount: 0 });
      expect(machineStaticPressure(large)).toBeLessThan(machineStaticPressure(small));
    });

    it('throws on negative ductRunFeet', () => {
      expect(() => machineStaticPressure(makeMachine({ ductRunFeet: -1 }))).toThrow(RangeError);
    });

    it('throws on negative elbowCount', () => {
      expect(() => machineStaticPressure(makeMachine({ elbowCount: -1 }))).toThrow(RangeError);
    });
  });

  describe('recommendTrunkDiameter', () => {
    it.each([
      { cfm: 350, expected: 5 },
      { cfm: 700, expected: 6 },
      { cfm: 1200, expected: 8 },
    ])('recommends $expected" for $cfm CFM', ({ cfm, expected }) => {
      expect(recommendTrunkDiameter(cfm)).toBe(expected);
    });

    it('throws on non-positive CFM', () => {
      expect(() => recommendTrunkDiameter(0)).toThrow(RangeError);
      expect(() => recommendTrunkDiameter(-100)).toThrow(RangeError);
    });
  });

  describe('recommendHp', () => {
    it.each([
      { cfm: 150, expected: 1 },
      { cfm: 300, expected: 2 },
      { cfm: 700, expected: 5 },
      { cfm: 1500, expected: 10 },
    ])('recommends $expected HP for $cfm CFM', ({ cfm, expected }) => {
      expect(recommendHp(cfm)).toBe(expected);
    });

    it('throws on non-positive CFM', () => {
      expect(() => recommendHp(0)).toThrow(RangeError);
    });
  });

  describe('calculateSystem', () => {
    it('calculates total CFM for top N simultaneous machines', () => {
      const machines = [
        makeMachine({ id: 'ts', type: 'tablesaw' }),
        makeMachine({ id: 'pl', type: 'planer' }),
        makeMachine({ id: 'dp', type: 'drill-press' }),
      ];
      const result = calculateSystem(machines, 2);
      // Top 2 by CFM: planer (400) + tablesaw (350) = 750
      expect(result.totalCfmRequired).toBe(750);
    });

    it('includes all machines in breakdown', () => {
      const machines = [makeMachine({ id: 'a', type: 'tablesaw' }), makeMachine({ id: 'b', type: 'router' })];
      const result = calculateSystem(machines, 1);
      expect(result.machineBreakdown).toHaveLength(2);
    });

    it('warns when total CFM > 1500', () => {
      const machines = Array.from({ length: 5 }, (_, i) => makeMachine({ id: `m${i}`, type: 'planer' }));
      const result = calculateSystem(machines, 5);
      expect(result.totalCfmRequired).toBeGreaterThan(1500);
      expect(result.warnings.some((w) => w.includes('1500 CFM'))).toBe(true);
      expect(result.adequate).toBe(false);
    });

    it('produces recommendations within valid ranges', () => {
      const machines = [makeMachine()];
      const result = calculateSystem(machines, 1);
      expect(result.recommendedHp).toBeGreaterThanOrEqual(1);
      expect(result.recommendedTrunkDiameter).toBeGreaterThanOrEqual(4);
      expect(result.staticPressureLoss).toBeGreaterThanOrEqual(0);
    });

    it('throws on empty machines array', () => {
      expect(() => calculateSystem([], 1)).toThrow(RangeError);
    });

    it('throws on simultaneousMachines < 1', () => {
      expect(() => calculateSystem([makeMachine()], 0)).toThrow(RangeError);
    });

    it('defaults simultaneousMachines to 2', () => {
      const machines = [
        makeMachine({ id: 'a', type: 'planer' }),
        makeMachine({ id: 'b', type: 'tablesaw' }),
        makeMachine({ id: 'c', type: 'drill-press' }),
      ];
      const result = calculateSystem(machines);
      // Top 2: planer (400) + tablesaw (350) = 750
      expect(result.totalCfmRequired).toBe(750);
    });
  });

  describe('validateCollector', () => {
    it('returns adequate when spec meets requirements', () => {
      const result = calculateSystem([makeMachine()], 1);
      const spec: CollectorSpec = {
        cfmCapacity: 800,
        hp: 3,
        maxStaticPressure: 10,
      };
      const validation = validateCollector(spec, result);
      expect(validation.adequate).toBe(true);
      expect(validation.deficiencies).toHaveLength(0);
    });

    it('identifies undersized CFM capacity', () => {
      const result = calculateSystem([makeMachine(), makeMachine({ id: 'b', type: 'planer' })], 2);
      const spec: CollectorSpec = { cfmCapacity: 100, hp: 10, maxStaticPressure: 20 };
      const validation = validateCollector(spec, result);
      expect(validation.adequate).toBe(false);
      expect(validation.deficiencies.some((d) => d.includes('CFM'))).toBe(true);
    });

    it('identifies insufficient HP', () => {
      const result = calculateSystem([makeMachine()], 1);
      const spec: CollectorSpec = {
        cfmCapacity: 2000,
        hp: 0.5,
        maxStaticPressure: 20,
      };
      const validation = validateCollector(spec, result);
      expect(validation.deficiencies.some((d) => d.includes('HP'))).toBe(true);
    });
  });
});
