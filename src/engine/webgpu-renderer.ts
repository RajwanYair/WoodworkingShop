/**
 * WebGPU Renderer Scaffold — Sprint 112 (Phase 26)
 *
 * Pure-TypeScript scene-graph utilities for the WebGPU / WebGL2 cabinet
 * renderer. This module contains only data types and deterministic mesh-
 * building functions; all DOM / GPU interaction lives in the service layer
 * (`src/services/renderer-service.ts`).
 *
 * Architecture:
 *   Engine (this file) → pure data: scene graph, mesh geometry, bounds
 *   Service layer       → capability detection (navigator.gpu / WebGL2 canvas)
 *   Component layer     → canvas lifecycle, frame scheduling
 */

import type { Part } from './types.js';

// ---------------------------------------------------------------------------
// Renderer capability types
// ---------------------------------------------------------------------------

/** GPU rendering tier available in the current browser. */
export type RendererTier = 'webgpu' | 'webgl2' | 'none';

/** Opaque capabilities object produced by the service layer after probing. */
export interface RendererCapabilities {
  readonly tier: RendererTier;
  /** Maximum texture dimension in pixels (e.g. 2048, 4096, 8192). */
  readonly maxTextureSize: number;
  readonly supportsHDR: boolean;
  readonly supportsAR: boolean;
}

/** Fallback capabilities used when the service layer cannot probe the GPU. */
export const FALLBACK_CAPABILITIES: RendererCapabilities = {
  tier: 'none',
  maxTextureSize: 2048,
  supportsHDR: false,
  supportsAR: false,
} as const;

// ---------------------------------------------------------------------------
// 3-D geometry types
// ---------------------------------------------------------------------------

/** Immutable 3-D vector (millimetre space). */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Axis-aligned bounding box. */
export interface Bounds3 {
  readonly min: Vec3;
  readonly max: Vec3;
}

/**
 * Indexed triangle mesh ready for GPU upload.
 * Vertex data is interleaved: [x, y, z,  nx, ny, nz,  u, v] per vertex
 * (stride = 8 floats = 32 bytes).
 */
export interface CabinetMesh {
  readonly id: string;
  /** Interleaved float32 buffer — layout: pos(3) + normal(3) + uv(2). */
  readonly vertexData: Float32Array;
  readonly indices: Uint32Array;
  readonly materialId: string;
  /** World-space position of this mesh before any explode offset. */
  readonly origin: Vec3;
}

/** Directional light for the scene. */
export interface SceneLight {
  readonly direction: Vec3;
  /** 0–1 normalised intensity. */
  readonly intensity: number;
  /** RGB 0–1 colour. */
  readonly color: Vec3;
}

/** Complete scene description — passed to the renderer each frame. */
export interface CabinetScene {
  readonly meshes: readonly CabinetMesh[];
  readonly light: SceneLight;
  readonly cameraPosition: Vec3;
  readonly cameraTarget: Vec3;
}

/** Per-frame render settings. */
export interface RenderOptions {
  /** 0 = assembled, 1 = fully exploded. */
  readonly explodeFactor: number;
  readonly showEdgeBanding: boolean;
  readonly wireframe: boolean;
}

// ---------------------------------------------------------------------------
// Default scene parameters
// ---------------------------------------------------------------------------

export const DEFAULT_LIGHT: SceneLight = {
  direction: { x: -0.5, y: -1.0, z: -0.75 },
  intensity: 0.9,
  color: { x: 1.0, y: 0.97, z: 0.9 },
} as const;

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  explodeFactor: 0,
  showEdgeBanding: true,
  wireframe: false,
} as const;

// ---------------------------------------------------------------------------
// Mesh construction helpers
// ---------------------------------------------------------------------------

/** Number of floats per interleaved vertex: pos(3) + normal(3) + uv(2). */
const VERTEX_STRIDE = 8;

/**
 * Build an axis-aligned box mesh centred at the origin.
 *
 * @param id       - Unique mesh identifier (matches `Part.id`).
 * @param materialId - Material key for PBR lookup.
 * @param w        - Width in mm (X axis).
 * @param h        - Height in mm (Y axis).
 * @param d        - Depth in mm (Z axis).
 * @returns A `CabinetMesh` with 24 vertices (4 per face × 6 faces) and 36 indices.
 * @throws RangeError if any dimension is ≤ 0.
 */
