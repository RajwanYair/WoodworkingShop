/**
 * Sprint 152 — Room Planner v2 engine.
 *
 * Full-room layout computation with wall segments, snap-to-wall placement,
 * and collision detection between cabinets.
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

import type { RoomCabinet, RoomLayout, RoomWall, WallSide } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default snap distance in mm — cabinets within this threshold snap to wall. */
export const SNAP_THRESHOLD_MM = 50;

/** Minimum room dimension (mm). */
export const MIN_ROOM_DIMENSION_MM = 500;

/** Maximum room dimension (mm). */
export const MAX_ROOM_DIMENSION_MM = 20000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SnapResult {
  /** Snapped x position. */
  x: number;
  /** Snapped y position. */
  y: number;
  /** Which wall the cabinet snapped to (null if no snap). */
  snappedWall: WallSide | null;
}

export interface CollisionResult {
  /** Whether cabinets overlap. */
  hasCollision: boolean;
  /** IDs of colliding cabinet pairs. */
  collisions: Array<{ a: string; b: string }>;
}

export interface WallPlacement {
  /** The wall to place against. */
  wall: RoomWall;
  /** Available linear mm along this wall for placement. */
  availableMm: number;
  /** Total linear mm already occupied by cabinets on this wall. */
  occupiedMm: number;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate room dimensions are within acceptable bounds.
 *
 * @param width  Room width in mm.
 * @param depth  Room depth in mm.
 * @param height Room height in mm.
 * @throws {RangeError} If any dimension is out of bounds.
 */
export function validateRoomDimensions(width: number, depth: number, height: number): void {
  if (width < MIN_ROOM_DIMENSION_MM || width > MAX_ROOM_DIMENSION_MM) {
    throw new RangeError(
      `validateRoomDimensions: width must be ${MIN_ROOM_DIMENSION_MM}–${MAX_ROOM_DIMENSION_MM} mm, got ${width}`,
    );
  }
  if (depth < MIN_ROOM_DIMENSION_MM || depth > MAX_ROOM_DIMENSION_MM) {
    throw new RangeError(
      `validateRoomDimensions: depth must be ${MIN_ROOM_DIMENSION_MM}–${MAX_ROOM_DIMENSION_MM} mm, got ${depth}`,
    );
  }
  if (height < MIN_ROOM_DIMENSION_MM || height > MAX_ROOM_DIMENSION_MM) {
    throw new RangeError(
      `validateRoomDimensions: height must be ${MIN_ROOM_DIMENSION_MM}–${MAX_ROOM_DIMENSION_MM} mm, got ${height}`,
    );
  }
}

// ─── Default walls ────────────────────────────────────────────────────────────

/**
 * Generate four default full-length walls for a room.
 *
 * @param roomWidth  Room width in mm.
 * @param roomDepth  Room depth in mm.
 * @returns Array of four wall segments covering the full perimeter.
 */
export function generateDefaultWalls(roomWidth: number, roomDepth: number): RoomWall[] {
  return [
    { id: 'wall-north', side: 'north', startOffset: 0, endOffset: roomWidth, hasOpening: false },
    { id: 'wall-south', side: 'south', startOffset: 0, endOffset: roomWidth, hasOpening: false },
    { id: 'wall-east', side: 'east', startOffset: 0, endOffset: roomDepth, hasOpening: false },
    { id: 'wall-west', side: 'west', startOffset: 0, endOffset: roomDepth, hasOpening: false },
  ];
}

// ─── Snap-to-wall ─────────────────────────────────────────────────────────────

/**
 * Snap a cabinet position to the nearest wall if within threshold.
 *
 * @param x         Proposed cabinet x position (mm).
 * @param y         Proposed cabinet y position (mm).
 * @param cabWidth  Cabinet width (mm).
 * @param cabDepth  Cabinet depth (mm).
 * @param layout    The room layout (provides dimensions and walls).
 * @param threshold Snap threshold in mm (default: {@link SNAP_THRESHOLD_MM}).
 * @returns The snapped position and which wall was snapped to.
 */
export function snapToWall(
  x: number,
  y: number,
  cabWidth: number,
  cabDepth: number,
  layout: RoomLayout,
  threshold: number = SNAP_THRESHOLD_MM,
): SnapResult {
  let snappedX = x;
  let snappedY = y;
  let snappedWall: WallSide | null = null;

  const walls = layout.walls?.length ? layout.walls : generateDefaultWalls(layout.roomWidth, layout.roomDepth);

  // Distance to each wall edge
  const distNorth = y;
  const distSouth = layout.roomDepth - (y + cabDepth);
  const distWest = x;
  const distEast = layout.roomWidth - (x + cabWidth);

  // Find the closest wall within threshold (prefer closest)
  let minDist = threshold + 1;

  for (const wall of walls) {
    if (wall.hasOpening) continue;

    let dist: number;
    switch (wall.side) {
      case 'north':
        dist = distNorth;
        if (dist >= 0 && dist < minDist) {
          minDist = dist;
          snappedY = 0;
          snappedX = x;
          snappedWall = 'north';
        }
        break;
      case 'south':
        dist = distSouth;
        if (dist >= 0 && dist < minDist) {
          minDist = dist;
          snappedY = layout.roomDepth - cabDepth;
          snappedX = x;
          snappedWall = 'south';
        }
        break;
      case 'west':
        dist = distWest;
        if (dist >= 0 && dist < minDist) {
          minDist = dist;
          snappedX = 0;
          snappedY = y;
          snappedWall = 'west';
        }
        break;
      case 'east':
        dist = distEast;
        if (dist >= 0 && dist < minDist) {
          minDist = dist;
          snappedX = layout.roomWidth - cabWidth;
          snappedY = y;
          snappedWall = 'east';
        }
        break;
    }
  }

  return { x: snappedX, y: snappedY, snappedWall };
}

// ─── Collision detection ──────────────────────────────────────────────────────

/**
 * Check for overlapping cabinet footprints within a layout.
 *
 * @param cabinets Array of placed cabinets to check.
 * @returns Collision result with pairs of overlapping cabinet IDs.
 */
export function detectCollisions(cabinets: RoomCabinet[]): CollisionResult {
  const collisions: Array<{ a: string; b: string }> = [];

  for (let i = 0; i < cabinets.length; i++) {
    for (let j = i + 1; j < cabinets.length; j++) {
      const a = cabinets[i];
      const b = cabinets[j];

      const aRight = a.x + a.width;
      const aBottom = a.y + a.depth;
      const bRight = b.x + b.width;
      const bBottom = b.y + b.depth;

      // AABB overlap test
      if (a.x < bRight && aRight > b.x && a.y < bBottom && aBottom > b.y) {
        collisions.push({ a: a.id, b: b.id });
      }
    }
  }

  return { hasCollision: collisions.length > 0, collisions };
}

// ─── Wall occupancy ───────────────────────────────────────────────────────────

/**
 * Compute available placement space along each wall.
 *
 * @param layout The room layout with cabinets and walls.
 * @returns Array of wall placement info (available vs occupied mm).
 */
export function computeWallOccupancy(layout: RoomLayout): WallPlacement[] {
  const walls = layout.walls?.length ? layout.walls : generateDefaultWalls(layout.roomWidth, layout.roomDepth);

  return walls.map((wall) => {
    const wallLength = wall.endOffset - wall.startOffset;
    let occupied = 0;

    for (const cab of layout.cabinets) {
      if (isCabinetOnWall(cab, wall, layout)) {
        // Width along the wall depends on orientation
        occupied += wall.side === 'north' || wall.side === 'south' ? cab.width : cab.depth;
      }
    }

    return { wall, availableMm: Math.max(0, wallLength - occupied), occupiedMm: occupied };
  });
}

/**
 * Determine if a cabinet is placed against a specific wall.
 *
 * @param cab    The cabinet to check.
 * @param wall   The wall segment.
 * @param layout The room layout (for room dimensions).
 * @returns True if the cabinet's edge touches the wall.
 */
export function isCabinetOnWall(cab: RoomCabinet, wall: RoomWall, layout: RoomLayout): boolean {
  switch (wall.side) {
    case 'north':
      return cab.y === 0;
    case 'south':
      return cab.y + cab.depth === layout.roomDepth;
    case 'west':
      return cab.x === 0;
    case 'east':
      return cab.x + cab.width === layout.roomWidth;
  }
}

// ─── Room area utilisation ────────────────────────────────────────────────────

/**
 * Compute floor area utilisation percentage.
 *
 * @param layout The room layout.
 * @returns Utilisation percentage (0–100).
 */
export function computeFloorUtilisation(layout: RoomLayout): number {
  const roomArea = layout.roomWidth * layout.roomDepth;
  if (roomArea <= 0) return 0;

  const cabinetArea = layout.cabinets.reduce((sum, c) => sum + c.width * c.depth, 0);
  return Math.min(100, (cabinetArea / roomArea) * 100);
}

/**
 * Clamp a cabinet position to stay within room bounds.
 *
 * @param x        Proposed x.
 * @param y        Proposed y.
 * @param cabWidth Cabinet width in mm.
 * @param cabDepth Cabinet depth in mm.
 * @param layout   The room layout.
 * @returns Clamped {x, y} coordinates.
 */
export function clampToRoom(
  x: number,
  y: number,
  cabWidth: number,
  cabDepth: number,
  layout: RoomLayout,
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(x, layout.roomWidth - cabWidth)),
    y: Math.max(0, Math.min(y, layout.roomDepth - cabDepth)),
  };
}
