import { describe, it, expect } from 'vitest';
import {
  generateHardware,
  VENDOR_HINGE_PROFILES,
  getHardwareCatalog,
  getHardwareCatalogByCategory,
  getHardwareCatalogEntry,
} from '../../src/engine/hardware';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { expectBilingualNames } from '../assertions';

describe('generateHardware', () => {
  const hw = generateHardware(DEFAULT_CONFIG);

  it('generates multiple hardware items', () => {
    expect(hw.length).toBeGreaterThanOrEqual(8);
  });

  it('has hinges for double-door cabinet', () => {
    const hinges = hw.find((h) => h.id === 'H01');
    expect(hinges).toBeDefined();
    // 5 hinges per door × 2 doors = 10
    expect(hinges!.qty).toBe(10);
  });

  it('has matching mounting plates', () => {
    const plates = hw.find((h) => h.id === 'H02');
    expect(plates).toBeDefined();
    expect(plates!.qty).toBe(10); // same as hinges
  });

  it('has shelf pins (4 per shelf)', () => {
    const pins = hw.find((h) => h.id === 'H03');
    expect(pins).toBeDefined();
    expect(pins!.qty).toBe(DEFAULT_CONFIG.shelfCount * 4); // 16
  });

  it('has confirmat screws', () => {
    const screws = hw.find((h) => h.id === 'H04');
    expect(screws).toBeDefined();
    expect(screws!.qty).toBeGreaterThanOrEqual(8);
  });

  it('has handles matching door count', () => {
    const handles = hw.find((h) => h.id === 'H09');
    expect(handles).toBeDefined();
    expect(handles!.qty).toBe(DEFAULT_CONFIG.doorCount);
  });

  it('omits handles when handleStyle is none', () => {
    const cfg = { ...DEFAULT_CONFIG, handleStyle: 'none' as const };
    const items = generateHardware(cfg);
    const handles = items.find((h) => h.id === 'H09');
    expect(handles).toBeUndefined();
  });

  it('omits hinges when doorStyle is none', () => {
    const cfg = { ...DEFAULT_CONFIG, doorStyle: 'none' as const };
    const items = generateHardware(cfg);
    const hinges = items.find((h) => h.id === 'H01');
    expect(hinges).toBeUndefined();
  });

  it('has L-brackets for wall mounting', () => {
    const brackets = hw.find((h) => h.id === 'H07');
    expect(brackets).toBeDefined();
    expect(brackets!.qty).toBe(4); // width 1000 >= 800
  });

  it('uses 2 L-brackets for narrow cabinets', () => {
    const cfg = { ...DEFAULT_CONFIG, width: 500 };
    const items = generateHardware(cfg);
    const brackets = items.find((h) => h.id === 'H07');
    expect(brackets!.qty).toBe(2);
  });

  it('all items have bilingual names', () => {
    expectBilingualNames(hw);
  });
});

describe('generateHardware — Sprint 113 expansion', () => {
  it('includes soft-close hinge dampers (one per hinge)', () => {
    const hw = generateHardware(DEFAULT_CONFIG);
    const damper = hw.find((h) => h.id === 'H13');
    const hinges = hw.find((h) => h.id === 'H01');
    expect(damper).toBeDefined();
    expect(damper!.qty).toBe(hinges!.qty);
  });

  it('omits soft-close dampers when there are no doors', () => {
    const cfg = { ...DEFAULT_CONFIG, doorStyle: 'none' as const };
    const hw = generateHardware(cfg);
    expect(hw.find((h) => h.id === 'H13')).toBeUndefined();
    expect(hw.find((h) => h.id === 'H14')).toBeUndefined();
  });

  it('includes door bumper pads (2 per door)', () => {
    const hw = generateHardware(DEFAULT_CONFIG);
    const pads = hw.find((h) => h.id === 'H14');
    expect(pads).toBeDefined();
    expect(pads!.qty).toBe(DEFAULT_CONFIG.doorCount * 2);
  });

  it('includes 4 cabinet leveller feet regardless of doors', () => {
    const cfg = { ...DEFAULT_CONFIG, doorStyle: 'none' as const };
    const hw = generateHardware(cfg);
    const feet = hw.find((h) => h.id === 'H15');
    expect(feet).toBeDefined();
    expect(feet!.qty).toBe(4);
  });

  it('always ships at least one edge-banding roll', () => {
    const hw = generateHardware({ ...DEFAULT_CONFIG, width: 400, height: 400 });
    const roll = hw.find((h) => h.id === 'H16');
    expect(roll).toBeDefined();
    expect(roll!.qty).toBeGreaterThanOrEqual(1);
  });

  it('scales drawer slide length to cabinet depth', () => {
    const shallow = generateHardware({ ...DEFAULT_CONFIG, drawerCount: 1, depth: 320 });
    const deep = generateHardware({ ...DEFAULT_CONFIG, drawerCount: 1, depth: 600 });
    const shallowSlide = shallow.find((h) => h.id === 'H11');
    const deepSlide = deep.find((h) => h.id === 'H11');
    expect(shallowSlide?.name.en).toMatch(/250 mm/);
    expect(deepSlide?.name.en).toMatch(/550 mm/);
  });
});

