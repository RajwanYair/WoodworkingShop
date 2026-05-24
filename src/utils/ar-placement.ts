/**
 * AR placement helpers — Sprint 24
 *
 * Pure TypeScript utilities for Augmented Reality cabinet placement.
 * Provides WebXR feature detection and coordinate transforms for overlaying
 * cabinet geometry into AR world-space.
 *
 * All functions are pure (no side effects, no React, no IDB).
 * `navigator.xr` is accessed through a thin accessor so tests can stub it.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** 3-component vector in metres. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Euler angles in radians (yaw, pitch, roll). */
export interface Euler {
  yaw: number;   // rotation around Y (up) axis
  pitch: number; // rotation around X axis
  roll: number;  // rotation around Z axis
}

/**
 * Axis-aligned bounding box of a cabinet in world space (metres).
 * Origin is bottom-left-front corner.
 */
export interface CabinetAABB {
  origin: Vec3;
  /** Width (X), height (Y), depth (Z) in metres. */
  size: Vec3;
}

/**
 * Pose of an AR anchor in world space.
 * Mirrors the subset of XRRigidTransform used in placement.
 */
export interface ARPose {
  position: Vec3;
  rotation: Euler;
}

/** Cabinet dimensions in mm (source-of-truth before unit conversion). */
export interface CabinetDimsMm {
  width: number;
  height: number;
  depth: number;
}

/** Result of a wall-snap operation. */
export interface WallSnapResult {
  /** Snapped pose with depth offset applied so cabinet flush-mounts the wall. */
  pose: ARPose;
  /** Distance from camera to snapped position (metres). */
  distanceM: number;
}

// ── Feature detection ─────────────────────────────────────────────────────────

/**
 * Internal accessor — allows tests to replace `navigator.xr`.
 * @internal
 */
export function _getXR(): XRSystem | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { xr?: XRSystem }).xr ?? null;
}

/**
 * Returns `true` when the browser exposes the WebXR Device API.
 * Does **not** guarantee immersive-ar support — call `isImmersiveARSupported()`
 * for that.
 */
export function isWebXRSupported(): boolean {
  return _getXR() !== null;
}

/**
 * Async check: resolves to `true` when the device can run `immersive-ar`
 * sessions.  Resolves to `false` if WebXR is absent or the mode is
 * unsupported.
 */
