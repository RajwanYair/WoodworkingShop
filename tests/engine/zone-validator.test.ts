import { describe, it, expect } from 'vitest';
import { validateCabinetInZone, validateCabinetRowInZone, violationCodes } from '../../src/engine/zone-validator';
import type { RoomZone, CabinetDimensions } from '../../src/engine/zone-validator';

const zone: RoomZone = {
  id: 'z1',
  label: 'Kitchen wall A',
  widthMm: 2400,
  heightMm: 2200,
  depthMm: 600,
};

function cab(id: string, w: number, h: number, d: number): CabinetDimensions {
  return { id, widthMm: w, heightMm: h, depthMm: d };
}

describe('validateCabinetInZone — single cabinet', () => {
  it('passes a cabinet that fits exactly', () => {
    const result = validateCabinetInZone(cab('A', 600, 720, 580), zone);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails when cabinet is too wide', () => {
    const result = validateCabinetInZone(cab('A', 2500, 720, 580), zone);
    expect(result.valid).toBe(false);
    expect(violationCodes(result)).toContain('TOO_WIDE');
  });

  it('fails when cabinet is too tall', () => {
    const result = validateCabinetInZone(cab('A', 600, 2300, 580), zone);
    expect(result.valid).toBe(false);
    expect(violationCodes(result)).toContain('TOO_TALL');
  });

  it('fails when cabinet is too deep', () => {
    const result = validateCabinetInZone(cab('A', 600, 720, 650), zone);
    expect(result.valid).toBe(false);
    expect(violationCodes(result)).toContain('TOO_DEEP');
  });

  it('reports correct excess mm', () => {
    const result = validateCabinetInZone(cab('A', 2500, 720, 580), zone);
    const v = result.violations.find((x) => x.code === 'TOO_WIDE');
    expect(v?.excessMm).toBe(100);
  });

  it('respects clearance parameter', () => {
    // Cabinet width 600, zone width 2400, clearance 50 → limit 2350
    const result = validateCabinetInZone(cab('A', 2400, 720, 580), zone, 50);
    expect(violationCodes(result)).toContain('TOO_WIDE');
  });
});

describe('validateCabinetRowInZone', () => {
  it('passes a row that fits', () => {
    const result = validateCabinetRowInZone([cab('A', 600, 720, 580), cab('B', 600, 720, 580)], zone);
    expect(result.valid).toBe(true);
  });

  it('fails when total row width overflows', () => {
    const result = validateCabinetRowInZone(
      [cab('A', 1200, 720, 580), cab('B', 1200, 720, 580), cab('C', 100, 720, 580)],
      zone,
    );
    expect(violationCodes(result)).toContain('TOTAL_WIDTH_OVERFLOW');
  });

  it('accumulates individual violations from multiple cabinets', () => {
    const result = validateCabinetRowInZone([cab('A', 2500, 720, 580), cab('B', 600, 2300, 580)], zone);
    expect(violationCodes(result)).toContain('TOO_WIDE');
    expect(violationCodes(result)).toContain('TOO_TALL');
  });

  it('returns valid true for empty row', () => {
    const result = validateCabinetRowInZone([], zone);
    expect(result.valid).toBe(true);
  });
});

describe('violationCodes helper', () => {
  it('returns deduplicated codes', () => {
    const result = validateCabinetRowInZone([cab('A', 2500, 720, 580), cab('B', 2500, 720, 580)], zone);
    const codes = violationCodes(result);
    expect(codes.filter((c) => c === 'TOO_WIDE')).toHaveLength(1);
  });
});
