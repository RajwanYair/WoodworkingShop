import { describe, it, expect } from 'vitest';
import {
  getMaterialTexture,
  getMaterialTextureId,
  buildSvgPatternDefs,
  MATERIAL_TEXTURES,
  MATERIAL_TEXTURE_IDS,
} from '../../src/engine/material-textures';

describe('getMaterialTexture', () => {
  it.each(['oak', 'maple', 'walnut', 'pine', 'birch', 'cherry', 'mdf', 'plywood'] as const)(
    'returns a texture object for known id: %s',
    (id) => {
      const tex = getMaterialTexture(id);
      expect(tex).toBeDefined();
      expect(tex!.id).toBe(id);
      expect(typeof tex!.baseColor).toBe('string');
    },
  );

  it('returns undefined for unknown id', () => {
    expect(getMaterialTexture('unknown-material')).toBeUndefined();
  });

  it('all catalog entries have required fields', () => {
    for (const id of MATERIAL_TEXTURE_IDS) {
      const tex = MATERIAL_TEXTURES[id];
      expect(tex.grainColor).toBeTruthy();
      expect(Array.isArray(tex.grainLines)).toBe(true);
      expect(typeof tex.hasGrain).toBe('boolean');
    }
  });

  it('mdf has no grain lines', () => {
    expect(getMaterialTexture('mdf')!.grainLines).toHaveLength(0);
    expect(getMaterialTexture('mdf')!.hasGrain).toBe(false);
  });

  it('oak has grain lines', () => {
    expect(getMaterialTexture('oak')!.grainLines.length).toBeGreaterThan(0);
    expect(getMaterialTexture('oak')!.hasGrain).toBe(true);
  });
});

describe('getMaterialTextureId', () => {
  it.each([
    ['plywood-18', 'plywood'],
    ['plywood-12', 'plywood'],
    ['osb-18', 'plywood'],
    ['mdf-16', 'mdf'],
    ['mdf-25', 'mdf'],
    ['birch-18', 'birch'],
    ['oak-22', 'oak'],
    ['maple-18', 'maple'],
    ['walnut-20', 'walnut'],
    ['pine-18', 'pine'],
    ['cherry-20', 'cherry'],
  ])('maps material key %s → texture id %s', (key, expected) => {
    expect(getMaterialTextureId(key)).toBe(expected);
  });

  it('returns undefined for melamine (no grain texture)', () => {
    expect(getMaterialTextureId('melamine-18')).toBeUndefined();
  });

  it('returns undefined for chipboard (no grain texture)', () => {
    expect(getMaterialTextureId('chipboard-16')).toBeUndefined();
  });

  it('returns undefined for glass (no grain texture)', () => {
    expect(getMaterialTextureId('glass-4')).toBeUndefined();
  });
});

describe('buildSvgPatternDefs', () => {
  it('returns empty string for unknown texture id', () => {
    expect(buildSvgPatternDefs('unknown-tex', 'pat')).toBe('');
  });

  it('returns SVG pattern string for known texture', () => {
    const svg = buildSvgPatternDefs('oak', 'oak-pat');
    expect(svg).toContain('<pattern');
    expect(svg).toContain('oak-pat-top');
    expect(svg).toContain('oak-pat-side');
    expect(svg).toContain('oak-pat-front');
  });

  it('includes baseColor in pattern fill', () => {
    const tex = getMaterialTexture('oak')!;
    const svg = buildSvgPatternDefs('oak', 'p');
    expect(svg).toContain(tex.baseColor);
  });

  it('applies tileScale in patternTransform when scale != 1', () => {
    const svg = buildSvgPatternDefs('maple', 'p', 2);
    expect(svg).toContain('patternTransform="scale(2)"');
  });

  it('omits patternTransform when tileScale is 1', () => {
    const svg = buildSvgPatternDefs('maple', 'p', 1);
    expect(svg).not.toContain('patternTransform');
  });

  it('works for mdf (no grain lines — no stroke elements in pattern)', () => {
    const svg = buildSvgPatternDefs('mdf', 'mdf-p');
    expect(svg).toContain('mdf-p-top');
    // mdf has no grain lines so no <line> elements expected
    expect(svg).not.toContain('<line');
  });
});
