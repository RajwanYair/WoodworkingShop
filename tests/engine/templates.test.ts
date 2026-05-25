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

  it('each type returns matching furnitureType and no carcassMaterial', () => {
    for (const type of allTypes) {
      const d = getTemplateDefaults(type);
      expect(d.furnitureType).toBe(type);
      expect(d.carcassMaterial).toBeUndefined();
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
});

describe('TEMPLATES', () => {
  it('has at least 16 templates with unique ids and bilingual names', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(16);
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tpl of TEMPLATES) {
      expect(tpl.name.en.length).toBeGreaterThan(0);
      expect(tpl.name.he.length).toBeGreaterThan(0);
    }
  });

  it('getTemplate: returns undefined for unknown id and finds kitchen-base by id', () => {
    expect(getTemplate('nonexistent-id-xyz')).toBeUndefined();
    const t = getTemplate('kitchen-base');
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
  it('pantry template: valid config, generates parts, bilingual', () => {
    const t = getTemplate('pantry')!;
    expect(t.config.furnitureType).toBe('cabinet');
    expect(t.config.shelfCount).toBeGreaterThanOrEqual(5);
    expect(t.config.height).toBeGreaterThanOrEqual(1800);
    expect(generateParts({ ...t.config, backPanelMaterial: 'mdf-3' }).length).toBeGreaterThan(0);
    expect(t.name.en).toBeTruthy();
    expect(t.name.he).toBeTruthy();
    expect(t.description.en).toMatch(/\d+×\d+/);
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
});

// ── Phase 13 / Sprint 4 — Parametric templates v2 tests ───────────────────────

describe('evaluateTemplateExpr', () => {
  it.each<[string, Record<string, number>, number]>([
    ['2 + 3', {}, 5],
    ['10 - 4', {}, 6],
    ['3 * 4', {}, 12],
    ['10 / 4', {}, 2.5],
    ['2 + 3 * 4', {}, 14],
    ['(2 + 3) * 4', {}, 20],
    ['-5', {}, -5],
    ['height - kickHeight', { height: 800, kickHeight: 100 }, 700],
    ['Math.floor(internalHeight / 350)', { internalHeight: 1064 }, 3],
    ['Math.ceil(1.1)', {}, 2],
    ['Math.round(2.5)', {}, 3],
    ['Math.min(10, 3)', {}, 3],
    ['Math.max(10, 3)', {}, 10],
    ['Math.abs(-7)', {}, 7],
    ['Math.trunc(3.9)', {}, 3],
  ])('evaluates %s', (expr, ctx, expected) => {
    expect(evaluateTemplateExpr(expr, ctx)).toBe(expected);
  });

  it('handles complex nested expression', () => {
    // floor((2100 - 100 - 36) / 350) = floor(5.61) = 5
    expect(
      evaluateTemplateExpr('Math.floor((height - kickHeight - 36) / 350)', { height: 2100, kickHeight: 100 }),
    ).toBe(5);
  });

  it.each<[string, Record<string, number>, RegExp | undefined]>([
    ['foo + 1', {}, /unknown variable/i],
    ['Math.random()', {}, /not permitted/i],
    ['1 + 2 @', {}, undefined],
  ])('throws on invalid: %s', (expr, ctx, pattern) => {
    expect(() => evaluateTemplateExpr(expr, ctx)).toThrow(pattern);
  });
});

describe('instantiateTemplate — proportional-bookcase', () => {
  const tpl = getTemplate('proportional-bookcase')!;

  it('exists in TEMPLATES and has computedFields for shelfCount', () => {
    expect(tpl).toBeDefined();
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
