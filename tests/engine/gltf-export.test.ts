import { describe, it, expect } from 'vitest';
import {
  buildGltfScene,
  serializeGltf,
  estimateGltfSize,
  buildIfcScene,
  serializeIfc,
  GLTF_SCHEMA_VERSION,
  IFC_SCHEMA_VERSION,
  GLTF_GENERATOR,
} from '../../src/engine/gltf-export';
import type { Part } from '../../src/engine/types';
import { cfg } from '../helpers';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseConfig = cfg({ width: 800, height: 720, depth: 580 });

function makePart(overrides: Partial<Part> = {}): Part {
  return {
    id: 'P1',
    name: { en: 'Side Panel', he: 'לוח צד' },
    qty: 2,
    material: 'plywood-18',
    thickness: 18,
    length: 720,
    width: 580,
    edgeBanding: { en: 'Front edge', he: 'קצה קדמי' },
    ...overrides,
  };
}

const sampleParts: Part[] = [
  makePart({ id: 'P1', name: { en: 'Side Panel', he: 'לוח צד' } }),
  makePart({ id: 'P2', name: { en: 'Top Panel', he: 'לוח עליון' }, width: 800, length: 580 }),
  makePart({ id: 'P3', name: { en: 'Bottom Panel', he: 'לוח תחתון' }, width: 800, length: 580 }),
  makePart({ id: 'P4', name: { en: 'Back Panel', he: 'לוח אחורי' }, material: 'plywood-17', thickness: 6 }),
];

// ─── buildGltfScene ───────────────────────────────────────────────────────────

describe('buildGltfScene', () => {
  it('produces one mesh and node per part', () => {
    const scene = buildGltfScene(baseConfig, sampleParts);
    expect(scene.meshes).toHaveLength(sampleParts.length);
    expect(scene.nodes).toHaveLength(sampleParts.length);
  });

  it('includes carcass and back materials', () => {
    const scene = buildGltfScene(baseConfig, sampleParts);
    expect(scene.materials).toHaveLength(2);
    expect(scene.materials[0].name).toBe(baseConfig.carcassMaterial);
  });

  it('assigns materialIndex 1 to back panel material parts', () => {
    const backPart = makePart({ material: baseConfig.backPanelMaterial });
    const scene = buildGltfScene(baseConfig, [backPart]);
    expect(scene.meshes[0].materialIndex).toBe(1);
  });

  it('assigns materialIndex 0 to carcass material parts', () => {
    const scene = buildGltfScene(baseConfig, [sampleParts[0]]);
    expect(scene.meshes[0].materialIndex).toBe(0);
  });

  it('stores mm-to-metre converted half-extents', () => {
    const part = makePart({ width: 800, thickness: 18, length: 720 });
    const scene = buildGltfScene(baseConfig, [part]);
    const mesh = scene.meshes[0];
    expect(mesh.halfExtents.x).toBeCloseTo(0.4); // 800/2 mm → 0.4 m
    expect(mesh.halfExtents.y).toBeCloseTo(0.009); // 18/2 mm → 0.009 m
    expect(mesh.halfExtents.z).toBeCloseTo(0.36); // 720/2 mm → 0.36 m
  });

  it('populates metadata with source config', () => {
    const scene = buildGltfScene(baseConfig, []);
    expect(scene.metadata.version).toBe(GLTF_SCHEMA_VERSION);
    expect(scene.metadata.generator).toBe(GLTF_GENERATOR);
    expect(scene.metadata.sourceConfig.width).toBe(baseConfig.width);
  });

  it('returns empty meshes and nodes for empty parts array', () => {
    const scene = buildGltfScene(baseConfig, []);
    expect(scene.meshes).toHaveLength(0);
    expect(scene.nodes).toHaveLength(0);
  });

  it('node translations are stacked vertically (y increases)', () => {
    const scene = buildGltfScene(baseConfig, sampleParts);
    const ys = scene.nodes.map((n) => n.translation.y);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]).toBeGreaterThan(ys[i - 1]);
    }
  });
});

// ─── serializeGltf ────────────────────────────────────────────────────────────

describe('serializeGltf', () => {
  it('produces correct asset version', () => {
    const scene = buildGltfScene(baseConfig, sampleParts);
    const result = serializeGltf(scene);
    const asset = result.json['asset'] as Record<string, string>;
    expect(asset['version']).toBe(GLTF_SCHEMA_VERSION);
    expect(asset['generator']).toBe(GLTF_GENERATOR);
  });

  it('counts match scene', () => {
    const scene = buildGltfScene(baseConfig, sampleParts);
    const result = serializeGltf(scene);
    expect(result.meshCount).toBe(sampleParts.length);
    expect(result.nodeCount).toBe(sampleParts.length);
    expect(result.materialCount).toBe(2);
  });

  it('estimatedBytes is positive', () => {
    const scene = buildGltfScene(baseConfig, sampleParts);
    const result = serializeGltf(scene);
    expect(result.estimatedBytes).toBeGreaterThan(0);
  });

  it('json has scenes and nodes arrays', () => {
    const scene = buildGltfScene(baseConfig, sampleParts);
    const { json } = serializeGltf(scene);
    expect(Array.isArray(json['scenes'])).toBe(true);
    expect(Array.isArray(json['nodes'])).toBe(true);
    expect(Array.isArray(json['meshes'])).toBe(true);
    expect(Array.isArray(json['materials'])).toBe(true);
  });

  it('empty parts yields valid minimal JSON', () => {
    const scene = buildGltfScene(baseConfig, []);
    const { json, meshCount } = serializeGltf(scene);
    expect(meshCount).toBe(0);
    expect((json['meshes'] as unknown[]).length).toBe(0);
  });
});

