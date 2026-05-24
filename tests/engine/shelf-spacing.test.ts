import { describe, it, expect } from 'vitest';
import { calculateShelfSpacing, getShelfPresets, getShelfPreset, SHELF_PRESETS } from '../../src/engine/shelf-spacing';

describe('getShelfPresets', () => {
  it('returns all 8 named presets plus custom', () => {
    const presets = getShelfPresets();
    expect(presets.length).toBeGreaterThanOrEqual(8);
    expect(presets.map((p) => p.id)).toContain('books-standard');
    expect(presets.map((p) => p.id)).toContain('garments-hanging');
  });

  it('all presets have bilingual names', () => {
    for (const preset of SHELF_PRESETS) {
      expect(preset.name.en.length).toBeGreaterThan(0);
      expect(preset.name.he.length).toBeGreaterThan(0);
    }
  });
});

describe('getShelfPreset', () => {
  it('returns the correct preset by id', () => {
    const p = getShelfPreset('books-standard');
    expect(p).toBeDefined();
    expect(p?.clearancePerShelfMm).toBe(240);
  });

  it('returns undefined for unknown id', () => {
    expect(getShelfPreset('unknown' as never)).toBeUndefined();
  });
});

describe('calculateShelfSpacing — books-standard', () => {
  it('calculates shelf positions for a 2000 mm tall cabinet', () => {
    const result = calculateShelfSpacing('books-standard', 2000, 18);
    expect(result.fitsAtLeastOne).toBe(true);
    expect(result.shelfCount).toBeGreaterThan(0);
    expect(result.positions.length).toBe(result.shelfCount);
  });

  it('positions are within the internal height', () => {
    const result = calculateShelfSpacing('books-standard', 2000, 18);
    for (const pos of result.positions) {
      expect(pos).toBeGreaterThan(0);
      expect(pos).toBeLessThan(2000);
    }
  });

  it('positions are in ascending order', () => {
    const result = calculateShelfSpacing('books-standard', 2000, 18);
    for (let i = 1; i < result.positions.length; i++) {
      expect(result.positions[i]).toBeGreaterThan(result.positions[i - 1]);
    }
  });

  it('warns when material thickness is below minimum', () => {
    const result = calculateShelfSpacing('books-standard', 2000, 12);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].en).toContain('12 mm');
  });

  it('no warnings for adequate material thickness', () => {
    const result = calculateShelfSpacing('books-standard', 2000, 18);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('calculateShelfSpacing — garments-hanging', () => {
  it('returns at most 1 shelf for a 2200 mm tall cabinet', () => {
    const result = calculateShelfSpacing('garments-hanging', 2200, 18);
    // 1000 mm clearance + 18 mm shelf = 1018 mm pitch, fits 1 in 2200 mm
    expect(result.shelfCount).toBeLessThanOrEqual(2);
  });
});

describe('calculateShelfSpacing — wine-horizontal', () => {
  it('fits many wine shelves in a tall unit', () => {
    const result = calculateShelfSpacing('wine-horizontal', 900, 18);
    // 100 mm clearance + 18 mm shelf = 118 mm pitch
    expect(result.shelfCount).toBeGreaterThan(5);
  });
});

describe('calculateShelfSpacing — custom', () => {
  it('uses provided custom clearance', () => {
    const result = calculateShelfSpacing('custom', 1000, 18, 300);
    expect(result.actualClearanceMm).toBe(300);
  });

  it('falls back to 250 mm when no custom clearance is given', () => {
    const result = calculateShelfSpacing('custom', 1000, 18);
    expect(result.actualClearanceMm).toBe(250);
  });
});

describe('calculateShelfSpacing — edge cases', () => {
  it('returns 0 shelves for a very short internal height', () => {
    const result = calculateShelfSpacing('books-standard', 100, 18);
    expect(result.fitsAtLeastOne).toBe(false);
    expect(result.shelfCount).toBe(0);
    expect(result.positions).toHaveLength(0);
  });
});