export function buildBoxMesh(id: string, materialId: string, w: number, h: number, d: number): CabinetMesh {
  if (w <= 0) throw new RangeError(`buildBoxMesh: w must be > 0, got ${w}`);
  if (h <= 0) throw new RangeError(`buildBoxMesh: h must be > 0, got ${h}`);
  if (d <= 0) throw new RangeError(`buildBoxMesh: d must be > 0, got ${d}`);

  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;

  // 6 faces × 4 vertices × 8 floats (pos + normal + uv)
  // prettier-ignore
  const vertexData = new Float32Array([
    // +Y face (top)
    -hw,  hh, -hd,  0, 1, 0,  0, 0,
     hw,  hh, -hd,  0, 1, 0,  1, 0,
     hw,  hh,  hd,  0, 1, 0,  1, 1,
    -hw,  hh,  hd,  0, 1, 0,  0, 1,
    // -Y face (bottom)
    -hw, -hh,  hd,  0, -1, 0,  0, 0,
     hw, -hh,  hd,  0, -1, 0,  1, 0,
     hw, -hh, -hd,  0, -1, 0,  1, 1,
    -hw, -hh, -hd,  0, -1, 0,  0, 1,
    // +X face (right)
     hw, -hh, -hd,  1, 0, 0,  0, 0,
     hw, -hh,  hd,  1, 0, 0,  1, 0,
     hw,  hh,  hd,  1, 0, 0,  1, 1,
     hw,  hh, -hd,  1, 0, 0,  0, 1,
    // -X face (left)
    -hw, -hh,  hd, -1, 0, 0,  0, 0,
    -hw, -hh, -hd, -1, 0, 0,  1, 0,
    -hw,  hh, -hd, -1, 0, 0,  1, 1,
    -hw,  hh,  hd, -1, 0, 0,  0, 1,
    // +Z face (front)
    -hw, -hh,  hd,  0, 0, 1,  0, 0,
     hw, -hh,  hd,  0, 0, 1,  1, 0,
     hw,  hh,  hd,  0, 0, 1,  1, 1,
    -hw,  hh,  hd,  0, 0, 1,  0, 1,
    // -Z face (back)
     hw, -hh, -hd,  0, 0, -1,  0, 0,
    -hw, -hh, -hd,  0, 0, -1,  1, 0,
    -hw,  hh, -hd,  0, 0, -1,  1, 1,
     hw,  hh, -hd,  0, 0, -1,  0, 1,
  ]);

  // 6 faces × 2 triangles × 3 indices
  const indices = new Uint32Array(36);
  for (let face = 0; face < 6; face++) {
    const base = face * 4;
    const out = face * 6;
    indices[out + 0] = base + 0;
    indices[out + 1] = base + 1;
    indices[out + 2] = base + 2;
    indices[out + 3] = base + 0;
    indices[out + 4] = base + 2;
    indices[out + 5] = base + 3;
  }

  return { id, vertexData, indices, materialId, origin: { x: 0, y: 0, z: 0 } };
}

// ---------------------------------------------------------------------------
// Scene graph builder
// ---------------------------------------------------------------------------

/** Default directional light direction (normalised). */
const PARTS_PER_ROW = 4;
/** Horizontal gap between exploded parts (mm). */
const EXPLODE_GAP = 50;

/**
 * Build a `CabinetScene` from an array of cut `Part` objects.
 *
 * Parts are laid out in a grid along the XZ plane centred at the origin.
 * Each part becomes a flat slab (height = `thickness`).
 *
 * @param parts  - Cut-optimised part list from `generateParts()`.
 * @param light  - Directional light; defaults to `DEFAULT_LIGHT`.
 * @param camera - Camera position and target; auto-computed if omitted.
 * @returns A fully described `CabinetScene`.
 */
export function buildCabinetScene(
  parts: readonly Part[],
  light: SceneLight = DEFAULT_LIGHT,
  camera?: { position: Vec3; target: Vec3 },
): CabinetScene {
  const meshes: CabinetMesh[] = parts.map((p, i) => {
    const col = i % PARTS_PER_ROW;
    const row = Math.floor(i / PARTS_PER_ROW);
    const ox = col * (p.width + EXPLODE_GAP) - ((PARTS_PER_ROW - 1) * (p.width + EXPLODE_GAP)) / 2;
    const oz = row * (p.length + EXPLODE_GAP);
    const mesh = buildBoxMesh(p.id, p.material, p.width, p.thickness, p.length);
    return { ...mesh, origin: { x: ox, y: p.thickness / 2, z: oz } };
  });

  const bounds = getSceneBounds({
    meshes,
    light,
    cameraPosition: { x: 0, y: 0, z: 0 },
    cameraTarget: { x: 0, y: 0, z: 0 },
  });
  const cx = (bounds.min.x + bounds.max.x) / 2;
  const cy = (bounds.min.y + bounds.max.y) / 2;
  const cz = (bounds.min.z + bounds.max.z) / 2;
  const span = Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z, 100);
  const defaultCamera = {
    position: { x: cx, y: cy + span * 0.8, z: cz + span * 1.2 },
    target: { x: cx, y: cy, z: cz },
  };

  return {
    meshes,
    light,
    cameraPosition: camera?.position ?? defaultCamera.position,
    cameraTarget: camera?.target ?? defaultCamera.target,
  };
}

