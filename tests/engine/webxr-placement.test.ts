import { describe, expect, it } from 'vitest';
import { computeArPlacements, snapToGrid, validatePlacement } from '../../src/engine/webxr-placement';
import type { CabinetFootprint, PlacementObstacle, RoomSurface } from '../../src/engine/webxr-placement';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeFloor(minX: number, maxX: number, minZ: number, maxZ: number): RoomSurface {
  return {
    id: 'floor-1',
    normal: 'floor',
    bounds: { minX, maxX, minZ, maxZ },
  };
}

const LARGE_FLOOR = makeFloor(0, 5, 0, 5); // 5 × 5 m room
const SMALL_FLOOR = makeFloor(0, 0.5, 0, 0.5); // tiny 0.5 m room
const FOOTPRINT_600: CabinetFootprint = { widthMm: 600, depthMm: 600 }; // 0.6 × 0.6 m
const FOOTPRINT_BIG: CabinetFootprint = { widthMm: 4000, depthMm: 4000 }; // 4 × 4 m

// ---------------------------------------------------------------------------
// computeArPlacements
// ---------------------------------------------------------------------------

describe('computeArPlacements', () => {
  it('returns candidates and a valid best position on a large floor', () => {
    const result = computeArPlacements(LARGE_FLOOR, FOOTPRINT_600);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.best).not.toBeNull();
    expect(result.best?.valid).toBe(true);
  });

  it('returns empty candidates when cabinet does not fit on a tiny surface', () => {
    const result = computeArPlacements(SMALL_FLOOR, FOOTPRINT_BIG);
    expect(result.candidates).toHaveLength(0);
    expect(result.best).toBeNull();
  });

  it('marks candidate invalid when it overlaps an obstacle', () => {
    const obstacle: PlacementObstacle = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };
    const result = computeArPlacements(LARGE_FLOOR, FOOTPRINT_600, [obstacle]);
    // At least some candidates should be invalid
    const invalidOnes = result.candidates.filter((c) => !c.valid);
    expect(invalidOnes.length).toBeGreaterThan(0);
    expect(invalidOnes[0].reason).toBe('Overlaps obstacle');
  });

  it('still finds a valid best position when obstacles leave room elsewhere', () => {
    // obstacle covers only near-origin area
    const obstacle: PlacementObstacle = { minX: 0, maxX: 1.5, minZ: 0, maxZ: 1.5 };
    const result = computeArPlacements(LARGE_FLOOR, FOOTPRINT_600, [obstacle]);
    expect(result.best).not.toBeNull();
    expect(result.best?.valid).toBe(true);
  });

  it.each([
    ['widthMm=0', { widthMm: 0, depthMm: 600 }],
    ['widthMm=-1', { widthMm: -1, depthMm: 600 }],
    ['depthMm=0', { widthMm: 600, depthMm: 0 }],
    ['depthMm=-10', { widthMm: 600, depthMm: -10 }],
  ])('throws RangeError for invalid footprint (%s)', (_, fp) => {
    expect(() => computeArPlacements(LARGE_FLOOR, fp)).toThrow(RangeError);
  });

  it('all returned candidates are within surface bounds', () => {
    const result = computeArPlacements(LARGE_FLOOR, FOOTPRINT_600);
    const w = FOOTPRINT_600.widthMm * 0.001;
    const d = FOOTPRINT_600.depthMm * 0.001;
    for (const c of result.candidates) {
      expect(c.x).toBeGreaterThanOrEqual(LARGE_FLOOR.bounds.minX);
      expect(c.x + w).toBeLessThanOrEqual(LARGE_FLOOR.bounds.maxX + 0.01);
      expect(c.z).toBeGreaterThanOrEqual(LARGE_FLOOR.bounds.minZ);
      expect(c.z + d).toBeLessThanOrEqual(LARGE_FLOOR.bounds.maxZ + 0.01);
    }
  });
});

// ---------------------------------------------------------------------------
// validatePlacement
// ---------------------------------------------------------------------------

describe('validatePlacement', () => {
  it('returns valid for a centred placement with no obstacles', () => {
    const result = validatePlacement(2, 2, LARGE_FLOOR, FOOTPRINT_600);
    expect(result.valid).toBe(true);
  });

  it('returns invalid when placement exceeds X bounds', () => {
    // x=4.9 + 0.6m width → 5.5 > 5.0
    const result = validatePlacement(4.9, 2, LARGE_FLOOR, FOOTPRINT_600);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('X bounds');
  });

  it('returns invalid when placement exceeds Z bounds', () => {
    const result = validatePlacement(2, 4.9, LARGE_FLOOR, FOOTPRINT_600);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Z bounds');
  });

  it('returns invalid when placement collides with an obstacle', () => {
    const obstacle: PlacementObstacle = { minX: 1.5, maxX: 2.8, minZ: 1.5, maxZ: 2.8 };
    const result = validatePlacement(2, 2, LARGE_FLOOR, FOOTPRINT_600, [obstacle]);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Overlaps obstacle');
  });

  it.each([
    ['widthMm=0', { widthMm: 0, depthMm: 600 }],
    ['depthMm=0', { widthMm: 600, depthMm: 0 }],
  ])('throws RangeError for invalid footprint (%s)', (_, fp) => {
    expect(() => validatePlacement(1, 1, LARGE_FLOOR, fp)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// snapToGrid
// ---------------------------------------------------------------------------

describe('snapToGrid', () => {
  it('snaps to nearest 0.1 m grid point', () => {
    const snapped = snapToGrid(0.34, 0.76, LARGE_FLOOR);
    expect(snapped.x).toBeCloseTo(0.3, 5);
    expect(snapped.z).toBeCloseTo(0.8, 5);
  });

  it('clamps to surface minX when raw X is below', () => {
    const snapped = snapToGrid(-1, 2, LARGE_FLOOR);
    expect(snapped.x).toBeCloseTo(0, 5);
  });

  it('clamps to surface maxX when raw X exceeds it', () => {
    const snapped = snapToGrid(99, 2, LARGE_FLOOR);
    expect(snapped.x).toBeCloseTo(LARGE_FLOOR.bounds.maxX, 5);
  });

  it('clamps to surface maxZ when raw Z exceeds it', () => {
    const snapped = snapToGrid(2, 99, LARGE_FLOOR);
    expect(snapped.z).toBeCloseTo(LARGE_FLOOR.bounds.maxZ, 5);
  });

  it('returns exact value for already-aligned input', () => {
    const snapped = snapToGrid(1.0, 2.0, LARGE_FLOOR);
    expect(snapped.x).toBeCloseTo(1.0, 5);
    expect(snapped.z).toBeCloseTo(2.0, 5);
  });
});
