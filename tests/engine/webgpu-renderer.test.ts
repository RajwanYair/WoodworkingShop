import { describe, expect, it } from 'vitest';

import type { Part } from '../../src/engine/types';
import {
  applyExplodeFactor,
  buildBoxMesh,
  buildCabinetScene,
  centerScene,
  DEFAULT_LIGHT,
  DEFAULT_RENDER_OPTIONS,
  FALLBACK_CAPABILITIES,
  getMeshBounds,
  getSceneBounds,
} from '../../src/engine/webgpu-renderer';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockPart = (id: string, w: number, _h: number, d: number, thickness = 18): Part => ({
  id,
  name: { en: `Part ${id}`, he: `חלק ${id}` },
  qty: 1,
  material: 'plywood',
  thickness,
  length: d,
  width: w,
  edgeBanding: { en: 'none', he: 'ללא' },
});

// ---------------------------------------------------------------------------
// FALLBACK_CAPABILITIES
// ---------------------------------------------------------------------------

describe('FALLBACK_CAPABILITIES', () => {
  it('has tier=none and conservative defaults', () => {
    expect(FALLBACK_CAPABILITIES.tier).toBe('none');
    expect(FALLBACK_CAPABILITIES.maxTextureSize).toBeGreaterThanOrEqual(2048);
    expect(FALLBACK_CAPABILITIES.supportsHDR).toBe(false);
    expect(FALLBACK_CAPABILITIES.supportsAR).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_LIGHT / DEFAULT_RENDER_OPTIONS
// ---------------------------------------------------------------------------

describe('DEFAULT_LIGHT', () => {
  it('has normalised-ish direction and valid intensity', () => {
    const { direction, intensity, color } = DEFAULT_LIGHT;
    expect(intensity).toBeGreaterThan(0);
    expect(intensity).toBeLessThanOrEqual(1);
    // direction should be non-zero
    const mag = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    expect(mag).toBeGreaterThan(0);
    // color channels 0–1
    expect(color.x).toBeGreaterThanOrEqual(0);
    expect(color.y).toBeGreaterThanOrEqual(0);
    expect(color.z).toBeGreaterThanOrEqual(0);
  });
});

describe('DEFAULT_RENDER_OPTIONS', () => {
  it('has zero explode factor and edge banding enabled', () => {
    expect(DEFAULT_RENDER_OPTIONS.explodeFactor).toBe(0);
    expect(DEFAULT_RENDER_OPTIONS.showEdgeBanding).toBe(true);
    expect(DEFAULT_RENDER_OPTIONS.wireframe).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildBoxMesh
// ---------------------------------------------------------------------------

describe('buildBoxMesh', () => {
  it('creates a mesh with 24 vertices and 36 indices', () => {
    const mesh = buildBoxMesh('b1', 'plywood', 600, 18, 400);
    const VERTEX_STRIDE = 8;
    expect(mesh.vertexData.length).toBe(24 * VERTEX_STRIDE);
    expect(mesh.indices.length).toBe(36);
    expect(mesh.id).toBe('b1');
    expect(mesh.materialId).toBe('plywood');
  });

  it('produces correct extents for known dimensions', () => {
    const mesh = buildBoxMesh('b2', 'mdf', 100, 200, 50);
    const bounds = getMeshBounds(mesh);
    expect(bounds.min.x).toBeCloseTo(-50);
    expect(bounds.max.x).toBeCloseTo(50);
    expect(bounds.min.y).toBeCloseTo(-100);
    expect(bounds.max.y).toBeCloseTo(100);
    expect(bounds.min.z).toBeCloseTo(-25);
    expect(bounds.max.z).toBeCloseTo(25);
  });

  it.each([
    ['w = 0', 0, 18, 400],
    ['h = 0', 600, 0, 400],
    ['d = 0', 600, 18, 0],
    ['w < 0', -1, 18, 400],
    ['h < 0', 600, -5, 400],
    ['d < 0', 600, 18, -10],
  ])('throws RangeError when %s', (_label, w, h, d) => {
    expect(() => buildBoxMesh('x', 'mat', w, h, d)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// getMeshBounds
// ---------------------------------------------------------------------------

describe('getMeshBounds', () => {
  it('min < max on all axes for non-degenerate mesh', () => {
    const mesh = buildBoxMesh('m1', 'oak', 300, 25, 200);
    const { min, max } = getMeshBounds(mesh);
    expect(min.x).toBeLessThan(max.x);
    expect(min.y).toBeLessThan(max.y);
    expect(min.z).toBeLessThan(max.z);
  });

  it('centred mesh has symmetric bounds', () => {
    const mesh = buildBoxMesh('m2', 'oak', 400, 20, 600);
    const { min, max } = getMeshBounds(mesh);
    expect(min.x).toBeCloseTo(-max.x);
    expect(min.y).toBeCloseTo(-max.y);
    expect(min.z).toBeCloseTo(-max.z);
  });
});

// ---------------------------------------------------------------------------
// buildCabinetScene
// ---------------------------------------------------------------------------

describe('buildCabinetScene', () => {
  it('returns a scene with one mesh per part', () => {
    const parts = [mockPart('p1', 600, 400, 18), mockPart('p2', 300, 700, 18)];
    const scene = buildCabinetScene(parts);
    expect(scene.meshes).toHaveLength(2);
  });

  it('returns empty scene for empty parts array', () => {
    const scene = buildCabinetScene([]);
    expect(scene.meshes).toHaveLength(0);
  });

  it('uses supplied light and camera overrides', () => {
    const customLight = { direction: { x: 0, y: -1, z: 0 }, intensity: 0.5, color: { x: 1, y: 1, z: 1 } };
    const customCamera = {
      position: { x: 100, y: 200, z: 300 },
      target: { x: 0, y: 0, z: 0 },
    };
    const parts = [mockPart('p3', 200, 300, 18)];
    const scene = buildCabinetScene(parts, customLight, customCamera);
    expect(scene.light).toEqual(customLight);
    expect(scene.cameraPosition).toEqual(customCamera.position);
    expect(scene.cameraTarget).toEqual(customCamera.target);
  });

  it('maps each part id and material correctly', () => {
    const parts = [mockPart('panel-left', 600, 720, 18), mockPart('panel-right', 600, 720, 18)];
    const scene = buildCabinetScene(parts);
    const ids = scene.meshes.map((m) => m.id);
    expect(ids).toContain('panel-left');
    expect(ids).toContain('panel-right');
    expect(scene.meshes.every((m) => m.materialId === 'plywood')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getSceneBounds
// ---------------------------------------------------------------------------

describe('getSceneBounds', () => {
  it('returns zero bounds for empty scene', () => {
    const scene = buildCabinetScene([]);
    const bounds = getSceneBounds(scene);
    expect(bounds.min).toEqual({ x: 0, y: 0, z: 0 });
    expect(bounds.max).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('world bounds encompass all mesh extents', () => {
    const parts = [mockPart('a', 600, 400, 18), mockPart('b', 300, 700, 18)];
    const scene = buildCabinetScene(parts);
    const bounds = getSceneBounds(scene);
    expect(bounds.max.x).toBeGreaterThan(bounds.min.x);
    expect(bounds.max.z).toBeGreaterThan(bounds.min.z);
  });
});

// ---------------------------------------------------------------------------
// centerScene
// ---------------------------------------------------------------------------

describe('centerScene', () => {
  it('centroid of centred scene is approximately (0, 0, 0)', () => {
    const parts = [mockPart('c1', 600, 400, 18), mockPart('c2', 600, 400, 18), mockPart('c3', 600, 400, 18)];
    const scene = centerScene(buildCabinetScene(parts));
    const bounds = getSceneBounds(scene);
    const cx = (bounds.min.x + bounds.max.x) / 2;
    const cy = (bounds.min.y + bounds.max.y) / 2;
    const cz = (bounds.min.z + bounds.max.z) / 2;
    expect(cx).toBeCloseTo(0, 0);
    expect(cy).toBeCloseTo(0, 0);
    expect(cz).toBeCloseTo(0, 0);
  });

  it('preserves mesh count', () => {
    const parts = [mockPart('d1', 400, 720, 18), mockPart('d2', 400, 720, 18)];
    const scene = buildCabinetScene(parts);
    const centred = centerScene(scene);
    expect(centred.meshes).toHaveLength(scene.meshes.length);
  });
});

// ---------------------------------------------------------------------------
// applyExplodeFactor
// ---------------------------------------------------------------------------

describe('applyExplodeFactor', () => {
  it('factor=0 returns identical origins', () => {
    const parts = [mockPart('e1', 600, 720, 18), mockPart('e2', 300, 400, 18)];
    const scene = centerScene(buildCabinetScene(parts));
    const exploded = applyExplodeFactor(scene, 0);
    scene.meshes.forEach((m, i) => {
      expect(exploded.meshes[i]!.origin.x).toBeCloseTo(m.origin.x);
      expect(exploded.meshes[i]!.origin.z).toBeCloseTo(m.origin.z);
    });
  });

  it('factor=1 shifts meshes outward from centre', () => {
    const parts = [mockPart('f1', 600, 720, 18), mockPart('f2', 300, 400, 18)];
    const scene = centerScene(buildCabinetScene(parts));
    const exploded = applyExplodeFactor(scene, 1);
    const changed = exploded.meshes.some(
      (m, i) =>
        Math.abs(m.origin.x - scene.meshes[i]!.origin.x) > 0.01 ||
        Math.abs(m.origin.z - scene.meshes[i]!.origin.z) > 0.01,
    );
    expect(changed).toBe(true);
  });

  it.each([
    ['factor = -0.1', -0.1],
    ['factor = 1.01', 1.01],
    ['factor = 2', 2],
  ])('throws RangeError when %s', (_label, factor) => {
    const scene = buildCabinetScene([]);
    expect(() => applyExplodeFactor(scene, factor)).toThrow(RangeError);
  });

  it('preserves Y origins (parts stay on the floor)', () => {
    const parts = [mockPart('g1', 600, 720, 18), mockPart('g2', 300, 400, 18)];
    const scene = centerScene(buildCabinetScene(parts));
    const exploded = applyExplodeFactor(scene, 0.5);
    scene.meshes.forEach((m, i) => {
      expect(exploded.meshes[i]!.origin.y).toBeCloseTo(m.origin.y);
    });
  });
});
