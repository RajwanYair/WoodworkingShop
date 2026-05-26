import { describe, expect, it } from 'vitest';

import {
  blendPbrMaterials,
  EDGE_BANDING_MATERIAL,
  FALLBACK_PBR_MATERIAL,
  getAllHardwareFinishes,
  getAllPbrMaterials,
  getHardwarePbrMaterial,
  getPbrMaterial,
  hexToLinearRgb,
  lerpColor,
} from '../../src/engine/pbr-materials';
import type { HardwareFinish } from '../../src/engine/pbr-materials';

// ---------------------------------------------------------------------------
// hexToLinearRgb
// ---------------------------------------------------------------------------

describe('hexToLinearRgb', () => {
  it('converts pure white #FFFFFF to (1, 1, 1)', () => {
    const c = hexToLinearRgb('#FFFFFF');
    expect(c.r).toBeCloseTo(1, 3);
    expect(c.g).toBeCloseTo(1, 3);
    expect(c.b).toBeCloseTo(1, 3);
  });

  it('converts pure black #000000 to (0, 0, 0)', () => {
    const c = hexToLinearRgb('#000000');
    expect(c.r).toBeCloseTo(0, 5);
    expect(c.g).toBeCloseTo(0, 5);
    expect(c.b).toBeCloseTo(0, 5);
  });

  it('returns values in [0, 1] for any valid hex colour', () => {
    const colours = ['#C8B88A', '#6B4423', '#F5F0E8', '#A0522D'];
    for (const hex of colours) {
      const { r, g, b } = hexToLinearRgb(hex);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
    }
  });

  it.each([
    ['missing hash', 'FFFFFF'],
    ['too short', '#FFF'],
    ['invalid chars', '#GGHHII'],
    ['empty string', ''],
  ])('throws RangeError for invalid hex: %s', (_label, hex) => {
    expect(() => hexToLinearRgb(hex)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// lerpColor
// ---------------------------------------------------------------------------

describe('lerpColor', () => {
  const black = { r: 0, g: 0, b: 0 };
  const white = { r: 1, g: 1, b: 1 };

  it('t=0 returns a unchanged', () => {
    const result = lerpColor(black, white, 0);
    expect(result).toEqual(black);
  });

  it('t=1 returns b unchanged', () => {
    const result = lerpColor(black, white, 1);
    expect(result).toEqual(white);
  });

  it('t=0.5 returns midpoint', () => {
    const result = lerpColor(black, white, 0.5);
    expect(result.r).toBeCloseTo(0.5);
    expect(result.g).toBeCloseTo(0.5);
    expect(result.b).toBeCloseTo(0.5);
  });

  it.each([
    ['t = -0.01', -0.01],
    ['t = 1.01', 1.01],
    ['t = 2', 2],
  ])('throws RangeError when %s', (_label, t) => {
    expect(() => lerpColor(black, white, t)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// blendPbrMaterials
// ---------------------------------------------------------------------------

describe('blendPbrMaterials', () => {
  const oak = getPbrMaterial('oak');
  const mdf = getPbrMaterial('mdf');

  it('t=0 returns material with same numeric fields as a', () => {
    const blended = blendPbrMaterials(oak, mdf, 0);
    expect(blended.roughness).toBeCloseTo(oak.roughness);
    expect(blended.metalness).toBeCloseTo(oak.metalness);
    expect(blended.grainFrequency).toBeCloseTo(oak.grainFrequency);
  });

  it('t=1 returns material with same numeric fields as b', () => {
    const blended = blendPbrMaterials(oak, mdf, 1);
    expect(blended.roughness).toBeCloseTo(mdf.roughness);
    expect(blended.grainFrequency).toBeCloseTo(mdf.grainFrequency);
  });

  it('preserves id and textureAtlasIndex from a', () => {
    const blended = blendPbrMaterials(oak, mdf, 0.5);
    expect(blended.id).toBe(oak.id);
    expect(blended.textureAtlasIndex).toBe(oak.textureAtlasIndex);
  });

  it.each([
    ['t < 0', -0.1],
    ['t > 1', 1.1],
  ])('throws RangeError when %s', (_label, t) => {
    expect(() => blendPbrMaterials(oak, mdf, t)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// getPbrMaterial
// ---------------------------------------------------------------------------

describe('getPbrMaterial', () => {
  it.each([
    ['oak', 'oak'],
    ['maple', 'maple'],
    ['walnut', 'walnut'],
    ['pine', 'pine'],
    ['birch', 'birch'],
    ['cherry', 'cherry'],
    ['mdf', 'mdf'],
    ['plywood', 'plywood'],
  ])('returns material with id=%s for key=%s', (id, key) => {
    const mat = getPbrMaterial(key);
    expect(mat.id).toBe(id);
  });

  it('resolves prefix key plywood-18 to plywood material', () => {
    const mat = getPbrMaterial('plywood-18');
    expect(mat.id).toBe('plywood');
  });

  it('resolves prefix key plywood-17 to plywood material', () => {
    const mat = getPbrMaterial('plywood-17');
    expect(mat.id).toBe('plywood');
  });

  it('returns FALLBACK_PBR_MATERIAL for unknown key', () => {
    const mat = getPbrMaterial('unknown-material-xyz');
    expect(mat.id).toBe(FALLBACK_PBR_MATERIAL.id);
  });

  it('all known wood materials have roughness in [0, 1] and metalness = 0', () => {
    const materials = getAllPbrMaterials();
    for (const mat of materials) {
      expect(mat.roughness).toBeGreaterThanOrEqual(0);
      expect(mat.roughness).toBeLessThanOrEqual(1);
      expect(mat.metalness).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getAllPbrMaterials
// ---------------------------------------------------------------------------

describe('getAllPbrMaterials', () => {
  it('returns at least 8 materials', () => {
    expect(getAllPbrMaterials().length).toBeGreaterThanOrEqual(8);
  });

  it('every material has a non-empty id and display names', () => {
    for (const mat of getAllPbrMaterials()) {
      expect(mat.id.length).toBeGreaterThan(0);
      expect(mat.displayName.en.length).toBeGreaterThan(0);
      expect(mat.displayName.he.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getHardwarePbrMaterial / getAllHardwareFinishes
// ---------------------------------------------------------------------------

describe('getHardwarePbrMaterial', () => {
  const finishes: HardwareFinish[] = ['chrome', 'brushed-steel', 'brass', 'black-matte'];

  it.each(finishes)('returns metalness=1 for %s', (finish) => {
    const mat = getHardwarePbrMaterial(finish);
    expect(mat.metalness).toBe(1);
  });

  it('chrome has very low roughness (mirror-like)', () => {
    expect(getHardwarePbrMaterial('chrome').roughness).toBeLessThan(0.1);
  });

  it('brushed-steel has higher roughness than chrome', () => {
    expect(getHardwarePbrMaterial('brushed-steel').roughness).toBeGreaterThan(
      getHardwarePbrMaterial('chrome').roughness,
    );
  });
});

describe('getAllHardwareFinishes', () => {
  it('contains all four finish keys', () => {
    const catalogue = getAllHardwareFinishes();
    const keys: HardwareFinish[] = ['chrome', 'brushed-steel', 'brass', 'black-matte'];
    for (const key of keys) {
      expect(catalogue[key]).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// EDGE_BANDING_MATERIAL / FALLBACK_PBR_MATERIAL
// ---------------------------------------------------------------------------

describe('EDGE_BANDING_MATERIAL', () => {
  it('is a valid dielectric material (metalness=0)', () => {
    expect(EDGE_BANDING_MATERIAL.metalness).toBe(0);
    expect(EDGE_BANDING_MATERIAL.roughness).toBeGreaterThan(0);
    expect(EDGE_BANDING_MATERIAL.roughness).toBeLessThanOrEqual(1);
  });
});

describe('FALLBACK_PBR_MATERIAL', () => {
  it('has sensible defaults', () => {
    expect(FALLBACK_PBR_MATERIAL.roughness).toBeGreaterThan(0);
    expect(FALLBACK_PBR_MATERIAL.metalness).toBe(0);
    expect(FALLBACK_PBR_MATERIAL.textureAtlasIndex).toBe(-1);
  });
});