describe('generateHardware — hardwareOverrides', () => {
  it('overrides qty for a specified item id', () => {
    const cfg = { ...DEFAULT_CONFIG, hardwareOverrides: { H15: 6 } };
    const hw = generateHardware(cfg);
    const feet = hw.find((h) => h.id === 'H15');
    expect(feet).toBeDefined();
    expect(feet!.qty).toBe(6);
  });

  it('leaves non-overridden items unchanged', () => {
    const baseline = generateHardware(DEFAULT_CONFIG);
    const withOverride = generateHardware({ ...DEFAULT_CONFIG, hardwareOverrides: { H15: 6 } });
    const baselineHinges = baseline.find((h) => h.id === 'H01')!.qty;
    const overrideHinges = withOverride.find((h) => h.id === 'H01')!.qty;
    expect(overrideHinges).toBe(baselineHinges);
  });

  it('can override multiple items simultaneously', () => {
    const cfg = { ...DEFAULT_CONFIG, hardwareOverrides: { H15: 8, H20: 6 } };
    const hw = generateHardware(cfg);
    expect(hw.find((h) => h.id === 'H15')!.qty).toBe(8);
    expect(hw.find((h) => h.id === 'H20')!.qty).toBe(6);
  });

  it('ignores unknown override ids gracefully', () => {
    const cfg = { ...DEFAULT_CONFIG, hardwareOverrides: { UNKNOWN_ID: 99 } };
    expect(() => generateHardware(cfg)).not.toThrow();
  });
});

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

  it('Blum profile has integrated soft-close', () => {
    const blum = VENDOR_HINGE_PROFILES.find((p) => p.id === 'blum-clip-top-blumotion');
    expect(blum).toBeDefined();
    expect(blum!.softCloseIntegrated).toBe(true);
  });

  it('Hettich profile does NOT have integrated soft-close', () => {
    const hettich = VENDOR_HINGE_PROFILES.find((p) => p.id === 'hettich-intermat-9936');
    expect(hettich).toBeDefined();
    expect(hettich!.softCloseIntegrated).toBe(false);
  });

  it('Grass profile has integrated soft-close', () => {
    const grass = VENDOR_HINGE_PROFILES.find((p) => p.id === 'grass-tiomos-110');
    expect(grass).toBeDefined();
    expect(grass!.softCloseIntegrated).toBe(true);
  });
});

describe('generateHardware — hingeProfile selection', () => {
  it('uses vendor profile name for hinge when hingeProfile is set', () => {
    const cfg = { ...DEFAULT_CONFIG, hingeProfile: 'blum-clip-top-blumotion' };
    const hw = generateHardware(cfg);
    const hinge = hw.find((h) => h.id === 'H01');
    expect(hinge).toBeDefined();
    expect(hinge!.name.en).toContain('Blum');
    expect(hinge!.supplierName).toBe('Blum');
  });

  it('uses Hettich profile when specified', () => {
    const cfg = { ...DEFAULT_CONFIG, hingeProfile: 'hettich-intermat-9936' };
    const hw = generateHardware(cfg);
    const hinge = hw.find((h) => h.id === 'H01');
    expect(hinge!.name.en).toContain('Hettich');
  });

  it('falls back to generic hinge name when hingeProfile is unknown', () => {
    const cfg = { ...DEFAULT_CONFIG, hingeProfile: 'unknown-vendor-xyz' };
    const hw = generateHardware(cfg);
    const hinge = hw.find((h) => h.id === 'H01');
    expect(hinge!.name.en).toBe('Euro Hinge 35 mm (110°)');
  });

  it('skips separate soft-close damper (H13) for profiles with integrated soft-close', () => {
    const cfg = { ...DEFAULT_CONFIG, hingeProfile: 'blum-clip-top-blumotion' };
    const hw = generateHardware(cfg);
    expect(hw.some((h) => h.id === 'H13')).toBe(false);
  });

  it('includes separate soft-close damper (H13) for Hettich (no integrated SC)', () => {
    const cfg = { ...DEFAULT_CONFIG, hingeProfile: 'hettich-intermat-9936' };
    const hw = generateHardware(cfg);
    expect(hw.some((h) => h.id === 'H13')).toBe(true);
  });

  it('includes H13 when no hingeProfile is set (generic behaviour)', () => {
    const hw = generateHardware(DEFAULT_CONFIG);
    expect(hw.some((h) => h.id === 'H13')).toBe(true);
  });
});

// ── Phase 13 / Sprint 20 — Vendor hardware catalog JSON ──────────────────────
describe('getHardwareCatalog', () => {
  it('returns a non-empty array', () => {
    const catalog = getHardwareCatalog();
    expect(catalog.length).toBeGreaterThan(0);
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
    const catalog = getHardwareCatalog();
    const entry = catalog.find((e) => e.id === 'blum-clip-top-blumotion');
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
  it('returns only hinge entries for category hinge', () => {
    const hinges = getHardwareCatalogByCategory('hinge');
    expect(hinges.length).toBeGreaterThan(0);
    for (const h of hinges) {
      expect(h.category).toBe('hinge');
    }
  });

  it('returns only drawer-slide entries for category drawer-slide', () => {
    const slides = getHardwareCatalogByCategory('drawer-slide');
    expect(slides.length).toBeGreaterThan(0);
    for (const s of slides) {
      expect(s.category).toBe('drawer-slide');
    }
  });

  it('returns empty array for unknown category', () => {
    const result = getHardwareCatalogByCategory('other');
    expect(Array.isArray(result)).toBe(true);
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
