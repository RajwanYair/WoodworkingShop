/**
 * Sprint 84 — glTF 2.0 export (GL Transmission Format).
 *
 * Produces a self-contained *.gltf JSON file (glTF 2.0 specification §5).
 * Each cabinet Part × qty becomes a Mesh node with box geometry.
 * Parts are stacked along the Y-axis (10 mm gap between instances).
 *
 * The output can be viewed in any glTF-capable viewer:
 *   Khronos glTF Sample Viewer, Blender, three.js, Babylon.js, A-Frame.
 *
 * NOTE: Pure TypeScript — no React, no DOM, no side effects.
 */

import type { CabinetConfig, Part } from '../types';

// ─── glTF 2.0 type stubs (subset used here) ──────────────────────────────────

interface GltfAsset {
  version: '2.0';
  generator: string;
}

interface GltfScene {
  name: string;
  nodes: number[];
}

interface GltfNode {
  name: string;
  mesh: number;
  translation: [number, number, number];
}

interface GltfMesh {
  name: string;
  primitives: GltfPrimitive[];
}

interface GltfPrimitive {
  attributes: { POSITION: number; NORMAL: number };
  indices: number;
  mode: number; // 4 = TRIANGLES
}

interface GltfAccessor {
  bufferView: number;
  componentType: number; // 5126=FLOAT, 5123=UNSIGNED_SHORT
  count: number;
  type: string;
  min?: number[];
  max?: number[];
}

interface GltfBufferView {
  buffer: number;
  byteOffset: number;
  byteLength: number;
  target: number; // 34962=ARRAY_BUFFER, 34963=ELEMENT_ARRAY_BUFFER
}

interface GltfBuffer {
  byteLength: number;
  uri: string; // base64-encoded binary
}

interface GltfRoot {
  asset: GltfAsset;
  scene: number;
  scenes: GltfScene[];
  nodes: GltfNode[];
  meshes: GltfMesh[];
  accessors: GltfAccessor[];
  bufferViews: GltfBufferView[];
  buffers: GltfBuffer[];
}

export interface GltfResult {
  content: string; // JSON string
  partCount: number;
}

// ─── box geometry helpers ─────────────────────────────────────────────────────

/**
 * Build interleaved Float32 positions + normals and Uint16 indices for a box.
 * Dimensions in metres (converted from mm).
 */
function boxGeometry(
  wMm: number,
  hMm: number,
  dMm: number,
): {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
} {
  const w = wMm / 1000;
  const h = hMm / 1000;
  const d = dMm / 1000;
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;

  // 6 faces × 4 vertices = 24 unique vertices
  // Each face: 2 triangles = 6 indices
  // prettier-ignore
  const FACE_VERTS: [number, number, number, number, number, number][] = [
    // positions (x,y,z)          normals (nx,ny,nz)
    // +X face
    [ hw,  hh, -hd,  1, 0, 0],  [ hw, -hh, -hd,  1, 0, 0],  [ hw, -hh,  hd,  1, 0, 0],  [ hw,  hh,  hd,  1, 0, 0],
    // -X face
    [-hw,  hh,  hd, -1, 0, 0],  [-hw, -hh,  hd, -1, 0, 0],  [-hw, -hh, -hd, -1, 0, 0],  [-hw,  hh, -hd, -1, 0, 0],
    // +Y face
    [-hw,  hh,  hd,  0, 1, 0],  [-hw,  hh, -hd,  0, 1, 0],  [ hw,  hh, -hd,  0, 1, 0],  [ hw,  hh,  hd,  0, 1, 0],
    // -Y face
    [-hw, -hh, -hd,  0,-1, 0],  [-hw, -hh,  hd,  0,-1, 0],  [ hw, -hh,  hd,  0,-1, 0],  [ hw, -hh, -hd,  0,-1, 0],
    // +Z face
    [-hw,  hh,  hd,  0, 0, 1],  [-hw, -hh,  hd,  0, 0, 1],  [ hw, -hh,  hd,  0, 0, 1],  [ hw,  hh,  hd,  0, 0, 1],
    // -Z face
    [ hw,  hh, -hd,  0, 0,-1],  [ hw, -hh, -hd,  0, 0,-1],  [-hw, -hh, -hd,  0, 0,-1],  [-hw,  hh, -hd,  0, 0,-1],
  ];

  const positions = new Float32Array(24 * 3);
  const normals = new Float32Array(24 * 3);
  for (let i = 0; i < 24; i++) {
    const v = FACE_VERTS[i];
    positions[i * 3] = v[0];
    positions[i * 3 + 1] = v[1];
    positions[i * 3 + 2] = v[2];
    normals[i * 3] = v[3];
    normals[i * 3 + 1] = v[4];
    normals[i * 3 + 2] = v[5];
  }

  // 2 triangles per face, 6 faces
  // prettier-ignore
  const indices = new Uint16Array([
     0, 1, 2,  0, 2, 3,   // +X
     4, 5, 6,  4, 6, 7,   // -X
     8, 9,10,  8,10,11,   // +Y
    12,13,14, 12,14,15,   // -Y
    16,17,18, 16,18,19,   // +Z
    20,21,22, 20,22,23,   // -Z
  ]);

  return { positions, normals, indices };
}

