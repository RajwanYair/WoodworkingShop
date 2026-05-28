import { describe, it, expect } from 'vitest';
import { estimateWoodDryingTime, calculateEMC } from '../../src/engine/wood-drying';

describe('estimateWoodDryingTime', () => {
  const baseInput = {
    thicknessMm: 25,
    speciesClass: 'medium_hardwood' as const,
    initialMoisturePercent: 60,
    targetMoisturePercent: 8,
    method: 'air_dry' as const,
  };

  it('estimates air drying time for medium hardwood', () => {
    const result = estimateWoodDryingTime(baseInput);
    expect(result.estimatedDays).toBeGreaterThan(100);
    expect(result.estimatedWeeks).toBeGreaterThan(14);
    expect(result.moistureReductionPercent).toBe(52);
    expect(result.method).toBe('air_dry');
    expect(result.equalizationDays).toBe(0);
  });

  it('kiln drying is significantly faster than air drying', () => {
    const airResult = estimateWoodDryingTime(baseInput);
    const kilnResult = estimateWoodDryingTime({ ...baseInput, method: 'kiln_dry' });
    expect(kilnResult.estimatedDays).toBeLessThan(airResult.estimatedDays / 4);
  });

  it('thicker boards take longer to dry', () => {
    const thin = estimateWoodDryingTime({ ...baseInput, thicknessMm: 25 });
    const thick = estimateWoodDryingTime({ ...baseInput, thicknessMm: 50 });
    expect(thick.estimatedDays).toBeGreaterThan(thin.estimatedDays);
  });

  it('dense hardwood dries slower than softwood', () => {
    const soft = estimateWoodDryingTime({ ...baseInput, speciesClass: 'softwood' });
    const dense = estimateWoodDryingTime({ ...baseInput, speciesClass: 'dense_hardwood' });
    expect(dense.estimatedDays).toBeGreaterThan(soft.estimatedDays);
  });

  it('warmer ambient temperature speeds up air drying', () => {
    const cool = estimateWoodDryingTime({ ...baseInput, ambientTempC: 15 });
    const warm = estimateWoodDryingTime({ ...baseInput, ambientTempC: 30 });
    expect(warm.estimatedDays).toBeLessThan(cool.estimatedDays);
  });

  it('higher kiln temperature speeds up kiln drying', () => {
    const low = estimateWoodDryingTime({ ...baseInput, method: 'kiln_dry', kilnTempC: 50 });
    const high = estimateWoodDryingTime({ ...baseInput, method: 'kiln_dry', kilnTempC: 80 });
    expect(high.estimatedDays).toBeLessThan(low.estimatedDays);
  });

  it('kiln drying includes equalization days', () => {
    const result = estimateWoodDryingTime({ ...baseInput, method: 'kiln_dry', thicknessMm: 50 });
    expect(result.equalizationDays).toBe(2); // ceil(50/25)
  });

  it('returns defect risk assessment', () => {
    const result = estimateWoodDryingTime(baseInput);
    expect(['low', 'moderate', 'high']).toContain(result.defectRisk);
  });

  it('returns estimated weeks', () => {
    const result = estimateWoodDryingTime(baseInput);
    expect(result.estimatedWeeks).toBe(Math.ceil(result.estimatedDays / 7));
  });

  it.each([
    { desc: 'thicknessMm = 0', override: { thicknessMm: 0 } },
    { desc: 'initialMoisturePercent = 0', override: { initialMoisturePercent: 0 } },
    { desc: 'initialMoisturePercent = 201', override: { initialMoisturePercent: 201 } },
    { desc: 'target >= initial', override: { targetMoisturePercent: 60 } },
    { desc: 'target negative', override: { targetMoisturePercent: -1 } },
    { desc: 'ambientTempC = 0 for air dry', override: { ambientTempC: 0 } },
  ])('throws RangeError for $desc', ({ override }) => {
    expect(() => estimateWoodDryingTime({ ...baseInput, ...override })).toThrow(RangeError);
  });

  it('throws for kilnTempC = 0 on kiln dry', () => {
    expect(() => estimateWoodDryingTime({ ...baseInput, method: 'kiln_dry', kilnTempC: 0 })).toThrow(RangeError);
  });
});

describe('calculateEMC', () => {
  it('returns EMC for typical workshop conditions', () => {
    const emc = calculateEMC(20, 50);
    expect(emc).toBeGreaterThan(5);
    expect(emc).toBeLessThan(15);
  });

  it('higher humidity yields higher EMC', () => {
    const low = calculateEMC(20, 30);
    const high = calculateEMC(20, 80);
    expect(high).toBeGreaterThan(low);
  });

  it('returns 0 for 0% humidity', () => {
    expect(calculateEMC(20, 0)).toBe(0);
  });

  it.each([
    { desc: 'temp too low', args: [-30, 50] as const },
    { desc: 'temp too high', args: [101, 50] as const },
    { desc: 'humidity < 0', args: [20, -1] as const },
    { desc: 'humidity > 100', args: [20, 101] as const },
  ])('throws RangeError for $desc', ({ args }) => {
    expect(() => calculateEMC(...(args as Parameters<typeof calculateEMC>))).toThrow(RangeError);
  });
});
