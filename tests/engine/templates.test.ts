import { describe, it, expect } from 'vitest';
import {
  getTemplateDefaults,
  TEMPLATES,
  getTemplate,
  evaluateTemplateExpr,
  instantiateTemplate,
} from '../../src/engine/templates';
import { generateParts } from '../../src/engine/parts';
import type { FurnitureType } from '../../src/engine/types';

describe('getTemplateDefaults', () => {
  const allTypes: FurnitureType[] = ['cabinet', 'bookshelf', 'desk', 'wardrobe', 'panel'];

  it('returns an object with furnitureType matching the requested type', () => {
    for (const type of allTypes) {
      const defaults = getTemplateDefaults(type);
      expect(defaults.furnitureType).toBe(type);
    }
  });

  it('cabinet defaults have expected shape', () => {
    const d = getTemplateDefaults('cabinet');
    expect(d.width).toBe(600);
    expect(d.height).toBe(800);
    expect(d.depth).toBe(500);
    expect(d.shelfCount).toBe(2);
    expect(d.doorStyle).toBe('flat');
    expect(d.kickHeight).toBe(100);
  });

  it('bookshelf defaults have doorStyle=none and positive shelfCount', () => {
    const d = getTemplateDefaults('bookshelf');
    expect(d.doorStyle).toBe('none');
    expect(d.shelfCount ?? 0).toBeGreaterThan(0);
    expect(d.kickHeight).toBe(0);
  });

  it('desk defaults have height ~750mm and low kickHeight', () => {
    const d = getTemplateDefaults('desk');
    expect(d.height).toBe(750);
    expect(d.kickHeight).toBe(0);
    expect(d.doorStyle).toBe('none');
  });

  it('wardrobe defaults have height >= 2000mm and doorStyle=flat', () => {
    const d = getTemplateDefaults('wardrobe');
    expect(d.height ?? 0).toBeGreaterThanOrEqual(2000);
    expect(d.doorStyle).toBe('flat');
  });

  it('panel defaults have depth=18 and doorStyle=none', () => {
    const d = getTemplateDefaults('panel');
    expect(d.depth).toBe(18);
    expect(d.doorStyle).toBe('none');
    expect(d.kickHeight).toBe(0);
  });

  it('returns a new object each call (no shared reference)', () => {
    const a = getTemplateDefaults('cabinet');
    const b = getTemplateDefaults('cabinet');
    expect(a).not.toBe(b);
  });

  it('does not include carcassMaterial (material selection is independent)', () => {
    for (const type of allTypes) {
      const d = getTemplateDefaults(type);
      // Material keys should not be forced by type defaults
      expect(d.carcassMaterial).toBeUndefined();
    }
  });
});

describe('TEMPLATES', () => {
  it('has at least 8 templates', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(8);
  });

  it('all templates have bilingual name and description', () => {
    for (const tpl of TEMPLATES) {
      expect(typeof tpl.name.en).toBe('string');
      expect(tpl.name.en.length).toBeGreaterThan(0);
      expect(typeof tpl.name.he).toBe('string');
      expect(tpl.name.he.length).toBeGreaterThan(0);
      expect(typeof tpl.description.en).toBe('string');
      expect(typeof tpl.description.he).toBe('string');
    }
  });

  it('all template ids are unique', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getTemplate returns undefined for unknown id', () => {
    expect(getTemplate('nonexistent-id-xyz')).toBeUndefined();
  });

  it('getTemplate finds a known template by id', () => {
    const t = getTemplate('kitchen-base');
    expect(t).toBeDefined();
    expect(t?.name.en).toBe('Kitchen Base Unit');
  });

  // ── Sprint 176: new templates ──────────────────────────────────────────────

  it('has a wine-rack template', () => {
    const t = getTemplate('wine-rack');
    expect(t).toBeDefined();
    expect(t?.config.furnitureType).toBe('bookshelf');
    expect(t?.config.hasBack).toBe(false);
    expect(t?.config.doorStyle).toBe('none');
  });

  it('has a corner-cabinet-blind template', () => {
    const t = getTemplate('corner-cabinet-blind');
    expect(t).toBeDefined();
    expect(t?.config.furnitureType).toBe('cabinet');
    expect(t?.config.width).toBe(900);
    expect(t?.config.kickHeight).toBe(100);
  });

  it('has a bathroom-vanity-wall template', () => {
    const t = getTemplate('bathroom-vanity-wall');
    expect(t).toBeDefined();
    expect(t?.config.furnitureType).toBe('cabinet');
    expect(t?.config.kickHeight).toBe(0); // wall-mounted, no kick
    expect(t?.config.depth).toBeLessThanOrEqual(250);
  });

  it('all templates now number at least 15', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(15);
  });
});