/** Encode a TypedArray as a base64 data URI. */
function toDataUri(buffer: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:${mimeType};base64,${base64}`;
}

// ─── main export ─────────────────────────────────────────────────────────────

/**
 * Generate a glTF 2.0 JSON string for the given parts.
 *
 * @param config - Cabinet configuration (used for the file name hint only)
 * @param parts  - Engine-generated Part list
 * @returns `{ content, partCount }` where `content` is the glTF JSON string
 */
export function generateGltfContent(config: CabinetConfig, parts: Part[]): GltfResult {
  const root: GltfRoot = {
    asset: {
      version: '2.0',
      generator: `CabinetPlanner v4.1 — Sprint 84 (${config.width}×${config.height}×${config.depth}mm)`,
    },
    scene: 0,
    scenes: [{ name: 'Cabinet', nodes: [] }],
    nodes: [],
    meshes: [],
    accessors: [],
    bufferViews: [],
    buffers: [],
  };

  const GAP_M = 0.01; // 10 mm gap between stacked instances
  let yOffset = 0;
  let partCount = 0;

  for (const part of parts) {
    const qty = part.qty ?? 1;
    // Width = along sheet width, Height = thickness, Depth = part length
    const { positions, normals, indices } = boxGeometry(
      part.width, // mm
      part.thickness ?? 18, // mm
      part.length, // mm
    );

    // Build a single glTF buffer for this part (positions + normals + indices)
    const posBytes = positions.buffer;
    const nrmBytes = normals.buffer;
    const idxBytes = indices.buffer;

    const posLen = posBytes.byteLength;
    const nrmLen = nrmBytes.byteLength;
    const idxLen = idxBytes.byteLength;

    // Concatenate into one ArrayBuffer
    const combined = new Uint8Array(posLen + nrmLen + idxLen);
    combined.set(new Uint8Array(posBytes), 0);
    combined.set(new Uint8Array(nrmBytes), posLen);
    combined.set(new Uint8Array(idxBytes), posLen + nrmLen);

    const bufIdx = root.buffers.length;
    root.buffers.push({
      byteLength: combined.byteLength,
      uri: toDataUri(combined.buffer, 'application/octet-stream'),
    });

    const bvBase = root.bufferViews.length;
    root.bufferViews.push(
      { buffer: bufIdx, byteOffset: 0, byteLength: posLen, target: 34962 },
      { buffer: bufIdx, byteOffset: posLen, byteLength: nrmLen, target: 34962 },
      { buffer: bufIdx, byteOffset: posLen + nrmLen, byteLength: idxLen, target: 34963 },
    );

    const accBase = root.accessors.length;

    // Compute POSITION min/max for accessor
    const wM = part.width / 2000;
    const hM = (part.thickness ?? 18) / 2000;
    const dM = part.length / 2000;

    root.accessors.push(
      {
        bufferView: bvBase,
        componentType: 5126, // FLOAT
        count: 24,
        type: 'VEC3',
        min: [-wM, -hM, -dM],
        max: [wM, hM, dM],
      },
      {
        bufferView: bvBase + 1,
        componentType: 5126, // FLOAT
        count: 24,
        type: 'VEC3',
      },
      {
        bufferView: bvBase + 2,
        componentType: 5123, // UNSIGNED_SHORT
        count: 36,
        type: 'SCALAR',
      },
    );

    const meshIdx = root.meshes.length;
    const partLabel = typeof part.name === 'object' ? (part.name.en ?? part.id) : part.id;
    root.meshes.push({
      name: partLabel,
      primitives: [
        {
          attributes: { POSITION: accBase, NORMAL: accBase + 1 },
          indices: accBase + 2,
          mode: 4, // TRIANGLES
        },
      ],
    });

    for (let i = 0; i < qty; i++) {
      const nodeIdx = root.nodes.length;
      root.nodes.push({
        name: `${partLabel}_${i + 1}`,
        mesh: meshIdx,
        translation: [0, yOffset, 0],
      });
      root.scenes[0].nodes.push(nodeIdx);
      yOffset += (part.thickness ?? 18) / 1000 + GAP_M;
      partCount++;
    }
  }

  return {
    content: JSON.stringify(root, null, 2),
    partCount,
  };
}
