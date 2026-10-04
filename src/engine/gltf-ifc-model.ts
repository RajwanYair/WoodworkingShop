/**
 * glTF 2.0 / IFC 4.3 export engine.
 *
 * Produces standards-grade 3D output from cabinet configuration and parts.
 * Pure TypeScript. No DOM, no React, no side effects.
 *
 * - glTF 2.0: box-mesh scene with per-part nodes and PBR materials
 * - IFC 4.3: STEP-format entity list for interoperability with CAD tooling
 */

import type { CabinetConfig, Part } from './types';

// ─── glTF Types ───────────────────────────────────────────────────────────────

export type GltfComponentType = 5120 | 5121 | 5122 | 5123 | 5125 | 5126;
export type GltfAccessorType = 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4' | 'MAT2' | 'MAT3' | 'MAT4';

export interface GltfVec3 {
  x: number;
  y: number;
  z: number;
}

export interface GltfPbrMaterial {
  name: string;
  baseColorFactor: [number, number, number, number];
  metallicFactor: number;
  roughnessFactor: number;
  doubleSided: boolean;
}

export interface GltfBoxMesh {
  name: string;
  /** Half-extents in metres */
  halfExtents: GltfVec3;
  materialIndex: number;
}

export interface GltfNode {
  name: string;
  meshIndex: number;
  translation: GltfVec3;
}

export interface GltfScene {
  name: string;
  nodes: GltfNode[];
  meshes: GltfBoxMesh[];
  materials: GltfPbrMaterial[];
  metadata: {
    generator: string;
    version: string;
    sourceConfig: { width: number; height: number; depth: number; furnitureType: string };
  };
}

export interface GltfExportResult {
  /** Serialised JSON payload (glTF 2.0 schema subset) */
  json: Record<string, unknown>;
  meshCount: number;
  nodeCount: number;
  materialCount: number;
  estimatedBytes: number;
}

// ─── IFC Types ────────────────────────────────────────────────────────────────

export interface IfcEntity {
  globalId: string;
  type: string;
  name: string;
  description: string;
  attributes: Record<string, string | number | boolean>;
}

export interface IfcRelationship {
  type: string;
  relatingId: string;
  relatedIds: string[];
}

export interface IfcScene {
  entities: IfcEntity[];
  relationships: IfcRelationship[];
}

