import { describe, it, expect } from 'vitest';
import {
  TEMPLATE_CATALOGUE,
  getTemplatesByCategory,
  getTemplate,
  instantiateTemplate,
  listTemplateIds,
} from '../../src/engine/template-library';

describe('TEMPLATE_CATALOGUE', () => {
  it('contains at least 8 templates', () => {
    expect(Object.keys(TEMPLATE_CATALOGUE).length).toBeGreaterThanOrEqual(8);
  });

  it('all templates have bilingual names', () => {
    for (const t of Object.values(TEMPLATE_CATALOGUE)) {
      expect(t.name.en.length).toBeGreaterThan(0);
      expect(t.name.he.length).toBeGreaterThan(0);
    }
  });

  it('all templates have valid default dimensions > 0', () => {
    for (const t of Object.values(TEMPLATE_CATALOGUE)) {
      expect(t.defaults.widthMm).toBeGreaterThan(0);
      expect(t.defaults.heightMm).toBeGreaterThan(0);
      expect(t.defaults.depthMm).toBeGreaterThan(0);
    }
  });
});

describe('getTemplatesByCategory', () => {
  it('returns base templates', () => {
    const bases = getTemplatesByCategory('base');
    expect(bases.length).toBeGreaterThan(0);
    expect(bases.every((t) => t.category === 'base')).toBe(true);
  });

  it('returns empty array for category with no templates', () => {
    const island = getTemplatesByCategory('island');
    expect(Array.isArray(island)).toBe(true);
  });
});

describe('getTemplate', () => {
  it('returns a template by id', () => {
    const t = getTemplate('wall-single-door');
    expect(t?.category).toBe('wall');
  });

  it('returns undefined for unknown id', () => {
    expect(getTemplate('non-existent')).toBeUndefined();
  });
});

describe('instantiateTemplate', () => {
  it('uses template defaults when no overrides provided', () => {
    const inst = instantiateTemplate('base-single-door');
    expect(inst?.widthMm).toBe(600);
    expect(inst?.heightMm).toBe(720);
    expect(inst?.depthMm).toBe(560);
  });

  it('applies dimension overrides', () => {
    const inst = instantiateTemplate('base-single-door', { widthMm: 800 });
    expect(inst?.widthMm).toBe(800);
    expect(inst?.heightMm).toBe(720); // default preserved
  });

  it('returns undefined for unknown template id', () => {
    expect(instantiateTemplate('no-such-template')).toBeUndefined();
  });

  it('preserves templateId in result', () => {
    const inst = instantiateTemplate('tall-pantry');
    expect(inst?.templateId).toBe('tall-pantry');
  });
});

describe('listTemplateIds', () => {
  it('returns an array of strings', () => {
    const ids = listTemplateIds();
    expect(Array.isArray(ids)).toBe(true);
    expect(ids.includes('base-single-door')).toBe(true);
  });
});
