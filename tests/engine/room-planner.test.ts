import { describe, it, expect } from 'vitest';
import {
  validateRoomDimensions,
  generateDefaultWalls,
  snapToWall,
  detectCollisions,
  computeWallOccupancy,
  isCabinetOnWall,
  computeFloorUtilisation,
  clampToRoom,
  SNAP_THRESHOLD_MM,
  MIN_ROOM_DIMENSION_MM,
  MAX_ROOM_DIMENSION_MM,
} from '../../src/engine/room-planner';
import type { RoomLayout, RoomCabinet } from '../../src/engine/types';

// ─── Test factory ─────────────────────────────────────────────────────────────

function makeLayout(overrides: Partial<RoomLayout> = {}): RoomLayout {
  return {
    id: 'test-room',
    name: 'Test Room',
    roomWidth: 4000,
    roomDepth: 3000,
    cabinets: [],
    ...overrides,
  };
}

function makeCab(overrides: Partial<RoomCabinet> = {}): RoomCabinet {
  return { id: 'cab-1', name: 'Base', x: 0, y: 0, width: 600, depth: 580, ...overrides };
}

// ─── validateRoomDimensions ───────────────────────────────────────────────────

describe('validateRoomDimensions', () => {
  it('accepts dimensions within bounds', () => {
    expect(() => validateRoomDimensions(3000, 4000, 2400)).not.toThrow();
  });

  it.each([
    ['width too small', 100, 3000, 2400],
    ['width too large', 25000, 3000, 2400],
    ['depth too small', 3000, 100, 2400],
    ['depth too large', 3000, 25000, 2400],
    ['height too small', 3000, 3000, 100],
    ['height too large', 3000, 3000, 25000],
  ] as const)('throws RangeError for %s', (_label, w, d, h) => {
    expect(() => validateRoomDimensions(w, d, h)).toThrow(RangeError);
  });

  it('accepts exact boundary values', () => {
    expect(() =>
      validateRoomDimensions(MIN_ROOM_DIMENSION_MM, MIN_ROOM_DIMENSION_MM, MIN_ROOM_DIMENSION_MM),
    ).not.toThrow();
    expect(() =>
      validateRoomDimensions(MAX_ROOM_DIMENSION_MM, MAX_ROOM_DIMENSION_MM, MAX_ROOM_DIMENSION_MM),
    ).not.toThrow();
  });
});

// ─── generateDefaultWalls ─────────────────────────────────────────────────────

describe('generateDefaultWalls', () => {
  it('generates 4 walls covering full perimeter', () => {
    const walls = generateDefaultWalls(4000, 3000);
    expect(walls).toHaveLength(4);
    expect(walls.map((w) => w.side).sort()).toEqual(['east', 'north', 'south', 'west']);
  });

  it('north/south walls span roomWidth', () => {
    const walls = generateDefaultWalls(5000, 3000);
    const north = walls.find((w) => w.side === 'north')!;
    const south = walls.find((w) => w.side === 'south')!;
    expect(north.endOffset - north.startOffset).toBe(5000);
    expect(south.endOffset - south.startOffset).toBe(5000);
  });

  it('east/west walls span roomDepth', () => {
    const walls = generateDefaultWalls(4000, 3500);
    const east = walls.find((w) => w.side === 'east')!;
    const west = walls.find((w) => w.side === 'west')!;
    expect(east.endOffset - east.startOffset).toBe(3500);
    expect(west.endOffset - west.startOffset).toBe(3500);
  });

  it('no walls have openings by default', () => {
    const walls = generateDefaultWalls(4000, 3000);
    expect(walls.every((w) => w.hasOpening === false)).toBe(true);
  });
});

// ─── snapToWall ───────────────────────────────────────────────────────────────

