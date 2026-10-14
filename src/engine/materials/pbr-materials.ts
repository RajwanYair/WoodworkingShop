/**
 * PBR Material System — Sprint 113 (Phase 26)
 *
 * Pure-TypeScript physically-based rendering material definitions for the
 * WebGPU / WebGL2 cabinet renderer. Every material is described by standard
 * PBR parameters (baseColor, roughness, metalness, normal scale, AO) plus
 * procedural wood-grain parameters used by the fragment shader.
 *
 * This module is pure data — no DOM, no React, no side effects.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Linear-space RGB colour, each channel in [0, 1]. */
export interface PbrColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** Hardware surface category. */
export type HardwareFinish = 'chrome' | 'brushed-steel' | 'brass' | 'black-matte';

/**
 * Physically-based rendering material definition.
 *
 * All numeric values follow the metalness/roughness workflow used by
 * Three.js `MeshStandardMaterial`, glTF 2.0, and WebGPU PBR shaders.
 */
export interface PbrMaterial {
  /** Unique material identifier — matches `Material.key` in the engine catalogue. */
  readonly id: string;
  readonly displayName: { readonly en: string; readonly he: string };
  /** Albedo / diffuse colour in linear sRGB space. */
  readonly baseColor: PbrColor;
  /** Surface roughness: 0 = mirror-smooth, 1 = fully diffuse. */
  readonly roughness: number;
  /** Metalness: 0 = dielectric (wood, plastic), 1 = fully metallic. */
  readonly metalness: number;
  /** Normal-map intensity multiplier (1 = standard, 0 = flat). */
  readonly normalScale: number;
  /** Ambient occlusion bake intensity (0 = no AO, 1 = full AO). */
  readonly aoIntensity: number;
  /**
   * Procedural grain frequency along the U axis (0 = no grain rings).
   * Larger values produce tighter, denser grain lines.
   */
  readonly grainFrequency: number;
  /**
   * Grain ring contrast 0–1. At 0 the grain is invisible; at 1 the dark
   * growth rings are at full contrast against the base colour.
   */
  readonly grainContrast: number;
  /**
   * Index into the shared PBR texture atlas (row in a 512×512 array texture).
   * Shader uses this to sample the pre-baked normal + roughness maps.
   * -1 indicates a procedural-only material (no atlas entry yet).
   */
  readonly textureAtlasIndex: number;
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

/** Convert sRGB hex string (e.g. `'#C8B88A'`) to a linear-space `PbrColor`. */
export function hexToLinearRgb(hex: string): PbrColor {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new RangeError(`hexToLinearRgb: invalid hex colour '${hex}'`);
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  // Approximate gamma correction (sRGB → linear)
  return {
    r: r <= 0.04045 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4,
    g: g <= 0.04045 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4,
    b: b <= 0.04045 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4,
  };
}

/**
 * Linearly interpolate between two `PbrColor` values.
 *
 * @param a - Start colour.
 * @param b - End colour.
 * @param t - Mix factor [0, 1].
 * @returns Interpolated `PbrColor`.
 * @throws RangeError if `t` is outside [0, 1].
 */
export function lerpColor(a: PbrColor, b: PbrColor, t: number): PbrColor {
  if (t < 0 || t > 1) throw new RangeError(`lerpColor: t must be in [0, 1], got ${t}`);
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/**
 * Blend two `PbrMaterial` definitions by linearly interpolating all numeric
 * fields. `id`, `displayName`, and `textureAtlasIndex` are taken from `a`.
 *
 * @param a - Base material.
 * @param b - Target material.
 * @param t - Blend factor [0, 1].
 * @returns New blended `PbrMaterial`.
 * @throws RangeError if `t` is outside [0, 1].
 */
export function blendPbrMaterials(a: PbrMaterial, b: PbrMaterial, t: number): PbrMaterial {
  if (t < 0 || t > 1) throw new RangeError(`blendPbrMaterials: t must be in [0, 1], got ${t}`);
  return {
    id: a.id,
    displayName: a.displayName,
    baseColor: lerpColor(a.baseColor, b.baseColor, t),
    roughness: a.roughness + (b.roughness - a.roughness) * t,
    metalness: a.metalness + (b.metalness - a.metalness) * t,
    normalScale: a.normalScale + (b.normalScale - a.normalScale) * t,
    aoIntensity: a.aoIntensity + (b.aoIntensity - a.aoIntensity) * t,
    grainFrequency: a.grainFrequency + (b.grainFrequency - a.grainFrequency) * t,
    grainContrast: a.grainContrast + (b.grainContrast - a.grainContrast) * t,
    textureAtlasIndex: a.textureAtlasIndex,
  };
}

// ---------------------------------------------------------------------------
// Wood material catalogue (keys match engine/materials.ts Material.key)
// ---------------------------------------------------------------------------

const WOOD_CATALOGUE: readonly PbrMaterial[] = [
  {
    id: 'oak',
    displayName: { en: 'Oak', he: 'אלון' },
    baseColor: hexToLinearRgb('#C8A96E'),
    roughness: 0.72,
    metalness: 0,
    normalScale: 1.2,
    aoIntensity: 0.7,
    grainFrequency: 18,
    grainContrast: 0.22,
    textureAtlasIndex: 0,
  },
  {
    id: 'maple',
    displayName: { en: 'Maple', he: 'מייפל' },
    baseColor: hexToLinearRgb('#E8D5A8'),
    roughness: 0.65,
    metalness: 0,
    normalScale: 0.9,
    aoIntensity: 0.6,
    grainFrequency: 12,
    grainContrast: 0.1,
    textureAtlasIndex: 1,
  },
  {
    id: 'walnut',
    displayName: { en: 'Walnut', he: 'אגוז' },
    baseColor: hexToLinearRgb('#6B4423'),
    roughness: 0.68,
    metalness: 0,
    normalScale: 1.0,
    aoIntensity: 0.75,
    grainFrequency: 14,
    grainContrast: 0.28,
    textureAtlasIndex: 2,
  },
  {
    id: 'pine',
    displayName: { en: 'Pine', he: 'אורן' },
    baseColor: hexToLinearRgb('#E2C47A'),
    roughness: 0.8,
    metalness: 0,
    normalScale: 1.1,
    aoIntensity: 0.65,
    grainFrequency: 10,
    grainContrast: 0.18,
    textureAtlasIndex: 3,
  },
  {
    id: 'birch',
    displayName: { en: 'Birch Plywood', he: 'דיקט ליבנה' },
    baseColor: hexToLinearRgb('#D4C4A0'),
    roughness: 0.75,
    metalness: 0,
    normalScale: 0.8,
    aoIntensity: 0.55,
    grainFrequency: 8,
    grainContrast: 0.12,
    textureAtlasIndex: 4,
  },
  {
    id: 'cherry',
    displayName: { en: 'Cherry', he: 'דובדבן' },
    baseColor: hexToLinearRgb('#A0522D'),
    roughness: 0.62,
    metalness: 0,
    normalScale: 0.95,
    aoIntensity: 0.68,
    grainFrequency: 16,
    grainContrast: 0.2,
    textureAtlasIndex: 5,
  },
  {
    id: 'mdf',
    displayName: { en: 'MDF', he: 'MDF' },
    baseColor: hexToLinearRgb('#C8B870'),
    roughness: 0.9,
    metalness: 0,
    normalScale: 0.3,
    aoIntensity: 0.4,
    grainFrequency: 0,
    grainContrast: 0,
    textureAtlasIndex: 6,
  },
  {
    id: 'plywood',
    displayName: { en: 'Plywood', he: 'פנלפלק' },
    baseColor: hexToLinearRgb('#C8B88A'),
    roughness: 0.82,
    metalness: 0,
    normalScale: 0.6,
    aoIntensity: 0.5,
    grainFrequency: 6,
    grainContrast: 0.14,
    textureAtlasIndex: 7,
  },
  {
    id: 'melamine',
    displayName: { en: 'Melamine', he: 'מלמין' },
    baseColor: hexToLinearRgb('#F5F0E8'),
    roughness: 0.3,
    metalness: 0,
    normalScale: 0.1,
    aoIntensity: 0.3,
    grainFrequency: 0,
    grainContrast: 0,
    textureAtlasIndex: -1,
  },
  {
    id: 'solid-wood',
    displayName: { en: 'Solid Wood', he: 'עץ מלא' },
    baseColor: hexToLinearRgb('#B8892A'),
    roughness: 0.7,
    metalness: 0,
    normalScale: 1.3,
    aoIntensity: 0.72,
    grainFrequency: 20,
    grainContrast: 0.25,
    textureAtlasIndex: -1,
  },
];

// ---------------------------------------------------------------------------
// Hardware material catalogue
// ---------------------------------------------------------------------------

const HARDWARE_CATALOGUE: Record<HardwareFinish, PbrMaterial> = {
  chrome: {
    id: 'hardware-chrome',
    displayName: { en: 'Chrome', he: 'כרום' },
    baseColor: { r: 0.88, g: 0.88, b: 0.9 },
    roughness: 0.05,
    metalness: 1,
    normalScale: 0.5,
    aoIntensity: 0.8,
    grainFrequency: 0,
    grainContrast: 0,
    textureAtlasIndex: -1,
  },
  'brushed-steel': {
    id: 'hardware-brushed-steel',
    displayName: { en: 'Brushed Steel', he: 'נירוסטה מוברשת' },
    baseColor: { r: 0.7, g: 0.7, b: 0.73 },
    roughness: 0.42,
    metalness: 1,
    normalScale: 1.5,
    aoIntensity: 0.7,
    grainFrequency: 0,
    grainContrast: 0,
    textureAtlasIndex: -1,
  },
  brass: {
    id: 'hardware-brass',
    displayName: { en: 'Brass', he: 'פליז' },
    baseColor: hexToLinearRgb('#B5952A'),
    roughness: 0.28,
    metalness: 1,
    normalScale: 0.6,
    aoIntensity: 0.75,
    grainFrequency: 0,
    grainContrast: 0,
    textureAtlasIndex: -1,
  },
  'black-matte': {
    id: 'hardware-black-matte',
    displayName: { en: 'Black Matte', he: 'שחור מאט' },
    baseColor: { r: 0.02, g: 0.02, b: 0.02 },
    roughness: 0.85,
    metalness: 1,
    normalScale: 0.4,
    aoIntensity: 0.9,
    grainFrequency: 0,
    grainContrast: 0,
    textureAtlasIndex: -1,
  },
};

// ---------------------------------------------------------------------------
// Edge banding material
// ---------------------------------------------------------------------------

/** PBR definition for ABS / PVC edge banding (matches cabinet face material by default). */
export const EDGE_BANDING_MATERIAL: PbrMaterial = {
  id: 'edge-banding',
  displayName: { en: 'Edge Banding', he: 'פסי ABS' },
  baseColor: hexToLinearRgb('#C8B070'),
  roughness: 0.45,
  metalness: 0,
  normalScale: 0.2,
  aoIntensity: 0.35,
  grainFrequency: 0,
  grainContrast: 0,
  textureAtlasIndex: -1,
} as const;

/** Fallback PBR material used when no match is found in the catalogue. */
export const FALLBACK_PBR_MATERIAL: PbrMaterial = {
  id: 'fallback',
  displayName: { en: 'Default', he: 'ברירת מחדל' },
  baseColor: hexToLinearRgb('#CCBBAA'),
  roughness: 0.75,
  metalness: 0,
  normalScale: 0.5,
  aoIntensity: 0.5,
  grainFrequency: 0,
  grainContrast: 0,
  textureAtlasIndex: -1,
} as const;

// ---------------------------------------------------------------------------
// Lookup API
// ---------------------------------------------------------------------------

/**
 * Look up a wood / panel PBR material by its engine material key.
 * Partial key matching is supported — `'plywood-17'` resolves to `'plywood'`.
 *
 * @param materialKey - Engine `Material.key` value (e.g. `'oak'`, `'plywood-18'`).
 * @returns The matching `PbrMaterial` or `FALLBACK_PBR_MATERIAL` if not found.
 */
export function getPbrMaterial(materialKey: string): PbrMaterial {
  // Exact match first
  const exact = WOOD_CATALOGUE.find((m) => m.id === materialKey);
  if (exact) return exact;
  // Partial prefix match (e.g. 'plywood-18' → 'plywood')
  const prefix = WOOD_CATALOGUE.find((m) => materialKey.startsWith(m.id));
  return prefix ?? FALLBACK_PBR_MATERIAL;
}

/**
 * Return all registered wood / panel PBR materials in catalogue order.
 *
 * @returns Readonly array of all `PbrMaterial` entries.
 */
export function getAllPbrMaterials(): readonly PbrMaterial[] {
  return WOOD_CATALOGUE;
}

/**
 * Return the PBR material for a hardware finish type.
 *
 * @param finish - One of the `HardwareFinish` variants.
 * @returns The corresponding `PbrMaterial`.
 */
export function getHardwarePbrMaterial(finish: HardwareFinish): PbrMaterial {
  return HARDWARE_CATALOGUE[finish];
}

/**
 * Return the complete hardware material catalogue.
 *
 * @returns Record mapping each `HardwareFinish` to its `PbrMaterial`.
 */
export function getAllHardwareFinishes(): Readonly<Record<HardwareFinish, PbrMaterial>> {
  return HARDWARE_CATALOGUE;
}