describe('TEMPLATES — Sprint 47 additions', () => {
  it('has a pantry template', () => {
    const t = getTemplate('pantry');
    expect(t).toBeDefined();
    expect(t?.config.furnitureType).toBe('cabinet');
    expect(t?.config.shelfCount).toBeGreaterThanOrEqual(5);
    expect(t?.config.height).toBeGreaterThanOrEqual(1800);
  });

  it('pantry template generates non-zero parts', () => {
    const t = getTemplate('pantry')!;
    // Override the back panel to a valid test material
    const parts = generateParts({ ...t.config, backPanelMaterial: 'mdf-3' });
    expect(parts.length).toBeGreaterThan(0);
  });

  it('bathroom-vanity template config is valid', () => {
    const t = getTemplate('bathroom-vanity');
    expect(t).toBeDefined();
    expect(t?.config.drawerSlideType).toBe('soft-close');
    expect(t?.config.kickHeight).toBe(80);
  });

  it('tv-unit template is wide and low', () => {
    const t = getTemplate('tv-unit');
    expect(t).toBeDefined();
    expect(t?.config.width).toBeGreaterThanOrEqual(1600);
    expect(t?.config.height).toBeLessThanOrEqual(600);
    expect(t?.config.doorStyle).toBe('glass');
  });

  it('pantry name is bilingual', () => {
    const t = getTemplate('pantry')!;
    expect(t.name.en).toBeTruthy();
    expect(t.name.he).toBeTruthy();
  });

  it('pantry description has mm dimensions', () => {
    const t = getTemplate('pantry')!;
    expect(t.description.en).toMatch(/\d+×\d+/);
  });

  it('all templates now number at least 16', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(16);
  });
});

// ── Phase 13 / Sprint 4 — Parametric templates v2 tests ───────────────────────

describe('evaluateTemplateExpr', () => {
  it('evaluates simple addition', () => {
    expect(evaluateTemplateExpr('2 + 3', {})).toBe(5);
  });

  it('evaluates subtraction', () => {
    expect(evaluateTemplateExpr('10 - 4', {})).toBe(6);
  });

  it('evaluates multiplication', () => {
    expect(evaluateTemplateExpr('3 * 4', {})).toBe(12);
  });

  it('evaluates division', () => {
    expect(evaluateTemplateExpr('10 / 4', {})).toBe(2.5);
  });

  it('respects operator precedence (* before +)', () => {
    expect(evaluateTemplateExpr('2 + 3 * 4', {})).toBe(14);
  });

  it('respects parentheses', () => {
    expect(evaluateTemplateExpr('(2 + 3) * 4', {})).toBe(20);
  });

  it('supports unary minus', () => {
    expect(evaluateTemplateExpr('-5', {})).toBe(-5);
  });

  it('resolves variables from context', () => {
    expect(evaluateTemplateExpr('height - kickHeight', { height: 800, kickHeight: 100 })).toBe(700);
  });

  it('evaluates Math.floor', () => {
    expect(evaluateTemplateExpr('Math.floor(internalHeight / 350)', { internalHeight: 1064 })).toBe(3);
  });

  it('evaluates Math.ceil', () => {
    expect(evaluateTemplateExpr('Math.ceil(1.1)', {})).toBe(2);
  });

  it('evaluates Math.round', () => {
    expect(evaluateTemplateExpr('Math.round(2.5)', {})).toBe(3);
  });

  it('evaluates Math.min with two args', () => {
    expect(evaluateTemplateExpr('Math.min(10, 3)', {})).toBe(3);
  });

  it('evaluates Math.max with two args', () => {
    expect(evaluateTemplateExpr('Math.max(10, 3)', {})).toBe(10);
  });

  it('evaluates Math.abs of negative', () => {
    expect(evaluateTemplateExpr('Math.abs(-7)', {})).toBe(7);
  });

  it('evaluates Math.trunc', () => {
    expect(evaluateTemplateExpr('Math.trunc(3.9)', {})).toBe(3);
  });

  it('handles complex nested expression', () => {
    const ctx = { height: 2100, kickHeight: 100 };
    // Math.floor((2100 - 100 - 36) / 350) = floor(1964 / 350) = floor(5.61) = 5
    const result = evaluateTemplateExpr('Math.floor((height - kickHeight - 36) / 350)', ctx);
    expect(result).toBe(5);
  });

  it('throws on unknown variable', () => {
    expect(() => evaluateTemplateExpr('foo + 1', {})).toThrow(/unknown variable/i);
  });

  it('throws on disallowed Math function', () => {
    expect(() => evaluateTemplateExpr('Math.random()', {})).toThrow(/not permitted/i);
  });

  it('throws on trailing tokens', () => {
    expect(() => evaluateTemplateExpr('1 + 2 @', {})).toThrow();
  });
});

describe('instantiateTemplate — proportional-bookcase', () => {
  const tpl = getTemplate('proportional-bookcase')!;

  it('exists in TEMPLATES', () => {
    expect(tpl).toBeDefined();
  });

  it('has computedFields for shelfCount', () => {
    expect(tpl.computedFields?.shelfCount).toBeTruthy();
  });

  it('default height produces shelfCount = floor(internalHeight / 350)', () => {
    const cfg = instantiateTemplate(tpl);
    const expectedInternalHeight = tpl.config.height - (tpl.config.kickHeight ?? 0) - 36;
    const expectedShelfCount = Math.floor(expectedInternalHeight / 350);
    expect(cfg.shelfCount).toBe(expectedShelfCount);
  });

  it('taller bookcase gets more shelves', () => {
    const shortCfg = instantiateTemplate(tpl, { height: 1400 });
    const tallCfg = instantiateTemplate(tpl, { height: 2800 });
    expect(tallCfg.shelfCount).toBeGreaterThan(shortCfg.shelfCount);
  });

  it('applies sizeOverrides before computing fields', () => {
    const cfg = instantiateTemplate(tpl, { height: 1050, kickHeight: 0 });
    // internalHeight = 1050 - 0 - 36 = 1014; floor(1014/350) = 2
    expect(cfg.shelfCount).toBe(2);
    expect(cfg.height).toBe(1050);
  });

  it('templates without computedFields return base config unchanged', () => {
    const plain = getTemplate('kitchen-base')!;
    const cfg = instantiateTemplate(plain);
    expect(cfg).toEqual(plain.config);
  });
});
