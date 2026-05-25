import { describe, it, expect } from 'vitest';
import {
  generateHardware,
  VENDOR_HINGE_PROFILES,
  getHardwareCatalog,
  getHardwareCatalogByCategory,
  getHardwareCatalogEntry,
} from '../../src/engine/hardware';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

// Sprint 10 — Vendor hinge profiles
describe('VENDOR_HINGE_PROFILES catalog', () => {
  it('contains at least 3 profiles (Blum, Hettich, Grass)', () => {
    expect(VENDOR_HINGE_PROFILES.length).toBeGreaterThanOrEqual(3);
  });

  it('all profiles have required fields', () => {
    for (const p of VENDOR_HINGE_PROFILES) {
      expect(p.id).toBeTruthy();
      expect(p.brand).toBeTruthy();
      expect(p.model).toBeTruthy();
      expect(p.name.en).toBeTruthy();
      expect(p.name.he).toBeTruthy();
      expect(p.cupDiameter).toBe(35);
      expect(p.openingAngle).toBeGreaterThanOrEqual(100);
      expect(p.mountingDepth).toBeGreaterThan(0);
      expect(p.minEdgeDistance).toBeGreaterThan(0);
      expect(p.supplierUrl).toMatch(/^https:\/\//);
    }
  });

  it.each([
    ['blum-clip-top-blumotion', 'Blum', true],
    ['hettich-intermat-9936', 'Hettich', false],
    ['grass-tiomos-110', 'Grass', true],
  ])('%s: softCloseIntegrated = %s', (id, _brand, expected) => {
    const profile = VENDOR_HINGE_PROFILES.find((p) => p.id === id);
    expect(profile).toBeDefined();
    expect(profile!.softCloseIntegrated).toBe(expected);
  });
});

describe('generateHardware — hingeProfile selection', () => {
  it.each([
    ['blum-clip-top-blumotion', 'Blum', 'Blum', false],
    ['hettich-intermat-9936', 'Hettich', 'Hettich', true],
  ])('profile %s → hinge uses vendor brand; H13 present = %s', (profile, brand, supplierName, hasH13) => {
    const hw = generateHardware({ ...DEFAULT_CONFIG, hingeProfile: profile });
    const hinge = hw.find((h) => h.id === 'H01');
    expect(hinge!.name.en).toContain(brand);
    expect(hinge!.supplierName).toBe(supplierName);
    expect(hw.some((h) => h.id === 'H13')).toBe(hasH13);
  });

  it('falls back to generic hinge name when hingeProfile is unknown', () => {
    const hinge = generateHardware({ ...DEFAULT_CONFIG, hingeProfile: 'unknown-vendor-xyz' }).find(
      (h) => h.id === 'H01',
    );
    expect(hinge!.name.en).toBe('Euro Hinge 35 mm (110°)');
  });

  it('includes H13 when no hingeProfile is set (generic behaviour)', () => {
    expect(generateHardware(DEFAULT_CONFIG).some((h) => h.id === 'H13')).toBe(true);
  });
});

// ── Phase 13 / Sprint 20 — Vendor hardware catalog JSON ──────────────────────
describe('getHardwareCatalog', () => {
  it('returns a non-empty array', () => {
    expect(getHardwareCatalog().length).toBeGreaterThan(0);
  });

  it('every entry has id, category, brand, model, and bilingual name', () => {
    for (const entry of getHardwareCatalog()) {
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
      expect(['hinge', 'drawer-slide', 'handle', 'shelf-pin', 'cam-lock', 'other']).toContain(entry.category);
      expect(typeof entry.brand).toBe('string');
      expect(typeof entry.model).toBe('string');
      expect(typeof entry.name.en).toBe('string');
      expect(typeof entry.name.he).toBe('string');
    }
  });

  it('catalog contains known Blum CLIP top Blumotion entry', () => {
    const entry = getHardwareCatalog().find((e) => e.id === 'blum-clip-top-blumotion');
    expect(entry).toBeDefined();
    expect(entry!.brand).toBe('Blum');
    expect(entry!.softCloseIntegrated).toBe(true);
  });

  it('catalog contains both hinge and drawer-slide categories', () => {
    const categories = new Set(getHardwareCatalog().map((e) => e.category));
    expect(categories.has('hinge')).toBe(true);
    expect(categories.has('drawer-slide')).toBe(true);
  });

  it('all ids are unique', () => {
    const ids = getHardwareCatalog().map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getHardwareCatalogByCategory', () => {
  it.each(['hinge', 'drawer-slide'] as const)('returns only %s entries for that category', (cat) => {
    const items = getHardwareCatalogByCategory(cat);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.category).toBe(cat);
    }
  });

  it('returns array for unknown category', () => {
    expect(Array.isArray(getHardwareCatalogByCategory('other'))).toBe(true);
  });
});

describe('getHardwareCatalogEntry', () => {
  it('returns entry for known id', () => {
    const entry = getHardwareCatalogEntry('grass-tiomos-110');
    expect(entry).toBeDefined();
    expect(entry!.brand).toBe('Grass');
  });

  it('returns undefined for unknown id', () => {
    expect(getHardwareCatalogEntry('nonexistent-id-999')).toBeUndefined();
  });
});

describe('VENDOR_HINGE_PROFILES derived from catalog', () => {
  it('includes all three original hinge profiles', () => {
    const ids = VENDOR_HINGE_PROFILES.map((p) => p.id);
    expect(ids).toContain('blum-clip-top-blumotion');
    expect(ids).toContain('hettich-intermat-9936');
    expect(ids).toContain('grass-tiomos-110');
  });

  it('all profiles have required VendorHingeProfile fields', () => {
    for (const p of VENDOR_HINGE_PROFILES) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.cupDiameter).toBe('number');
      expect(typeof p.openingAngle).toBe('number');
      expect(typeof p.mountingDepth).toBe('number');
      expect(typeof p.softCloseIntegrated).toBe('boolean');
      expect(typeof p.minEdgeDistance).toBe('number');
      expect(typeof p.supplierUrl).toBe('string');
    }
  });
});
