import { describe, expect, it } from 'vitest';

import {
  allEdgesExposed,
  calculateEdgeBanding,
  detectExposedEdges,
  frontEdgesOnly,
} from '../../src/engine/edge-banding-calc';

import type { BandingPart, BandingSpec } from '../../src/engine/edge-banding-calc';

const specs: BandingSpec[] = [
  { id: 'oak-22', name: 'Oak 22mm', color: '#C4A35A', widthMm: 22, thicknessMm: 0.5, costPerMetre: 1.2 },
  { id: 'white-pvc', name: 'White PVC', color: '#FFFFFF', widthMm: 19, thicknessMm: 1, costPerMetre: 0.8 },
];

describe('calculateEdgeBanding', () => {
  it('returns empty result for empty parts', () => {
    const result = calculateEdgeBanding([], specs);
    expect(result.lines).toHaveLength(0);
    expect(result.groups).toHaveLength(0);
    expect(result.totalLengthMm).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it('calculates banding for a single part with all edges exposed', () => {
    const parts: BandingPart[] = [
      {
        partId: 'p1',
        label: 'Shelf',
        width: 600,
        height: 400,
        exposure: allEdgesExposed(),
        bandingId: 'oak-22',
      },
    ];

    const result = calculateEdgeBanding(parts, specs, 10);

    expect(result.lines).toHaveLength(4);
    // top + bottom = 600 + 600, left + right = 400 + 400 = 2000mm total
    expect(result.totalLengthMm).toBe(2000);
    expect(result.totalLengthWithWasteMm).toBe(2200);
    expect(result.wastagePercent).toBe(10);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].bandingId).toBe('oak-22');
    expect(result.groups[0].edgeCount).toBe(4);
  });

  it('calculates banding for front edges only', () => {
    const parts: BandingPart[] = [
      {
        partId: 'p1',
        label: 'Side Panel',
        width: 500,
        height: 700,
        exposure: frontEdgesOnly(),
        bandingId: 'white-pvc',
      },
    ];

    const result = calculateEdgeBanding(parts, specs, 0);

    expect(result.lines).toHaveLength(2);
    // top + bottom = 500 + 500 = 1000mm
    expect(result.totalLengthMm).toBe(1000);
    expect(result.totalLengthWithWasteMm).toBe(1000);
    expect(result.totalCost).toBe(0.8); // 1m * 0.8
  });

  it('groups by banding type across multiple parts', () => {
    const parts: BandingPart[] = [
      {
        partId: 'p1',
        label: 'Top',
        width: 800,
        height: 300,
        exposure: { top: true, bottom: false, left: true, right: true },
        bandingId: 'oak-22',
      },
      {
        partId: 'p2',
        label: 'Bottom',
        width: 800,
        height: 300,
        exposure: { top: false, bottom: true, left: true, right: true },
        bandingId: 'oak-22',
      },
      {
        partId: 'p3',
        label: 'Back',
        width: 800,
        height: 600,
        exposure: { top: false, bottom: false, left: false, right: false },
        bandingId: 'white-pvc',
      },
    ];

    const result = calculateEdgeBanding(parts, specs, 15);

    // oak-22: p1 top(800) + left(300) + right(300) + p2 bottom(800) + left(300) + right(300) = 2800
    // white-pvc: p3 has no exposed edges = 0
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].bandingId).toBe('oak-22');
    expect(result.groups[0].totalLengthMm).toBe(2800);
    expect(result.groups[0].edgeCount).toBe(6);
    expect(result.totalLengthMm).toBe(2800);
  });

  it('correctly computes cost with wastage', () => {
    const parts: BandingPart[] = [
      {
        partId: 'p1',
        label: 'Door',
        width: 1000,
        height: 500,
        exposure: allEdgesExposed(),
        bandingId: 'oak-22',
      },
    ];

    const result = calculateEdgeBanding(parts, specs, 20);

    // 1000+1000+500+500 = 3000mm = 3m
    expect(result.totalLengthMm).toBe(3000);
    expect(result.totalCost).toBe(3.6); // 3m * 1.2
    expect(result.totalLengthWithWasteMm).toBe(3600); // 3000 * 1.2
    expect(result.totalCostWithWaste).toBe(4.32); // 3.6m * 1.2
  });

  it.each([
    { wastage: -1, desc: 'negative wastage' },
    { wastage: -100, desc: 'very negative wastage' },
  ])('throws RangeError for $desc', ({ wastage }) => {
    expect(() => calculateEdgeBanding([], specs, wastage)).toThrow(RangeError);
  });

  it('throws RangeError for unknown bandingId', () => {
    const parts: BandingPart[] = [
      {
        partId: 'p1',
        label: 'Test',
        width: 100,
        height: 100,
        exposure: allEdgesExposed(),
        bandingId: 'unknown-id',
      },
    ];

    expect(() => calculateEdgeBanding(parts, specs)).toThrow(RangeError);
    expect(() => calculateEdgeBanding(parts, specs)).toThrow('unknown bandingId');
  });

  it('sorts groups by total length descending', () => {
    const parts: BandingPart[] = [
      {
        partId: 'p1',
        label: 'Small',
        width: 100,
        height: 100,
        exposure: allEdgesExposed(),
        bandingId: 'white-pvc',
      },
      {
        partId: 'p2',
        label: 'Large',
        width: 2000,
        height: 1000,
        exposure: allEdgesExposed(),
        bandingId: 'oak-22',
      },
    ];

    const result = calculateEdgeBanding(parts, specs, 0);

    expect(result.groups[0].bandingId).toBe('oak-22');
    expect(result.groups[1].bandingId).toBe('white-pvc');
  });

  it('handles zero wastage correctly', () => {
    const parts: BandingPart[] = [
      {
        partId: 'p1',
        label: 'Panel',
        width: 500,
        height: 300,
        exposure: allEdgesExposed(),
        bandingId: 'oak-22',
      },
    ];

    const result = calculateEdgeBanding(parts, specs, 0);

    expect(result.totalLengthMm).toBe(result.totalLengthWithWasteMm);
    expect(result.totalCost).toBe(result.totalCostWithWaste);
    expect(result.wastagePercent).toBe(0);
  });
});

describe('detectExposedEdges', () => {
  it('returns correct exposure object', () => {
    expect(detectExposedEdges(true, false, true, false)).toEqual({
      top: true,
      bottom: false,
      left: true,
      right: false,
    });
  });

  it('all false returns no exposure', () => {
    expect(detectExposedEdges(false, false, false, false)).toEqual({
      top: false,
      bottom: false,
      left: false,
      right: false,
    });
  });
});

describe('allEdgesExposed', () => {
  it('returns all true', () => {
    expect(allEdgesExposed()).toEqual({ top: true, bottom: true, left: true, right: true });
  });
});

describe('frontEdgesOnly', () => {
  it('returns only top/bottom exposed', () => {
    expect(frontEdgesOnly()).toEqual({ top: true, bottom: true, left: false, right: false });
  });
});
