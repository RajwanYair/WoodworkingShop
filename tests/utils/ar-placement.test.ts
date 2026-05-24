/**
 * AR placement helpers — Sprint 24 tests
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isWebXRSupported,
  isImmersiveARSupported,
  mmToMetres,
  metresToMm,
  buildCabinetAABB,
  cabinetAABBCentre,
  localToWorld,
  worldToLocal,
  snapToWall,
  suggestNextPosition,
  aabbsOverlap,
  scalePose,
} from '../../src/utils/ar-placement';

// ── helpers ───────────────────────────────────────────────────────────────────

const DIMS = { width: 1000, height: 2000, depth: 600 }; // mm

const zeroPose = () => ({
  position: { x: 0, y: 0, z: 0 },
  rotation: { yaw: 0, pitch: 0, roll: 0 },
});

// ── Feature detection ─────────────────────────────────────────────────────────

describe('isWebXRSupported', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when navigator.xr is absent', () => {
    vi.stubGlobal('navigator', {});
    expect(isWebXRSupported()).toBe(false);
  });

  it('returns true when navigator.xr is present', () => {
    vi.stubGlobal('navigator', { xr: {} });
    expect(isWebXRSupported()).toBe(true);
  });

  it('returns false when navigator is undefined', () => {
    vi.stubGlobal('navigator', undefined);
    expect(isWebXRSupported()).toBe(false);
  });
});

describe('isImmersiveARSupported', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when WebXR absent', async () => {
    vi.stubGlobal('navigator', {});
    expect(await isImmersiveARSupported()).toBe(false);
  });

  it('returns true when isSessionSupported resolves true', async () => {
    vi.stubGlobal('navigator', {
      xr: { isSessionSupported: vi.fn().mockResolvedValue(true) },
    });
    expect(await isImmersiveARSupported()).toBe(true);
  });

  it('returns false when isSessionSupported resolves false', async () => {
    vi.stubGlobal('navigator', {
      xr: { isSessionSupported: vi.fn().mockResolvedValue(false) },
    });
    expect(await isImmersiveARSupported()).toBe(false);
  });

  it('returns false when isSessionSupported throws', async () => {
    vi.stubGlobal('navigator', {
      xr: {
        isSessionSupported: vi.fn().mockRejectedValue(new Error('not supported')),
      },
    });
    expect(await isImmersiveARSupported()).toBe(false);
  });
});

// ── Unit helpers ──────────────────────────────────────────────────────────────

describe('mmToMetres / metresToMm', () => {
  it('converts 1000 mm to 1 m', () => {
    expect(mmToMetres(1000)).toBeCloseTo(1.0);
  });

  it('converts 1 m to 1000 mm', () => {
    expect(metresToMm(1)).toBeCloseTo(1000);
  });

  it('round-trips correctly', () => {
    expect(metresToMm(mmToMetres(500))).toBeCloseTo(500);
  });
});

// ── AABB ─────────────────────────────────────────────────────────────────────

describe('buildCabinetAABB', () => {
  it('converts dims from mm to metres', () => {
    const aabb = buildCabinetAABB(DIMS, { x: 0, y: 0, z: 0 });
    expect(aabb.size.x).toBeCloseTo(1.0);
    expect(aabb.size.y).toBeCloseTo(2.0);
    expect(aabb.size.z).toBeCloseTo(0.6);
  });

  it('places origin correctly', () => {
    const origin = { x: 1, y: 0, z: 2 };
    const aabb = buildCabinetAABB(DIMS, origin);
    expect(aabb.origin).toEqual(origin);
  });
});

describe('cabinetAABBCentre', () => {
  it('returns centre of AABB at origin', () => {
    const aabb = buildCabinetAABB(DIMS, { x: 0, y: 0, z: 0 });
    const centre = cabinetAABBCentre(aabb);
    expect(centre.x).toBeCloseTo(0.5);
    expect(centre.y).toBeCloseTo(1.0);
    expect(centre.z).toBeCloseTo(0.3);
  });

  it('handles offset origin', () => {
    const aabb = buildCabinetAABB(DIMS, { x: 2, y: 0, z: 1 });
    const centre = cabinetAABBCentre(aabb);
    expect(centre.x).toBeCloseTo(2.5);
    expect(centre.z).toBeCloseTo(1.3);
  });
});

// ── Coordinate transforms ─────────────────────────────────────────────────────

describe('localToWorld / worldToLocal round-trip', () => {
  it('identity pose leaves point unchanged', () => {
    const pt = { x: 0.5, y: 1.0, z: 0.3 };
    const world = localToWorld(pt, zeroPose());
    expect(world.x).toBeCloseTo(0.5);
    expect(world.y).toBeCloseTo(1.0);
    expect(world.z).toBeCloseTo(0.3);
  });

  it('90° yaw rotates X→Z', () => {
    const pt = { x: 1, y: 0, z: 0 };
    const pose = { position: { x: 0, y: 0, z: 0 }, rotation: { yaw: Math.PI / 2, pitch: 0, roll: 0 } };
    const world = localToWorld(pt, pose);
    expect(world.x).toBeCloseTo(0);
    expect(world.z).toBeCloseTo(1);
  });

  it('round-trips back to local origin', () => {
    const pt = { x: 1, y: 0.5, z: 0.3 };
    const pose = {
      position: { x: 2, y: 0, z: 3 },
      rotation: { yaw: 0.7, pitch: 0, roll: 0 },
    };
    const world = localToWorld(pt, pose);
    const back = worldToLocal(world, pose);
    expect(back.x).toBeCloseTo(pt.x);
    expect(back.y).toBeCloseTo(pt.y);
    expect(back.z).toBeCloseTo(pt.z);
  });
});

// ── snapToWall ────────────────────────────────────────────────────────────────

describe('snapToWall', () => {
  it('returns a pose with rotation offset by π from wall normal', () => {
    const result = snapToWall({ x: 0, y: 0, z: 0 }, 0, DIMS, { x: 3, y: 0, z: 3 });
    expect(result.pose.rotation.yaw).toBeCloseTo(Math.PI);
  });

  it('distanceM is non-negative', () => {
    const result = snapToWall({ x: 1, y: 0, z: 1 }, 0, DIMS, { x: 3, y: 0, z: 3 });
    expect(result.distanceM).toBeGreaterThanOrEqual(0);
  });
});

// ── suggestNextPosition ───────────────────────────────────────────────────────

describe('suggestNextPosition', () => {
  it('places at startOrigin when no existing AABBs', () => {
    const pose = suggestNextPosition([], DIMS, { x: 0, y: 0, z: 2 });
    expect(pose.position.x).toBeCloseTo(0);
    expect(pose.position.z).toBeCloseTo(2);
  });

  it('places after widest existing AABB', () => {
    const aabb = buildCabinetAABB(DIMS, { x: 0, y: 0, z: 0 });
    const pose = suggestNextPosition([aabb], DIMS, { x: 0, y: 0, z: 0 }, 0.02);
    // aabb right edge = 1.0 m, then gap 0.02 m → x ≈ 1.02
    expect(pose.position.x).toBeCloseTo(1.02);
  });
});

// ── aabbsOverlap ─────────────────────────────────────────────────────────────

describe('aabbsOverlap', () => {
  it('detects overlapping boxes', () => {
    const a = buildCabinetAABB(DIMS, { x: 0, y: 0, z: 0 });
    const b = buildCabinetAABB(DIMS, { x: 0.5, y: 0, z: 0 });
    expect(aabbsOverlap(a, b)).toBe(true);
  });

  it('no overlap for touching edges', () => {
    const a = buildCabinetAABB(DIMS, { x: 0, y: 0, z: 0 });
    const b = buildCabinetAABB(DIMS, { x: 1.0, y: 0, z: 0 });
    expect(aabbsOverlap(a, b)).toBe(false);
  });

  it('no overlap for separated boxes', () => {
    const a = buildCabinetAABB(DIMS, { x: 0, y: 0, z: 0 });
    const b = buildCabinetAABB(DIMS, { x: 5, y: 0, z: 0 });
    expect(aabbsOverlap(a, b)).toBe(false);
  });
});

// ── scalePose ─────────────────────────────────────────────────────────────────

describe('scalePose', () => {
  it('scales position by factor', () => {
    const pose = { position: { x: 2, y: 1, z: 3 }, rotation: { yaw: 0.5, pitch: 0, roll: 0 } };
    const scaled = scalePose(pose, 0.1);
    expect(scaled.position.x).toBeCloseTo(0.2);
    expect(scaled.position.y).toBeCloseTo(0.1);
    expect(scaled.position.z).toBeCloseTo(0.3);
  });

  it('preserves rotation', () => {
    const pose = { position: { x: 1, y: 1, z: 1 }, rotation: { yaw: 1.2, pitch: 0.1, roll: 0.2 } };
    const scaled = scalePose(pose, 0.5);
    expect(scaled.rotation.yaw).toBeCloseTo(1.2);
    expect(scaled.rotation.pitch).toBeCloseTo(0.1);
    expect(scaled.rotation.roll).toBeCloseTo(0.2);
  });

  it('scale=1 is identity', () => {
    const pose = { position: { x: 3, y: 2, z: 1 }, rotation: { yaw: 0, pitch: 0, roll: 0 } };
    const scaled = scalePose(pose, 1);
    expect(scaled.position.x).toBeCloseTo(3);
    expect(scaled.position.z).toBeCloseTo(1);
  });
});
