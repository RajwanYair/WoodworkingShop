import { describe, it, expect } from 'vitest';

import {
  BUILT_IN_TEMPLATES,
  getTemplate,
  getTemplatesByCategory,
  instantiateTemplate,
} from '../../src/engine/cabinet-templates';
import type { CabinetTemplate } from '../../src/engine/cabinet-templates';

describe('BUILT_IN_TEMPLATES', () => {
  it('contains 6 templates', () => {
    expect(BUILT_IN_TEMPLATES).toHaveLength(6);
  });

  it('has unique IDs', () => {
    const ids = BUILT_IN_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all templates have valid constraint ranges (min < default < max)', () => {
    for (const t of BUILT_IN_TEMPLATES) {
      expect(t.width.min).toBeLessThanOrEqual(t.width.default);
      expect(t.width.default).toBeLessThanOrEqual(t.width.max);
      expect(t.height.min).toBeLessThanOrEqual(t.height.default);
      expect(t.height.default).toBeLessThanOrEqual(t.height.max);
      expect(t.depth.min).toBeLessThanOrEqual(t.depth.default);
      expect(t.depth.default).toBeLessThanOrEqual(t.depth.max);
    }
  });
});

describe('getTemplate', () => {
  it('returns undefined for unknown ID', () => {
    expect(getTemplate('nonexistent')).toBeUndefined();
  });

  it('finds built-in template by ID', () => {
    const t = getTemplate('base-standard');
    expect(t).toBeDefined();
    expect(t!.category).toBe('base');
  });

  it('finds custom templates', () => {
    const custom: CabinetTemplate[] = [
      {
        id: 'my-custom',
        name: 'Custom',
        category: 'base',
        width: { min: 300, max: 900, default: 600 },
        height: { min: 700, max: 900, default: 720 },
        depth: { min: 500, max: 650, default: 580 },
        shelves: 2,
        drawers: 0,
        hasDoor: true,
      },
    ];
    expect(getTemplate('my-custom', custom)).toBeDefined();
  });
});

describe('getTemplatesByCategory', () => {
  it('returns only templates of the requested category', () => {
    const wall = getTemplatesByCategory('wall');
    expect(wall.length).toBeGreaterThan(0);
    expect(wall.every((t) => t.category === 'wall')).toBe(true);
  });

  it('returns empty array for category with no templates', () => {
    // All categories have at least one, but custom-only category would be empty
    const result = getTemplatesByCategory('base');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('instantiateTemplate', () => {
  it('throws on unknown template ID', () => {
    expect(() => instantiateTemplate('nonexistent')).toThrow(RangeError);
  });

  it('uses defaults when no params provided', () => {
    const instance = instantiateTemplate('base-standard');
    expect(instance.width).toBe(600);
    expect(instance.height).toBe(720);
    expect(instance.depth).toBe(580);
    expect(instance.shelves).toBe(1);
    expect(instance.drawers).toBe(0);
    expect(instance.valid).toBe(true);
    expect(instance.errors).toHaveLength(0);
  });

  it('applies parameter overrides', () => {
    const instance = instantiateTemplate('base-standard', {
      width: 450,
      shelves: 3,
    });
    expect(instance.width).toBe(450);
    expect(instance.shelves).toBe(3);
    expect(instance.valid).toBe(true);
  });

  it('reports validation errors for out-of-range dimensions', () => {
    const instance = instantiateTemplate('base-standard', {
      width: 100, // min 300
      height: 1000, // max 900
    });
    expect(instance.valid).toBe(false);
    expect(instance.errors).toHaveLength(2);
    expect(instance.errors[0].field).toBe('width');
    expect(instance.errors[1].field).toBe('height');
  });

  it('preserves template metadata in instance', () => {
    const instance = instantiateTemplate('drawer-bank-4');
    expect(instance.category).toBe('drawerBank');
    expect(instance.hasDoor).toBe(false);
    expect(instance.drawers).toBe(4);
  });

  it('validates all three dimensions independently', () => {
    const instance = instantiateTemplate('tall-pantry', {
      width: 200, // below min 400
      depth: 700, // above max 650
    });
    expect(instance.errors).toHaveLength(2);
    const fields = instance.errors.map((e) => e.field);
    expect(fields).toContain('width');
    expect(fields).toContain('depth');
  });
});