describe('snapToWall', () => {
  const layout = makeLayout();

  it('snaps to north wall when within threshold', () => {
    const result = snapToWall(500, 30, 600, 580, layout);
    expect(result.y).toBe(0);
    expect(result.snappedWall).toBe('north');
  });

  it('snaps to west wall when within threshold', () => {
    const result = snapToWall(20, 500, 600, 580, layout);
    expect(result.x).toBe(0);
    expect(result.snappedWall).toBe('west');
  });

  it('snaps to south wall when within threshold', () => {
    const result = snapToWall(500, 3000 - 580 - 30, 600, 580, layout);
    expect(result.y).toBe(3000 - 580);
    expect(result.snappedWall).toBe('south');
  });

  it('snaps to east wall when within threshold', () => {
    const result = snapToWall(4000 - 600 - 20, 500, 600, 580, layout);
    expect(result.x).toBe(4000 - 600);
    expect(result.snappedWall).toBe('east');
  });

  it('does not snap when far from any wall', () => {
    const result = snapToWall(1000, 1000, 600, 580, layout);
    expect(result.x).toBe(1000);
    expect(result.y).toBe(1000);
    expect(result.snappedWall).toBeNull();
  });

  it('respects custom threshold', () => {
    const result = snapToWall(500, 10, 600, 580, layout, 5);
    expect(result.snappedWall).toBeNull();
  });

  it('skips walls with openings', () => {
    const layoutWithOpening = makeLayout({
      walls: [
        { id: 'w1', side: 'north', startOffset: 0, endOffset: 4000, hasOpening: true },
        { id: 'w2', side: 'south', startOffset: 0, endOffset: 4000, hasOpening: false },
        { id: 'w3', side: 'east', startOffset: 0, endOffset: 3000, hasOpening: false },
        { id: 'w4', side: 'west', startOffset: 0, endOffset: 3000, hasOpening: false },
      ],
    });
    const result = snapToWall(500, 10, 600, 580, layoutWithOpening, SNAP_THRESHOLD_MM);
    // Should NOT snap to north since it has an opening
    expect(result.snappedWall).not.toBe('north');
  });
});

// ─── detectCollisions ─────────────────────────────────────────────────────────

describe('detectCollisions', () => {
  it('returns no collisions for non-overlapping cabinets', () => {
    const cabs = [
      makeCab({ id: 'a', x: 0, y: 0, width: 600, depth: 580 }),
      makeCab({ id: 'b', x: 700, y: 0, width: 600, depth: 580 }),
    ];
    const result = detectCollisions(cabs);
    expect(result.hasCollision).toBe(false);
    expect(result.collisions).toHaveLength(0);
  });

  it('detects overlapping cabinets', () => {
    const cabs = [
      makeCab({ id: 'a', x: 0, y: 0, width: 600, depth: 580 }),
      makeCab({ id: 'b', x: 300, y: 0, width: 600, depth: 580 }),
    ];
    const result = detectCollisions(cabs);
    expect(result.hasCollision).toBe(true);
    expect(result.collisions).toEqual([{ a: 'a', b: 'b' }]);
  });

  it('detects multiple collision pairs', () => {
    const cabs = [
      makeCab({ id: 'a', x: 0, y: 0, width: 600, depth: 580 }),
      makeCab({ id: 'b', x: 300, y: 0, width: 600, depth: 580 }),
      makeCab({ id: 'c', x: 500, y: 0, width: 600, depth: 580 }),
    ];
    const result = detectCollisions(cabs);
    expect(result.hasCollision).toBe(true);
    expect(result.collisions.length).toBeGreaterThanOrEqual(2);
  });

  it('handles empty array', () => {
    expect(detectCollisions([]).hasCollision).toBe(false);
  });

  it('adjacent cabinets (edge-touching) do not collide', () => {
    const cabs = [
      makeCab({ id: 'a', x: 0, y: 0, width: 600, depth: 580 }),
      makeCab({ id: 'b', x: 600, y: 0, width: 600, depth: 580 }),
    ];
    expect(detectCollisions(cabs).hasCollision).toBe(false);
  });
});

// ─── computeWallOccupancy ─────────────────────────────────────────────────────

