import { describe, it, expect } from 'vitest';
import {
  MATERIALS,
  SAW_KERF,
  getMaterial,
  panelMaterials,
  backMaterials,
  DEFAULT_CONFIG,
  CONSTRAINTS,
} from '../../src/engine/materials';

describe('materials', () => {
  it('has 12 materials total', () => {
    expect(MATERIALS).toHaveLength(12);
  });

  it('has 9 panel materials and 2 back materials', () => {
    expect(panelMaterials()).toHaveLength(9);
    expect(backMaterials()).toHaveLength(2);
  });

  it('SAW_KERF is 4 mm', () => {
    expect(SAW_KERF).toBe(4);
  });

  describe('getMaterial', () => {
    it('returns correct material by key', () => {
      const m = getMaterial('plywood-17');
      expect(m.thickness).toBe(17);
      expect(m.sheetWidth).toBe(1220);
      expect(m.sheetLength).toBe(2440);
      expect(m.category).toBe('panel');
    });

    it('throws for unknown key', () => {
      expect(() => getMaterial('nonexistent')).toThrow('Unknown material');
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('has valid default dimensions', () => {
      expect(DEFAULT_CONFIG.width).toBe(1000);
      expect(DEFAULT_CONFIG.height).toBe(2000);
      expect(DEFAULT_CONFIG.depth).toBe(600);
    });

    it('defaults within constraints', () => {
      expect(DEFAULT_CONFIG.width).toBeGreaterThanOrEqual(CONSTRAINTS.minWidth);
      expect(DEFAULT_CONFIG.width).toBeLessThanOrEqual(CONSTRAINTS.maxWidth);
      expect(DEFAULT_CONFIG.height).toBeGreaterThanOrEqual(CONSTRAINTS.minHeight);
      expect(DEFAULT_CONFIG.height).toBeLessThanOrEqual(CONSTRAINTS.maxHeight);
      expect(DEFAULT_CONFIG.depth).toBeGreaterThanOrEqual(CONSTRAINTS.minDepth);
      expect(DEFAULT_CONFIG.depth).toBeLessThanOrEqual(CONSTRAINTS.maxDepth);
    });
  });

  describe('all materials have bilingual names', () => {
    for (const m of MATERIALS) {
      it(`${m.key} has en and he names`, () => {
        expect(m.name.en).toBeTruthy();
        expect(m.name.he).toBeTruthy();
      });
    }
  });
});
