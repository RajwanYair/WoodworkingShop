/**
 * @module material-textures
 * @description
 * Phase 18 / Sprint 68 — Material texture atlas.
 *
 * Defines SVG-compatible pattern data for 8 wood species and composite sheet
 * materials (MDF, plywood).  Each entry carries the information needed to
 * render a realistic grain overlay inside any SVG viewport without importing
 * additional libraries.
 *
 * Usage in React SVG components:
 * ```tsx
 * import { MATERIAL_TEXTURES, buildSvgPatternDefs } from '../../engine/material-textures';
 * // inside <svg><defs>{buildSvgPatternDefs('oak', 'iso-oak')}</defs> ...
 * //         <polygon fill="url(#iso-oak-top)" .../>
 * ```
 *
 * Rules:
 * - Pure TypeScript — no React, no DOM, no side effects.
 * - Pattern tiles are 64×64 user-units; scale via `patternTransform`.
 * - `grainLines` describes parallel strokes relative to a 64×64 tile.
 */

/** A single grain line relative to a 64×64 pattern tile. */
export interface GrainLine {
  /** x1 of the stroke (0–64) */
  x1: number;
  /** y1 of the stroke (0–64) */
  y1: number;
  /** x2 of the stroke (0–64) */
  x2: number;
  /** y2 of the stroke (0–64) */
  y2: number;
  /** Stroke opacity multiplier (0–1) */
  opacity: number;
  /** Stroke width */
  width: number;
}

/** Complete texture definition for one material species or composite. */
export interface MaterialTexture {
  /** Unique identifier — matches species keys in materials.ts where applicable. */
  id: string;
  /** Display name (English). */
  label: string;
  /** CSS hex base colour for the face background. */
  baseColor: string;
  /**
   * Darkened variant for side/shadow faces (calculated automatically if omitted).
   * Provide an explicit value when the species needs a non-linear darkening.
   */
  sideColor?: string;
  /** Grain line stroke colour. */
  grainColor: string;
  /** Whether this material has visible grain (false → uniform fill, no lines). */
  hasGrain: boolean;
  /**
   * Grain lines within a 64×64 tile.  For materials without grain this array
   * should be empty.
   */
  grainLines: GrainLine[];
}

// ─── Helper: build a set of evenly-spaced horizontal grain lines ───────────

function hLines(spacing: number, opacity: number, width: number, count?: number): GrainLine[] {
  const n = count ?? Math.floor(64 / spacing);
  return Array.from({ length: n }, (_, i) => ({
    x1: 0,
    y1: i * spacing + spacing / 2,
    x2: 64,
    y2: i * spacing + spacing / 2,
    opacity,
    width,
  }));
}

/** Alternate-opacity version for medullary ray effect (oak / quarter-sawn). */
function hLinesAlt(spacing: number, count: number): GrainLine[] {
  return Array.from({ length: count }, (_, i) => ({
    x1: 0,
    y1: i * spacing + spacing / 2,
    x2: 64,
    y2: i * spacing + spacing / 2,
    opacity: i % 3 === 0 ? 0.45 : 0.18,
    width: i % 3 === 0 ? 1.0 : 0.5,
  }));
}

/** Plywood edge-grain: short horizontal bands that suggest lamination layers. */
function plywoodLines(): GrainLine[] {
  const lines: GrainLine[] = [];
  const layerH = 8; // mm per ply in 64-unit tile
  for (let i = 0; i < 8; i++) {
    const y = i * layerH + layerH / 2;
    lines.push({ x1: 0, y1: y, x2: 64, y2: y, opacity: 0.35, width: 1.2 });
    // Add a secondary subtle line within each layer
    if (i % 2 === 0) {
      lines.push({ x1: 0, y1: y + 3, x2: 64, y2: y + 3, opacity: 0.12, width: 0.5 });
    }
  }
  return lines;
}

// ─── Catalogue ───────────────────────────────────────────────────────────────

/** Material texture atlas — 8 species + 2 composites (512×512 logical tile = 8 × 64×64 entries). */
export const MATERIAL_TEXTURES: Record<string, MaterialTexture> = {
  oak: {
    id: 'oak',
    label: 'Oak',
    baseColor: '#C8A96E',
    sideColor: '#9A7D45',
    grainColor: '#7A5C2E',
    hasGrain: true,
    grainLines: hLinesAlt(8, 8),
  },
  maple: {
    id: 'maple',
    label: 'Maple',
    baseColor: '#E8D5A3',
    sideColor: '#C4A96C',
    grainColor: '#B08040',
    hasGrain: true,
    grainLines: hLines(5, 0.15, 0.5),
  },
  walnut: {
    id: 'walnut',
    label: 'Walnut',
    baseColor: '#6B4226',
    sideColor: '#4A2D18',
    grainColor: '#3A1E0D',
    hasGrain: true,
    grainLines: hLines(10, 0.3, 1.0),
  },
  pine: {
    id: 'pine',
    label: 'Pine',
    baseColor: '#D4B483',
    sideColor: '#A8864E',
    grainColor: '#8A6633',
    hasGrain: true,
    grainLines: [
      ...hLines(12, 0.2, 0.8, 5),
      // knot simulation: concentric-ish ellipse approximated as extra lines
      { x1: 16, y1: 28, x2: 32, y2: 28, opacity: 0.55, width: 1.8 },
      { x1: 14, y1: 30, x2: 34, y2: 30, opacity: 0.4, width: 1.2 },
      { x1: 16, y1: 32, x2: 32, y2: 32, opacity: 0.25, width: 0.8 },
    ],
  },
  birch: {
    id: 'birch',
    label: 'Birch',
    baseColor: '#F2E8D2',
    sideColor: '#D4C09A',
    grainColor: '#8A7050',
    hasGrain: true,
    grainLines: hLines(4, 0.12, 0.5),
  },
  cherry: {
    id: 'cherry',
    label: 'Cherry',
    baseColor: '#A0522D',
    sideColor: '#7A3A18',
    grainColor: '#5C2A0E',
    hasGrain: true,
    grainLines: hLines(9, 0.25, 0.7),
  },
  mdf: {
    id: 'mdf',
    label: 'MDF',
    baseColor: '#D4C8B8',
    sideColor: '#B0A494',
    grainColor: '#888',
    hasGrain: false,
    grainLines: [],
  },
  plywood: {
    id: 'plywood',
    label: 'Plywood',
    baseColor: '#D8C494',
    sideColor: '#B09E6A',
    grainColor: '#8A7040',
    hasGrain: true,
    grainLines: plywoodLines(),
  },
};