// ---------------------------------------------------------------------------
// Geometry utilities
// ---------------------------------------------------------------------------

/**
 * Compute the axis-aligned bounding box of a single mesh.
 *
 * @param mesh - The mesh to measure.
 * @returns `{ min, max }` in mesh-local space (origin not applied).
 */
export function getMeshBounds(mesh: CabinetMesh): Bounds3 {
  const v = mesh.vertexData;
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  for (let i = 0; i < v.length; i += VERTEX_STRIDE) {
    const x = v[i]!;
    const y = v[i + 1]!;
    const z = v[i + 2]!;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

/**
 * Compute the axis-aligned bounding box of all meshes in a scene
 * using world-space positions (mesh bounds offset by `mesh.origin`).
 *
 * @param scene - The scene to measure.
 * @returns `{ min, max }` in world space.
 */
export function getSceneBounds(scene: CabinetScene): Bounds3 {
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  for (const mesh of scene.meshes) {
    const local = getMeshBounds(mesh);
    const wx0 = local.min.x + mesh.origin.x;
    const wy0 = local.min.y + mesh.origin.y;
    const wz0 = local.min.z + mesh.origin.z;
    const wx1 = local.max.x + mesh.origin.x;
    const wy1 = local.max.y + mesh.origin.y;
    const wz1 = local.max.z + mesh.origin.z;
    if (wx0 < minX) minX = wx0;
    if (wy0 < minY) minY = wy0;
    if (wz0 < minZ) minZ = wz0;
    if (wx1 > maxX) maxX = wx1;
    if (wy1 > maxY) maxY = wy1;
    if (wz1 > maxZ) maxZ = wz1;
  }

  // Empty scene fallback
  if (!isFinite(minX)) return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

/**
 * Return a new scene with all mesh origins shifted so the scene centroid
 * sits at the world origin (0, 0, 0).
 *
 * @param scene - Source scene.
 * @returns New `CabinetScene` with re-centred origins.
 */
export function centerScene(scene: CabinetScene): CabinetScene {
  const bounds = getSceneBounds(scene);
  const cx = (bounds.min.x + bounds.max.x) / 2;
  const cy = (bounds.min.y + bounds.max.y) / 2;
  const cz = (bounds.min.z + bounds.max.z) / 2;
  return {
    ...scene,
    meshes: scene.meshes.map((m) => ({
      ...m,
      origin: { x: m.origin.x - cx, y: m.origin.y - cy, z: m.origin.z - cz },
    })),
  };
}

/**
 * Apply an explode factor to a scene, offsetting each mesh outward from
 * the scene centroid along the XZ plane.
 *
 * @param scene  - Source scene (must already be centred for best results).
 * @param factor - Explode scale: 0 = assembled, 1 = 200 mm separation.
 * @returns New `CabinetScene` with exploded origins.
 * @throws RangeError if `factor` is outside [0, 1].
 */
export function applyExplodeFactor(scene: CabinetScene, factor: number): CabinetScene {
  if (factor < 0 || factor > 1) throw new RangeError(`applyExplodeFactor: factor must be in [0, 1], got ${factor}`);
  if (factor === 0) return scene;

  const MAX_OFFSET = 200; // mm
  const meshCount = scene.meshes.length;
  if (meshCount === 0) return scene;

  return {
    ...scene,
    meshes: scene.meshes.map((m, i) => {
      // Distribute parts in a circle around the Y axis
      const angle = (2 * Math.PI * i) / meshCount;
      const radius = factor * MAX_OFFSET;
      return {
        ...m,
        origin: {
          x: m.origin.x + Math.cos(angle) * radius,
          y: m.origin.y,
          z: m.origin.z + Math.sin(angle) * radius,
        },
      };
    }),
  };
}
