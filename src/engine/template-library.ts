/**
 * Sprint 46 — Template library engine.
 *
 * Provides a catalogue of pre-built cabinet configurations.  Each template
 * defines a canonical name, category, default dimensions, and material hints.
 * The engine also exposes helpers to instantiate a template into a concrete
 * configuration object and to filter templates by category.
 *
 * Templates are keyed by a stable slug (e.g. `base-single-door`).
 *
 * Pure function — no React, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type TemplateCategory = 'base' | 'wall' | 'tall' | 'island' | 'corner' | 'open-shelf';

export interface TemplateDimensions {
  widthMm: number;
  heightMm: number;
  depthMm: number;
}

export interface CabinetTemplate {
  id: string;
  name: { en: string; he: string };
  category: TemplateCategory;
  description: { en: string; he: string };
  defaults: TemplateDimensions;
  /** Typical material thickness for this template (mm). */
  materialThicknessMm: number;
  /** Number of doors (0 = open). */
  doors: number;
  /** Number of drawers. */
  drawers: number;
  /** Number of adjustable shelves. */
  shelves: number;
  /** Whether the template includes a back panel. */
  hasBack: boolean;
}

export interface TemplateInstance {
  templateId: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
}

// ─── Catalogue ────────────────────────────────────────────────────────────────

export const TEMPLATE_CATALOGUE: Record<string, CabinetTemplate> = {
  'base-single-door': {
    id: 'base-single-door',
    name: { en: 'Base — Single door', he: 'בסיס — דלת אחת' },
    category: 'base',
    description: {
      en: 'Standard base cabinet with one door and one shelf.',
      he: 'ארון בסיס סטנדרטי עם דלת אחת ומדף אחד.',
    },
    defaults: { widthMm: 600, heightMm: 720, depthMm: 560 },
    materialThicknessMm: 18,
    doors: 1,
    drawers: 0,
    shelves: 1,
    hasBack: true,
  },
  'base-double-door': {
    id: 'base-double-door',
    name: { en: 'Base — Double door', he: 'בסיס — שתי דלתות' },
    category: 'base',
    description: {
      en: 'Wide base cabinet with two doors and one shelf.',
      he: 'ארון בסיס רחב עם שתי דלתות ומדף אחד.',
    },
    defaults: { widthMm: 900, heightMm: 720, depthMm: 560 },
    materialThicknessMm: 18,
    doors: 2,
    drawers: 0,
    shelves: 1,
    hasBack: true,
  },
  'base-drawer-unit': {
    id: 'base-drawer-unit',
    name: { en: 'Base — Drawer unit', he: 'בסיס — יחידת מגירות' },
    category: 'base',
    description: {
      en: 'Base cabinet with four drawers, no door.',
      he: 'ארון בסיס עם ארבע מגירות, ללא דלת.',
    },
    defaults: { widthMm: 450, heightMm: 720, depthMm: 560 },
    materialThicknessMm: 18,
    doors: 0,
    drawers: 4,
    shelves: 0,
    hasBack: true,
  },
  'wall-single-door': {
    id: 'wall-single-door',
    name: { en: 'Wall — Single door', he: 'קיר — דלת אחת' },
    category: 'wall',
    description: {
      en: 'Standard wall cabinet with one door.',
      he: 'ארון קיר סטנדרטי עם דלת אחת.',
    },
    defaults: { widthMm: 600, heightMm: 720, depthMm: 320 },
    materialThicknessMm: 18,
    doors: 1,
    drawers: 0,
    shelves: 2,
    hasBack: true,
  },
  'wall-double-door': {
    id: 'wall-double-door',
    name: { en: 'Wall — Double door', he: 'קיר — שתי דלתות' },
    category: 'wall',
    description: {
      en: 'Wide wall cabinet with two doors.',
      he: 'ארון קיר רחב עם שתי דלתות.',
    },
    defaults: { widthMm: 900, heightMm: 720, depthMm: 320 },
    materialThicknessMm: 18,
    doors: 2,
    drawers: 0,
    shelves: 2,
    hasBack: true,
  },
  'tall-pantry': {
    id: 'tall-pantry',
    name: { en: 'Tall — Pantry', he: 'גבוה — מזווה' },
    category: 'tall',
    description: {
      en: 'Full-height pantry cabinet with two doors and five shelves.',
      he: 'ארון מזווה גובה מלא עם שתי דלתות וחמישה מדפים.',
    },
    defaults: { widthMm: 600, heightMm: 2200, depthMm: 560 },
    materialThicknessMm: 18,
    doors: 2,
    drawers: 0,
    shelves: 5,
    hasBack: true,
  },
  'open-shelf-unit': {
    id: 'open-shelf-unit',
    name: { en: 'Open shelf unit', he: 'יחידת מדפים פתוחה' },
    category: 'open-shelf',
    description: {
      en: 'Open shelf unit with four shelves, no doors.',
      he: 'יחידת מדפים פתוחה עם ארבעה מדפים, ללא דלתות.',
    },
    defaults: { widthMm: 600, heightMm: 1200, depthMm: 300 },
    materialThicknessMm: 18,
    doors: 0,
    drawers: 0,
    shelves: 4,
    hasBack: false,
  },
  'corner-l-base': {
    id: 'corner-l-base',
    name: { en: 'Corner — L-shaped base', he: 'פינה — בסיס צורת L' },
    category: 'corner',
    description: {
      en: 'L-shaped corner base cabinet with lazy-Susan mounting.',
      he: 'ארון בסיס פינה צורת L עם עגלה מסתובבת.',
    },
    defaults: { widthMm: 900, heightMm: 720, depthMm: 900 },
    materialThicknessMm: 18,
    doors: 1,
    drawers: 0,
    shelves: 1,
    hasBack: false,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return all templates for a given category. */
export function getTemplatesByCategory(category: TemplateCategory): CabinetTemplate[] {
  return Object.values(TEMPLATE_CATALOGUE).filter((t) => t.category === category);
}

/** Return a template by id. */
export function getTemplate(id: string): CabinetTemplate | undefined {
  return TEMPLATE_CATALOGUE[id];
}

/**
 * Instantiate a template, optionally overriding dimensions.
 * Returns a `TemplateInstance` with resolved dimensions.
 */
export function instantiateTemplate(
  templateId: string,
  overrides?: Partial<TemplateDimensions>,
): TemplateInstance | undefined {
  const tpl = TEMPLATE_CATALOGUE[templateId];
  if (!tpl) return undefined;
  return {
    templateId,
    widthMm: overrides?.widthMm ?? tpl.defaults.widthMm,
    heightMm: overrides?.heightMm ?? tpl.defaults.heightMm,
    depthMm: overrides?.depthMm ?? tpl.defaults.depthMm,
  };
}

/** Return all template ids. */
export function listTemplateIds(): string[] {
  return Object.keys(TEMPLATE_CATALOGUE);
}