/** Ordered list of material IDs for catalogue iteration. */
export const MATERIAL_TEXTURE_IDS = ['oak', 'maple', 'walnut', 'pine', 'birch', 'cherry', 'mdf', 'plywood'] as const;

export type MaterialTextureId = (typeof MATERIAL_TEXTURE_IDS)[number];

/**
 * Look up a texture by ID; returns `undefined` when the ID is not in the atlas.
 * @param id - Species or composite identifier.
 */
export function getMaterialTexture(id: string): MaterialTexture | undefined {
  return MATERIAL_TEXTURES[id];
}

/**
 * Derive a texture atlas ID from a material catalog key such as `'plywood-18'` or `'mdf-16'`.
 *
 * Returns `undefined` for materials without visible grain (melamine, chipboard, glass)
 * so callers can fall back to a solid colour fill.
 *
 * @param materialKey - Key from the MATERIALS catalogue (e.g. `'plywood-18'`, `'mdf-16'`).
 */
export function getMaterialTextureId(materialKey: string): string | undefined {
  if (materialKey.startsWith('plywood') || materialKey.startsWith('osb')) return 'plywood';
  if (materialKey.startsWith('mdf')) return 'mdf';
  if (materialKey.startsWith('birch')) return 'birch';
  if (materialKey.startsWith('oak')) return 'oak';
  if (materialKey.startsWith('maple')) return 'maple';
  if (materialKey.startsWith('walnut')) return 'walnut';
  if (materialKey.startsWith('pine')) return 'pine';
  if (materialKey.startsWith('cherry')) return 'cherry';
  return undefined; // melamine, chipboard, glass → flat colour
}

/**
 * Produce an SVG `<pattern>` element string for use inside `<defs>`.
 *
 * Three variants are generated:
 * - `${patternId}-top`   – horizontal grain (standard face)
 * - `${patternId}-side`  – grain rotated 90° (edge/side face)
 * - `${patternId}-front` – same as top but slightly darker
 *
 * @param textureId - Key into `MATERIAL_TEXTURES`.
 * @param patternId - Unique prefix for the generated `id` attributes.
 * @param tileScale - Scale factor applied via `patternTransform` (default 1).
 */
export function buildSvgPatternDefs(textureId: string, patternId: string, tileScale = 1): string {
  const tex = MATERIAL_TEXTURES[textureId];
  if (!tex) return '';

  const grainStrokes = tex.grainLines
    .map(
      (l) =>
        `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" ` +
        `stroke="${tex.grainColor}" stroke-width="${l.width}" opacity="${l.opacity}"/>`,
    )
    .join('');

  const scale = tileScale === 1 ? '' : ` patternTransform="scale(${tileScale})"`;

  // Top face pattern (horizontal grain)
  const topPat =
    `<pattern id="${patternId}-top" x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse"${scale}>` +
    `<rect width="64" height="64" fill="${tex.baseColor}"/>` +
    grainStrokes +
    `</pattern>`;

  // Side face pattern (grain rotated 90° — shows edge grain on sides)
  const sideGrainStrokes = tex.grainLines
    .map(
      (l) =>
        `<line x1="${l.y1}" y1="${l.x1}" x2="${l.y2}" y2="${l.x2}" ` +
        `stroke="${tex.grainColor}" stroke-width="${l.width}" opacity="${l.opacity * 0.8}"/>`,
    )
    .join('');
  const sidePat =
    `<pattern id="${patternId}-side" x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse"${scale}>` +
    `<rect width="64" height="64" fill="${tex.sideColor ?? tex.baseColor}"/>` +
    sideGrainStrokes +
    `</pattern>`;

  // Front face pattern (same grain, slightly dimmed)
  const frontPat =
    `<pattern id="${patternId}-front" x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse"${scale}>` +
    `<rect width="64" height="64" fill="${tex.baseColor}"/>` +
    grainStrokes +
    `<rect width="64" height="64" fill="#000" opacity="0.06"/>` +
    `</pattern>`;

  return topPat + sidePat + frontPat;
}