describe('computeWallOccupancy', () => {
  it('all walls show full availability with no cabinets', () => {
    const layout = makeLayout();
    const result = computeWallOccupancy(layout);
    expect(result).toHaveLength(4);
    expect(result.every((w) => w.occupiedMm === 0)).toBe(true);
  });

  it('shows occupied width for cabinet on north wall', () => {
    const layout = makeLayout({
      cabinets: [makeCab({ id: 'c1', x: 100, y: 0, width: 600, depth: 580 })],
    });
    const result = computeWallOccupancy(layout);
    const north = result.find((w) => w.wall.side === 'north')!;
    expect(north.occupiedMm).toBe(600);
    expect(north.availableMm).toBe(4000 - 600);
  });

  it('aggregates multiple cabinets on same wall', () => {
    const layout = makeLayout({
      cabinets: [
        makeCab({ id: 'c1', x: 0, y: 0, width: 600, depth: 580 }),
        makeCab({ id: 'c2', x: 700, y: 0, width: 500, depth: 580 }),
      ],
    });
    const result = computeWallOccupancy(layout);
    const north = result.find((w) => w.wall.side === 'north')!;
    expect(north.occupiedMm).toBe(1100);
  });
});

// ─── isCabinetOnWall ──────────────────────────────────────────────────────────

describe('isCabinetOnWall', () => {
  const layout = makeLayout();
  const walls = [
    { id: 'n', side: 'north' as const, startOffset: 0, endOffset: 4000, hasOpening: false },
    { id: 's', side: 'south' as const, startOffset: 0, endOffset: 4000, hasOpening: false },
    { id: 'e', side: 'east' as const, startOffset: 0, endOffset: 3000, hasOpening: false },
    { id: 'w', side: 'west' as const, startOffset: 0, endOffset: 3000, hasOpening: false },
  ];

  it('cabinet at y=0 is on north wall', () => {
    expect(isCabinetOnWall(makeCab({ y: 0 }), walls[0], layout)).toBe(true);
  });

  it('cabinet at y+depth=roomDepth is on south wall', () => {
    expect(isCabinetOnWall(makeCab({ y: 3000 - 580, depth: 580 }), walls[1], layout)).toBe(true);
  });

  it('cabinet at x+width=roomWidth is on east wall', () => {
    expect(isCabinetOnWall(makeCab({ x: 4000 - 600, width: 600 }), walls[2], layout)).toBe(true);
  });

  it('cabinet at x=0 is on west wall', () => {
    expect(isCabinetOnWall(makeCab({ x: 0 }), walls[3], layout)).toBe(true);
  });

  it('cabinet in middle is not on any wall', () => {
    const cab = makeCab({ x: 1000, y: 1000 });
    expect(walls.every((w) => !isCabinetOnWall(cab, w, layout))).toBe(true);
  });
});

// ─── computeFloorUtilisation ──────────────────────────────────────────────────

describe('computeFloorUtilisation', () => {
  it('returns 0 for empty room', () => {
    expect(computeFloorUtilisation(makeLayout())).toBe(0);
  });

  it('computes correct percentage', () => {
    const layout = makeLayout({
      cabinets: [makeCab({ width: 2000, depth: 1500 })],
    });
    // 2000*1500 / (4000*3000) = 3000000/12000000 = 25%
    expect(computeFloorUtilisation(layout)).toBeCloseTo(25);
  });

  it('caps at 100% for overlapping cabinets', () => {
    const layout = makeLayout({
      roomWidth: 100,
      roomDepth: 100,
      cabinets: [makeCab({ width: 100, depth: 100 }), makeCab({ width: 100, depth: 100 })],
    });
    expect(computeFloorUtilisation(layout)).toBe(100);
  });
});

// ─── clampToRoom ──────────────────────────────────────────────────────────────

describe('clampToRoom', () => {
  const layout = makeLayout();

  it('returns position unchanged when inside room', () => {
    expect(clampToRoom(500, 500, 600, 580, layout)).toEqual({ x: 500, y: 500 });
  });

  it('clamps negative x to 0', () => {
    expect(clampToRoom(-100, 500, 600, 580, layout).x).toBe(0);
  });

  it('clamps x overflow to max', () => {
    expect(clampToRoom(4000, 500, 600, 580, layout).x).toBe(4000 - 600);
  });

  it('clamps negative y to 0', () => {
    expect(clampToRoom(500, -50, 600, 580, layout).y).toBe(0);
  });

  it('clamps y overflow to max', () => {
    expect(clampToRoom(500, 3000, 600, 580, layout).y).toBe(3000 - 580);
  });
});