export async function isImmersiveARSupported(): Promise<boolean> {
  const xr = _getXR();
  if (!xr) return false;
  try {
    return await xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}

// ── Unit helpers ──────────────────────────────────────────────────────────────

/** Convert millimetres to metres. */
export function mmToMetres(mm: number): number {
  return mm / 1000;
}

/** Convert metres to millimetres. */
export function metresToMm(m: number): number {
  return m * 1000;
}

// ── Coordinate transforms ─────────────────────────────────────────────────────

/**
 * Build an axis-aligned bounding box for a cabinet positioned at `origin`
 * in world space (metres).
 *
 * Converts `dims` (mm) to metres internally.
 */
export function buildCabinetAABB(dims: CabinetDimsMm, origin: Vec3): CabinetAABB {
  return {
    origin,
    size: {
      x: mmToMetres(dims.width),
      y: mmToMetres(dims.height),
      z: mmToMetres(dims.depth),
    },
  };
}

/**
 * Return the world-space centre of a cabinet AABB.
 * Useful for placing AR labels or focus points.
 */
export function cabinetAABBCentre(aabb: CabinetAABB): Vec3 {
  return {
    x: aabb.origin.x + aabb.size.x / 2,
    y: aabb.origin.y + aabb.size.y / 2,
    z: aabb.origin.z + aabb.size.z / 2,
  };
}

/**
 * Apply a pose transform to a point in cabinet-local space to obtain its
 * world-space position.
 *
 * Cabinet local space: origin at bottom-left-front corner, +X right, +Y up, +Z toward viewer.
 * Only yaw rotation (around Y) is applied — pitch/roll are ignored for
 * floor-standing furniture placement.
 *
 * @param localPoint  Point in cabinet-local space (metres).
 * @param pose        Placement pose (world space).
 * @returns           World-space position of the point.
 */
export function localToWorld(localPoint: Vec3, pose: ARPose): Vec3 {
  const cos = Math.cos(pose.rotation.yaw);
  const sin = Math.sin(pose.rotation.yaw);
  return {
    x: pose.position.x + localPoint.x * cos - localPoint.z * sin,
    y: pose.position.y + localPoint.y,
    z: pose.position.z + localPoint.x * sin + localPoint.z * cos,
  };
}

/**
 * Inverse of `localToWorld` — transform a world-space point back into
 * cabinet-local space.
 */
export function worldToLocal(worldPoint: Vec3, pose: ARPose): Vec3 {
  const dx = worldPoint.x - pose.position.x;
  const dy = worldPoint.y - pose.position.y;
  const dz = worldPoint.z - pose.position.z;
  const cos = Math.cos(pose.rotation.yaw);
  const sin = Math.sin(pose.rotation.yaw);
  return {
    x: dx * cos + dz * sin,
    y: dy,
    z: -dx * sin + dz * cos,
  };
}

/**
 * Snap a cabinet to a vertical wall detected at `wallNormalYaw` (radians,
 * measured from +Z world forward).
 *
 * The cabinet is rotated so its back face aligns with the wall, then pushed
 * flush against it.
 *
 * @param hitPosition   AR hit-test point on the wall surface (metres).
 * @param wallNormalYaw Yaw angle of the wall's outward normal (radians).
 * @param dims          Cabinet dimensions in mm.
 * @returns             Snapped pose + camera distance.
 */
export function snapToWall(
  hitPosition: Vec3,
  wallNormalYaw: number,
  dims: CabinetDimsMm,
  cameraPosition: Vec3,
): WallSnapResult {
  const depthM = mmToMetres(dims.depth);
  // Offset the origin so the back face sits at hitPosition
  const cos = Math.cos(wallNormalYaw);
  const sin = Math.sin(wallNormalYaw);
  const pose: ARPose = {
    position: {
      x: hitPosition.x + cos * depthM,
      y: hitPosition.y,                   // floor height unchanged
      z: hitPosition.z + sin * depthM,
    },
    rotation: { yaw: wallNormalYaw + Math.PI, pitch: 0, roll: 0 },
  };

  const dx = pose.position.x - cameraPosition.x;
  const dz = pose.position.z - cameraPosition.z;
  const distanceM = Math.sqrt(dx * dx + dz * dz);

  return { pose, distanceM };
}

/**
 * Given a list of existing cabinet AABBs in the scene, compute a grid of
 * non-overlapping placement suggestions (in a row along the X axis) starting
 * at `startOrigin`.
 *
 * @param existingAABBs  Already-placed cabinets.
 * @param dims           Dimensions of the cabinet to place (mm).
 * @param startOrigin    First free position on the floor (metres).
 * @param gapM           Gap between cabinets in metres (default 0).
 * @returns              Suggested `ARPose` for the new cabinet.
 */
export function suggestNextPosition(
  existingAABBs: CabinetAABB[],
  dims: CabinetDimsMm,
  startOrigin: Vec3,
  gapM = 0,
): ARPose {
  let maxX = startOrigin.x;
  for (const aabb of existingAABBs) {
    const rightEdge = aabb.origin.x + aabb.size.x;
    if (rightEdge > maxX) maxX = rightEdge;
  }
  return {
    position: { x: maxX + gapM, y: startOrigin.y, z: startOrigin.z },
    rotation: { yaw: 0, pitch: 0, roll: 0 },
  };
}

/**
 * Check whether two cabinet AABBs overlap (i.e., would physically intersect).
 * A shared edge (touching) is **not** considered an overlap.
 */
export function aabbsOverlap(a: CabinetAABB, b: CabinetAABB): boolean {
  return (
    a.origin.x < b.origin.x + b.size.x &&
    a.origin.x + a.size.x > b.origin.x &&
    a.origin.y < b.origin.y + b.size.y &&
    a.origin.y + a.size.y > b.origin.y &&
    a.origin.z < b.origin.z + b.size.z &&
    a.origin.z + a.size.z > b.origin.z
  );
}

/**
 * Scale a pose uniformly — useful for switching from real-world scale to
 * table-top (miniature) AR preview mode.
 *
 * @param pose      Original pose.
 * @param scale     Scale factor (e.g. 0.1 for 1:10 miniature).
 * @returns         New pose with scaled position (rotation unchanged).
 */
export function scalePose(pose: ARPose, scale: number): ARPose {
  return {
    position: {
      x: pose.position.x * scale,
      y: pose.position.y * scale,
      z: pose.position.z * scale,
    },
    rotation: { ...pose.rotation },
  };
}