// ─── estimateGltfSize ─────────────────────────────────────────────────────────

describe('estimateGltfSize', () => {
  it('returns positive bytes for non-empty scene', () => {
    const scene = buildGltfScene(baseConfig, sampleParts);
    expect(estimateGltfSize(scene)).toBeGreaterThan(0);
  });

  it('returns minimum floor for empty scene', () => {
    const scene = buildGltfScene(baseConfig, []);
    expect(estimateGltfSize(scene)).toBeGreaterThanOrEqual(0);
  });

  it('scales with part count', () => {
    const scene1 = buildGltfScene(baseConfig, [sampleParts[0]]);
    const scene4 = buildGltfScene(baseConfig, sampleParts);
    expect(estimateGltfSize(scene4)).toBeGreaterThan(estimateGltfSize(scene1));
  });
});

// ─── buildIfcScene ────────────────────────────────────────────────────────────

describe('buildIfcScene', () => {
  it('creates IfcProject, IfcSite, IfcBuilding, IfcBuildingStorey entities', () => {
    const scene = buildIfcScene(baseConfig, []);
    const types = scene.entities.map((e) => e.type);
    expect(types).toContain('IfcProject');
    expect(types).toContain('IfcSite');
    expect(types).toContain('IfcBuilding');
    expect(types).toContain('IfcBuildingStorey');
  });

  it('creates one IfcFurnishingElement per part', () => {
    const scene = buildIfcScene(baseConfig, sampleParts);
    const elements = scene.entities.filter((e) => e.type === 'IfcFurnishingElement');
    expect(elements).toHaveLength(sampleParts.length);
  });

  it('furnishing element has correct attributes', () => {
    const part = makePart({ width: 800, length: 720, thickness: 18 });
    const scene = buildIfcScene(baseConfig, [part]);
    const elem = scene.entities.find((e) => e.type === 'IfcFurnishingElement');
    expect(elem).toBeDefined();
    expect(elem?.attributes['Width']).toBe(800);
    expect(elem?.attributes['Thickness']).toBe(18);
  });

  it('creates aggregation relationships', () => {
    const scene = buildIfcScene(baseConfig, sampleParts);
    const types = scene.relationships.map((r) => r.type);
    expect(types).toContain('IfcRelAggregates');
    expect(types).toContain('IfcRelContainedInSpatialStructure');
  });

  it('no containment relationship when parts array is empty', () => {
    const scene = buildIfcScene(baseConfig, []);
    const containment = scene.relationships.filter((r) => r.type === 'IfcRelContainedInSpatialStructure');
    expect(containment).toHaveLength(0);
  });

  it('all globalIds are unique', () => {
    const scene = buildIfcScene(baseConfig, sampleParts);
    const ids = scene.entities.map((e) => e.globalId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─── serializeIfc ─────────────────────────────────────────────────────────────

describe('serializeIfc', () => {
  it('starts with ISO-10303-21 header', () => {
    const scene = buildIfcScene(baseConfig, sampleParts);
    const result = serializeIfc(scene);
    expect(result.lines[0]).toBe('ISO-10303-21;');
    expect(result.lines.some((l) => l.includes('FILE_SCHEMA'))).toBe(true);
  });

  it('ends with END-ISO-10303-21', () => {
    const scene = buildIfcScene(baseConfig, sampleParts);
    const result = serializeIfc(scene);
    expect(result.lines[result.lines.length - 1]).toBe('END-ISO-10303-21;');
  });

  it('reports correct schema version', () => {
    const scene = buildIfcScene(baseConfig, []);
    const result = serializeIfc(scene);
    expect(result.schemaVersion).toBe(IFC_SCHEMA_VERSION);
  });

  it('entityCount matches scene entities', () => {
    const scene = buildIfcScene(baseConfig, sampleParts);
    const result = serializeIfc(scene);
    expect(result.entityCount).toBe(scene.entities.length);
  });

  it('DATA section contains entity lines', () => {
    const scene = buildIfcScene(baseConfig, sampleParts);
    const result = serializeIfc(scene);
    const dataStart = result.lines.indexOf('DATA;');
    expect(dataStart).toBeGreaterThan(0);
    expect(result.lines[dataStart + 1]).toMatch(/^#\d+=/);
  });
});