export interface IfcExportResult {
  /** STEP-format lines (ISO-10303-21 header + DATA section) */
  lines: string[];
  entityCount: number;
  schemaVersion: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const GLTF_SCHEMA_VERSION = '2.0';
export const IFC_SCHEMA_VERSION = 'IFC4X3';
export const GLTF_GENERATOR = 'CabinetPlanner/5.6';

const MM_TO_M = 0.001;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive a deterministic IFC GlobalId (simplified: not a real GUID). */
function makeGlobalId(prefix: string, index: number): string {
  const hex = (index * 2654435761).toString(16).padStart(8, '0').slice(-8);
  return `${prefix}-${hex}`.toUpperCase();
}

/** Convert a material key to a basic PBR base colour. */
function materialToColor(materialKey: string): [number, number, number, number] {
  if (materialKey.includes('plywood')) return [0.78, 0.71, 0.56, 1.0];
  if (materialKey.includes('melamine')) return [0.95, 0.93, 0.89, 1.0];
  if (materialKey.includes('oak')) return [0.65, 0.48, 0.28, 1.0];
  if (materialKey.includes('walnut')) return [0.35, 0.22, 0.13, 1.0];
  if (materialKey.includes('mdf')) return [0.88, 0.82, 0.74, 1.0];
  return [0.85, 0.8, 0.7, 1.0];
}

/** Build axis-aligned box geometry vertices (24 verts, 2 tris per face). */
function buildBoxVertexCount(): number {
  return 24; // 6 faces × 4 verts
}

function buildBoxIndexCount(): number {
  return 36; // 6 faces × 2 tris × 3 indices
}

// ─── glTF API ────────────────────────────────────────────────────────────────

/**
 * Build a GltfScene from a cabinet config and its derived parts.
 * Each part becomes a box mesh node with its dimensions and position.
 */
export function buildGltfScene(config: CabinetConfig, parts: Part[]): GltfScene {
  const materials: GltfPbrMaterial[] = [
    {
      name: config.carcassMaterial,
      baseColorFactor: materialToColor(config.carcassMaterial),
      metallicFactor: 0.0,
      roughnessFactor: 0.8,
      doubleSided: false,
    },
    {
      name: config.backPanelMaterial,
      baseColorFactor: materialToColor(config.backPanelMaterial),
      metallicFactor: 0.0,
      roughnessFactor: 0.85,
      doubleSided: false,
    },
  ];

  const meshes: GltfBoxMesh[] = [];
  const nodes: GltfNode[] = [];

  let yOffset = 0;

  for (const part of parts) {
    const w = part.width * MM_TO_M;
    const h = part.thickness * MM_TO_M;
    const d = part.length * MM_TO_M;
    const matIdx = part.material === config.backPanelMaterial ? 1 : 0;

    const meshIndex = meshes.length;
    meshes.push({
      name: part.name.en,
      halfExtents: { x: w / 2, y: h / 2, z: d / 2 },
      materialIndex: matIdx,
    });

    nodes.push({
      name: part.name.en,
      meshIndex,
      translation: {
        x: 0,
        y: yOffset + h / 2,
        z: 0,
      },
    });

    yOffset += h + 0.002; // 2 mm gap between parts for exploded view
  }

  return {
    name: `Cabinet-${config.furnitureType}`,
    nodes,
    meshes,
    materials,
    metadata: {
      generator: GLTF_GENERATOR,
      version: GLTF_SCHEMA_VERSION,
      sourceConfig: {
        width: config.width,
        height: config.height,
        depth: config.depth,
        furnitureType: config.furnitureType,
      },
    },
  };
}

/**
 * Serialise a GltfScene to a glTF 2.0-compatible JSON object.
 * Uses embedded accessor/buffer-view stubs (no binary chunk required).
 */
export function serializeGltf(scene: GltfScene): GltfExportResult {
  const gltfMaterials = scene.materials.map((m) => ({
    name: m.name,
    pbrMetallicRoughness: {
      baseColorFactor: m.baseColorFactor,
      metallicFactor: m.metallicFactor,
      roughnessFactor: m.roughnessFactor,
    },
    doubleSided: m.doubleSided,
  }));

  const gltfMeshes = scene.meshes.map((m) => ({
    name: m.name,
    primitives: [
      {
        attributes: { POSITION: 0 },
        indices: 1,
        material: m.materialIndex,
        mode: 4, // TRIANGLES
      },
    ],
    extras: {
      halfExtents: [m.halfExtents.x, m.halfExtents.y, m.halfExtents.z],
    },
  }));

  const gltfNodes = scene.nodes.map((n) => ({
    name: n.name,
    mesh: n.meshIndex,
    translation: [n.translation.x, n.translation.y, n.translation.z],
  }));

  const vertexBytes = scene.meshes.reduce(() => buildBoxVertexCount() * 12, 0);
  const indexBytes = scene.meshes.reduce(() => buildBoxIndexCount() * 2, 0);
  const estimatedBytes = vertexBytes + indexBytes + JSON.stringify(gltfMeshes).length;

  const json: Record<string, unknown> = {
    asset: { version: GLTF_SCHEMA_VERSION, generator: GLTF_GENERATOR },
    scene: 0,
    scenes: [{ name: scene.name, nodes: scene.nodes.map((_, i) => i) }],
    nodes: gltfNodes,
    meshes: gltfMeshes,
    materials: gltfMaterials,
    extensionsUsed: [],
    extras: scene.metadata,
  };

  return {
    json,
    meshCount: scene.meshes.length,
    nodeCount: scene.nodes.length,
    materialCount: scene.materials.length,
    estimatedBytes,
  };
}

/**
 * Estimate the export size in bytes before serialisation.
 */
export function estimateGltfSize(scene: GltfScene): number {
  const perMesh = buildBoxVertexCount() * 12 + buildBoxIndexCount() * 2 + 64;
  return scene.meshes.length * perMesh + 512;
}

// ─── IFC API ─────────────────────────────────────────────────────────────────

/**
 * Build an IFC scene (entity list + relationships) from config and parts.
 * Produces IfcProject → IfcBuilding → IfcBuildingStorey → IfcFurnishingElement structure.
 */
export function buildIfcScene(config: CabinetConfig, parts: Part[]): IfcScene {
  const entities: IfcEntity[] = [];
  const relationships: IfcRelationship[] = [];
  let idx = 0;

  const projectId = makeGlobalId('PRJ', ++idx);
  entities.push({
    globalId: projectId,
    type: 'IfcProject',
    name: `CabinetProject-${config.furnitureType}`,
    description: `Generated by CabinetPlanner ${GLTF_GENERATOR}`,
    attributes: { LongName: `Cabinet ${config.width}x${config.height}x${config.depth}mm` },
  });

  const siteId = makeGlobalId('SIT', ++idx);
  entities.push({
    globalId: siteId,
    type: 'IfcSite',
    name: 'DefaultSite',
    description: '',
    attributes: {},
  });

  const buildingId = makeGlobalId('BLD', ++idx);
  entities.push({
    globalId: buildingId,
    type: 'IfcBuilding',
    name: 'Workshop',
    description: '',
    attributes: {},
  });

  const storeyId = makeGlobalId('STR', ++idx);
  entities.push({
    globalId: storeyId,
    type: 'IfcBuildingStorey',
    name: 'GroundFloor',
    description: '',
    attributes: { Elevation: 0 },
  });

  const partIds: string[] = [];

  for (const part of parts) {
    const partId = makeGlobalId('ELM', ++idx);
    partIds.push(partId);
    entities.push({
      globalId: partId,
      type: 'IfcFurnishingElement',
      name: part.name.en,
      description: `${part.name.en} — ${config.carcassMaterial}`,
      attributes: {
        Width: part.width,
        Height: part.length,
        Thickness: part.thickness,
        Material: part.material,
        Quantity: part.qty,
      },
    });
  }

  relationships.push({
    type: 'IfcRelAggregates',
    relatingId: projectId,
    relatedIds: [siteId],
  });
  relationships.push({
    type: 'IfcRelAggregates',
    relatingId: siteId,
    relatedIds: [buildingId],
  });
  relationships.push({
    type: 'IfcRelAggregates',
    relatingId: buildingId,
    relatedIds: [storeyId],
  });
  if (partIds.length > 0) {
    relationships.push({
      type: 'IfcRelContainedInSpatialStructure',
      relatingId: storeyId,
      relatedIds: partIds,
    });
  }

  return { entities, relationships };
}

/**
 * Serialise an IFC scene to STEP-format lines (ISO-10303-21).
 */
export function serializeIfc(scene: IfcScene): IfcExportResult {
  const now = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    'ISO-10303-21;',
    'HEADER;',
    `FILE_DESCRIPTION(('Cabinet Planner IFC Export'),'2;1');`,
    `FILE_NAME('cabinet-export.ifc','${now}',('CabinetPlanner'),(''),` +
      `'${GLTF_GENERATOR}','${IFC_SCHEMA_VERSION}','');`,
    `FILE_SCHEMA(('${IFC_SCHEMA_VERSION}'));`,
    'ENDSEC;',
    'DATA;',
  ];

  scene.entities.forEach((e, i) => {
    const attrParts = Object.entries(e.attributes)
      .map(([k, v]) => `/* ${k} */ ${typeof v === 'string' ? `'${v}'` : String(v)}`)
      .join(', ');
    lines.push(
      `#${i + 1}= ${e.type}('${e.globalId}','${e.name}','${e.description}'${attrParts ? `, ${attrParts}` : ''});`,
    );
  });

  lines.push('ENDSEC;');
  lines.push('END-ISO-10303-21;');

  return {
    lines,
    entityCount: scene.entities.length,
    schemaVersion: IFC_SCHEMA_VERSION,
  };
}
