import type { CabinetConfig, FurnitureType } from './types';
import {
  DEFAULT_CONFIG,
  BOOKSHELF_DEFAULTS,
  CABINET_DEFAULTS,
  DESK_DEFAULTS,
  WARDROBE_DEFAULTS,
  PANEL_DEFAULTS,
} from './materials.ts';

export interface CabinetTemplate {
  id: string;
  name: { en: string; he: string };
  description: { en: string; he: string };
  icon: string; // icon component name from Icons.tsx
  config: CabinetConfig;
  /**
   * Optional map of CabinetConfig field name → arithmetic expression string.
   * Evaluated by `instantiateTemplate()` after size overrides are applied.
   * Expressions may reference any numeric CabinetConfig field plus:
   *   - `internalHeight` = height − kickHeight − 36  (approx top+bottom panels)
   *   - `internalWidth`  = width  − 36               (approx left+right sides)
   * Only arithmetic (+−×÷), parentheses, number literals, and
   * Math.{floor|ceil|round|min|max|abs|trunc} are permitted.
   * @example { shelfCount: "Math.floor(internalHeight / 350)" }
   */
  readonly computedFields?: Readonly<Record<string, string>>;
}

// ── Phase 13 / Sprint 4 — Parametric templates v2: DSL evaluator ─────────────
// A hand-rolled recursive-descent parser.  Deliberately avoids eval() and
// Function() to satisfy the OWASP injection constraint.

type _DslToken =
  | { k: 'num'; v: number }
  | { k: 'id'; v: string }
  | { k: 'op'; v: string }
  | { k: 'lp' }
  | { k: 'rp' }
  | { k: 'comma' }
  | { k: 'dot' };

function _tokenize(expr: string): _DslToken[] {
  const toks: _DslToken[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/\d/.test(ch)) {
      let s = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) s += expr[i++];
      toks.push({ k: 'num', v: parseFloat(s) });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let s = '';
      while (i < expr.length && /\w/.test(expr[i])) s += expr[i++];
      toks.push({ k: 'id', v: s });
      continue;
    }
    if ('+-*/'.includes(ch)) { toks.push({ k: 'op', v: ch }); i++; continue; }
    if (ch === '(') { toks.push({ k: 'lp' }); i++; continue; }
    if (ch === ')') { toks.push({ k: 'rp' }); i++; continue; }
    if (ch === ',') { toks.push({ k: 'comma' }); i++; continue; }
    if (ch === '.') { toks.push({ k: 'dot' }); i++; continue; }
    throw new Error(`DSL: unexpected char '${ch}'`);
  }
  return toks;
}

const _MATH_FNS = new Set<string>(['floor', 'ceil', 'round', 'min', 'max', 'abs', 'trunc']);

function _expr(toks: _DslToken[], p: number, ctx: Record<string, number>): [number, number] {
  let [lhs, pos] = _term(toks, p, ctx);
  while (pos < toks.length) {
    const t = toks[pos];
    if (t.k !== 'op' || (t.v !== '+' && t.v !== '-')) break;
    const [rhs, pos2] = _term(toks, pos + 1, ctx);
    lhs = t.v === '+' ? lhs + rhs : lhs - rhs;
    pos = pos2;
  }
  return [lhs, pos];
}

function _term(toks: _DslToken[], p: number, ctx: Record<string, number>): [number, number] {
  let [lhs, pos] = _unary(toks, p, ctx);
  while (pos < toks.length) {
    const t = toks[pos];
    if (t.k !== 'op' || (t.v !== '*' && t.v !== '/')) break;
    const [rhs, pos2] = _unary(toks, pos + 1, ctx);
    lhs = t.v === '*' ? lhs * rhs : lhs / rhs;
    pos = pos2;
  }
  return [lhs, pos];
}

function _unary(toks: _DslToken[], p: number, ctx: Record<string, number>): [number, number] {
  const t = toks[p];
  if (t?.k === 'op' && t.v === '-') {
    const [v, pos] = _primary(toks, p + 1, ctx);
    return [-v, pos];
  }
  return _primary(toks, p, ctx);
}

function _primary(toks: _DslToken[], p: number, ctx: Record<string, number>): [number, number] {
  const t = toks[p];
  if (!t) throw new Error('DSL: unexpected end of expression');
  if (t.k === 'num') return [t.v, p + 1];
  if (t.k === 'lp') {
    const [v, pos] = _expr(toks, p + 1, ctx);
    if (toks[pos]?.k !== 'rp') throw new Error('DSL: expected )');
    return [v, pos + 1];
  }
  if (t.k === 'id') {
    const name = t.v;
    const t1 = toks[p + 1];
    const t2 = toks[p + 2];
    const t3 = toks[p + 3];
    if (name === 'Math' && t1?.k === 'dot' && t2?.k === 'id') {
      const fn = t2.v;
      if (!_MATH_FNS.has(fn)) throw new Error(`DSL: Math.${fn} is not permitted`);
      if (t3?.k !== 'lp') throw new Error(`DSL: expected ( after Math.${fn}`);
      const args: number[] = [];
      let pos = p + 4;
      if (toks[pos]?.k !== 'rp') {
        const [a1, pos1] = _expr(toks, pos, ctx);
        args.push(a1);
        pos = pos1;
        while (toks[pos]?.k === 'comma') {
          const [aN, posN] = _expr(toks, pos + 1, ctx);
          args.push(aN);
          pos = posN;
        }
      }
      if (toks[pos]?.k !== 'rp') throw new Error(`DSL: expected ) after Math.${fn} args`);
      type AllowedFn = 'floor' | 'ceil' | 'round' | 'min' | 'max' | 'abs' | 'trunc';
      const mathFn = Math[fn as AllowedFn] as (...a: number[]) => number;
      return [mathFn(...args), pos + 1];
    }
    if (!(name in ctx)) throw new Error(`DSL: unknown variable '${name}'`);
    return [ctx[name], p + 1];
  }
  throw new Error(`DSL: unexpected token type '${t.k}'`);
}

/**
 * Evaluate a constrained arithmetic expression against a numeric context.
 * Safe alternative to eval() — only supports numbers, arithmetic, parentheses,
 * and Math.{floor|ceil|round|min|max|abs|trunc}.
 * @throws {Error} on disallowed constructs, unknown variables, or syntax errors.
 */
export function evaluateTemplateExpr(expr: string, ctx: Record<string, number>): number {
  const toks = _tokenize(expr);
  const [value, pos] = _expr(toks, 0, ctx);
  if (pos !== toks.length) throw new Error('DSL: trailing tokens after expression');
  return value;
}

function tpl(
  id: string,
  nameEn: string,
  nameHe: string,
  descEn: string,
  descHe: string,
  icon: string,
  overrides: Partial<CabinetConfig>,
): CabinetTemplate {
  return {
    id,
    name: { en: nameEn, he: nameHe },
    description: { en: descEn, he: descHe },
    icon,
    config: { ...DEFAULT_CONFIG, ...overrides },
  };
}

export const TEMPLATES: CabinetTemplate[] = [
  tpl(
    'kitchen-base',
    'Kitchen Base Unit',
    'ארון בסיס מטבח',
    '600×850×560 mm standard base unit with 2 doors and toe kick',
    'ארון בסיס תקני 600×850×560 מ"מ, 2 דלתות, בסיס',
    'IconKitchen',
    {
      furnitureType: 'cabinet',
      width: 600,
      height: 850,
      depth: 560,
      shelfCount: 1,
      doorCount: 2,
      doorStyle: 'flat',
      handleStyle: 'bar',
      kickHeight: 100,
      carcassMaterial: 'melamine-16',
      backPanelMaterial: 'hdf-3',
      edgeBanding: 'all-visible',
    },
  ),
  tpl(
    'kitchen-wall',
    'Kitchen Wall Unit',
    'ארון תלייה מטבח',
    '600×720×320 mm wall-mounted cabinet with 2 doors',
    'ארון תלייה מטבח 600×720×320 מ"מ, 2 דלתות',
    'IconWallUnit',
    {
      furnitureType: 'cabinet',
      width: 600,
      height: 720,
      depth: 320,
      shelfCount: 2,
      doorCount: 2,
      doorStyle: 'flat',
      handleStyle: 'knob',
      kickHeight: 0,
      carcassMaterial: 'melamine-16',
      backPanelMaterial: 'hdf-3',
      edgeBanding: 'all-visible',
    },
  ),
  tpl(
    'tall-pantry',
    'Tall Pantry',
    'ארון מזווה גבוה',
    '600×2100×560 mm floor-to-ceiling pantry with 4 shelves',
    'מזווה 600×2100×560 מ"מ, 4 מדפים, גובה תקרה',
    'IconCabinet',
    {
      furnitureType: 'cabinet',
      width: 600,
      height: 2100,
      depth: 560,
      shelfCount: 4,
      doorCount: 2,
      doorStyle: 'flat',
      handleStyle: 'bar',
      kickHeight: 100,
      carcassMaterial: 'melamine-18',
      backPanelMaterial: 'hdf-3',
      edgeBanding: 'all-visible',
    },
  ),
  tpl(
    'wardrobe',
    'Standard Wardrobe',
    'ארון בגדים',
    '1200×2200×600 mm double-door wardrobe',
    'ארון בגדים 1200×2200×600 מ"מ, 2 דלתות',
    'IconWardrobe',
    {
      furnitureType: 'wardrobe',
      width: 1200,
      height: 2200,
      depth: 600,
      shelfCount: 3,
      doorCount: 2,
      doorStyle: 'flat',
      handleStyle: 'bar',
      kickHeight: 0,
      carcassMaterial: 'melamine-18',
      backPanelMaterial: 'hdf-3',
      edgeBanding: 'doors-only',
    },
  ),
  tpl(
    'wardrobe-sliding',
    'Wardrobe Sliding Doors',
    'ארון הזזה',
    '2400×2400×600 mm wide wardrobe for sliding doors',
    'ארון הזזה 2400×2400×600 מ"מ, 6 מדפים',
    'IconWardrobe',
    {
      furnitureType: 'wardrobe',
      width: 2400,
      height: 2400,
      depth: 600,
      shelfCount: 6,
      doorStyle: 'none',
      doorCount: 2,
      handleStyle: 'none',
      kickHeight: 0,
      carcassMaterial: 'melamine-18',
      backPanelMaterial: 'hdf-3',
      edgeBanding: 'none',
    },
  ),
  tpl(
    'bookshelf',
    'Bookcase',
    'כוננית ספרים',
    '800×2000×300 mm deep bookcase with 5 adjustable shelves',
    'כוננית 800×2000×300 מ"מ, 5 מדפים מתכווננים',
    'IconBookshelf',
    {
      furnitureType: 'bookshelf',
      width: 800,
      height: 2000,
      depth: 300,
      shelfCount: 5,
      doorStyle: 'none',
      doorCount: 1,
      handleStyle: 'none',
      kickHeight: 0,
      carcassMaterial: 'plywood-18',
      backPanelMaterial: 'hdf-3',
      edgeBanding: 'all-visible',
    },
  ),
  tpl(
    'desk',
    'Writing Desk',
    'שולחן כתיבה',
    '1400×750×700 mm desk with 2 drawers',
    'שולחן כתיבה 1400×750×700 מ"מ, 2 מגירות',
    'IconDocument',
    {
      furnitureType: 'desk',
      width: 1400,
      height: 750,
      depth: 700,
      shelfCount: 0,
      doorStyle: 'none',
      doorCount: 1,
      drawerCount: 2,
      drawerHeights: [180, 200],
      handleStyle: 'bar',
      kickHeight: 0,
      carcassMaterial: 'plywood-18',
      backPanelMaterial: 'hdf-3',
      edgeBanding: 'all-visible',
    },
  ),
  tpl(
    'bathroom-vanity',
    'Bathroom Vanity',
    'ארון אמבטיה',
    '800×820×450 mm vanity unit with 2 drawers and soft-close',
    'ארון כיור 800×820×450 מ"מ, 2 מגירות סגירה רכה',
    'IconBathroom',
    {
      furnitureType: 'cabinet',
      width: 800,
      height: 820,
      depth: 450,
      shelfCount: 0,
      doorStyle: 'none',
      doorCount: 1,
      drawerCount: 2,
      drawerHeights: [160, 200],
      drawerSlideType: 'soft-close',
      handleStyle: 'knob',
      kickHeight: 80,
      carcassMaterial: 'melamine-16',
      backPanelMaterial: 'hdf-3',
      edgeBanding: 'all-visible',
    },
  ),
  tpl(
    'tv-unit',
    'TV Media Unit',
    'מזנון טלוויזיה',
    '1800×500×400 mm low TV unit with glass doors',
    'מזנון TV נמוך 1800×500×400 מ"מ, דלתות זכוכית',
    'IconTV',
    {
      furnitureType: 'cabinet',
      width: 1800,
      height: 500,
      depth: 400,
      shelfCount: 1,
      doorCount: 2,
      doorStyle: 'glass',
      handleStyle: 'cup',
      kickHeight: 0,
      carcassMaterial: 'melamine-16',
      backPanelMaterial: 'hdf-3',
      edgeBanding: 'all-visible',
    },
  ),
  tpl(
    'bedside',
    'Bedside Table',
    'שידת לילה',
    '450×600×400 mm compact bedside unit with 2 drawers',
    'שידת לילה קומפקטית 450×600×400 מ"מ, 2 מגירות',
    'IconBedside',
    {
      furnitureType: 'cabinet',
      width: 450,
      height: 600,
      depth: 400,
      shelfCount: 0,
      doorStyle: 'none',
      doorCount: 1,
      drawerCount: 2,
      drawerHeights: [150, 180],
      handleStyle: 'knob',
      kickHeight: 0,
      carcassMaterial: 'plywood-17',
      backPanelMaterial: 'hdf-3',
      edgeBanding: 'all-visible',
    },
  ),
  tpl(
    'shaker-kitchen-base',
    'Shaker Kitchen Base',
    'ארון מטבח שייקר',
    '600×900×580 mm shaker-style base unit with full-extension drawers',
    'ארון מטבח סגנון שייקר 600×900×580 מ"מ, מגירות הוצאה מלאה',
    'IconKitchen',
    {
      furnitureType: 'cabinet',
      width: 600,
      height: 900,
      depth: 580,
      shelfCount: 0,
      doorCount: 2,
      doorStyle: 'shaker',
      drawerCount: 3,
      drawerHeights: [160, 180, 200],
      drawerSlideType: 'full-extension',
      handleStyle: 'bar',
      kickHeight: 100,
      carcassMaterial: 'plywood-18',
      backPanelMaterial: 'hdf-3',
      edgeBanding: 'all-visible',
    },
  ),
  tpl(
    'open-display',
    'Open Display Shelving',
    'מדפים פתוחים',
    '1200×2000×280 mm open wall shelving unit, no back',
    'יחידת מדפים פתוחה 1200×2000×280 מ"מ, ללא גב',
    'IconBookshelf',
    {
      furnitureType: 'bookshelf',
      width: 1200,
      height: 2000,
      depth: 280,
      shelfCount: 6,
      doorStyle: 'none',
      doorCount: 1,
      handleStyle: 'none',
      kickHeight: 0,
      hasBack: false,
      carcassMaterial: 'plywood-18',
      backPanelMaterial: 'hdf-3',
      edgeBanding: 'all-visible',
    },
  ),
  // ── Sprint 176 additions ───────────────────────────────────────────────────
  tpl(
    'wine-rack',
    'Wine Rack',
    'מתלה יין',
    '600×900×300 mm wall-mounted wine rack with 3 open display shelves',
    'מתלה יין קיר 600×900×300 מ"מ, 3 מדפי תצוגה פתוחים',
    'IconBookshelf',
    {
      furnitureType: 'bookshelf',
      width: 600,
      height: 900,
      depth: 300,
      shelfCount: 3,
      doorStyle: 'none',
      doorCount: 1,
      handleStyle: 'none',
      kickHeight: 0,
      hasBack: false,
      carcassMaterial: 'plywood-18',
      backPanelMaterial: 'hdf-3',
      edgeBanding: 'all-visible',
    },
  ),
  tpl(
    'corner-cabinet-blind',
    'Corner Cabinet (Blind)',
    'ארון פינה (עיוור)',
    '900×850×600 mm blind corner base cabinet with single door',
    'ארון פינה עיוור 900×850×600 מ"מ, דלת אחת, בסיס',
    'IconCabinet',
    {
      furnitureType: 'cabinet',
      width: 900,
      height: 850,
      depth: 600,
      shelfCount: 1,
      doorCount: 1,
      doorStyle: 'flat',
      handleStyle: 'bar',
      kickHeight: 100,
      carcassMaterial: 'melamine-18',
      backPanelMaterial: 'hdf-3',
      edgeBanding: 'all-visible',
    },
  ),
  tpl(
    'bathroom-vanity-wall',
    'Bathroom Vanity Wall Unit',
    'ארון אמבטיה עליון',
    '600×700×200 mm wall-mounted bathroom cabinet with 1 door and shelf',
    'ארון אמבטיה עליון 600×700×200 מ"מ, דלת אחת, מדף',
    'IconBathroom',
    {
      furnitureType: 'cabinet',
      width: 600,
      height: 700,
      depth: 200,
      shelfCount: 2,
      doorCount: 1,
      doorStyle: 'flat',
      handleStyle: 'knob',
      kickHeight: 0,
      carcassMaterial: 'melamine-16',
      backPanelMaterial: 'hdf-3',
      edgeBanding: 'all-visible',
    },
  ),
  // ── Sprint 47 additions ───────────────────────────────────────────────────
  tpl(
    'pantry',
    'Pantry Cabinet',
    'ארון מזווה',
    '600×2000×580 mm tall pantry with 6 shelves and 2-door facade',
    'ארון מזווה גבוה 600×2000×580 מ"מ, 6 מדפים, 2 דלתות',
    'IconCabinet',
    {
      furnitureType: 'cabinet',
      width: 600,
      height: 2000,
      depth: 580,
      shelfCount: 6,
      doorCount: 2,
      doorStyle: 'flat',
      handleStyle: 'bar',
      kickHeight: 100,
      carcassMaterial: 'melamine-18',
      backPanelMaterial: 'mdf-3',
      edgeBanding: 'all-visible',
    },
  ),
  // ── Phase 13 / Sprint 4 — Parametric template with computedFields ─────────
  {
    id: 'proportional-bookcase',
    name: { en: 'Proportional Bookcase', he: 'כוננית פרופורציונלית' },
    description: {
      en: 'Bookcase where shelf count auto-scales with height (1 shelf per 350 mm of internal height)',
      he: 'כוננית בה מספר המדפים מחושב אוטומטית לפי גובה (מדף אחד לכל 350 מ"מ)',
    },
    icon: 'IconBookshelf',
    config: {
      ...DEFAULT_CONFIG,
      furnitureType: 'bookshelf',
      width: 800,
      height: 2100,
      depth: 300,
      shelfCount: 5,
      doorStyle: 'none',
      doorCount: 1,
      handleStyle: 'none',
      kickHeight: 0,
      carcassMaterial: 'plywood-18',
      backPanelMaterial: 'hdf-3',
      edgeBanding: 'all-visible',
    },
    computedFields: {
      // shelfCount = floor((height - 36) / 350) — one shelf per 350 mm of usable space
      shelfCount: 'Math.floor(internalHeight / 350)',
    },
  } satisfies CabinetTemplate,
];

export function getTemplate(id: string): CabinetTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/**
 * Instantiate a CabinetTemplate into a concrete CabinetConfig.
 * 1. Merges `sizeOverrides` on top of `tpl.config` (base).
 * 2. Builds an evaluation context from all numeric fields in the merged config,
 *    plus two helpers: `internalHeight` and `internalWidth`.
 * 3. Evaluates each `computedFields` expression and patches the result.
 *
 * This allows templates to express proportional relationships such as:
 *   `shelfCount = "Math.floor(internalHeight / 350)"`
 *
 * @example
 *   const cfg = instantiateTemplate(getTemplate('proportional-bookcase')!, { height: 2400 });
 *   // → cfg.shelfCount is automatically recalculated for the new height
 */
export function instantiateTemplate(
  tpl: CabinetTemplate,
  sizeOverrides?: Partial<CabinetConfig>,
): CabinetConfig {
  const base: CabinetConfig = { ...tpl.config, ...(sizeOverrides ?? {}) };
  if (!tpl.computedFields) return base;

  const ctx: Record<string, number> = {};
  for (const [k, v] of Object.entries(base)) {
    if (typeof v === 'number') ctx[k] = v;
  }
  // Derived helpers (approximate, 18 mm top+bottom panels = 36 mm combined)
  ctx.internalHeight = base.height - (base.kickHeight ?? 0) - 36;
  ctx.internalWidth = base.width - 36;

  const patch: Partial<CabinetConfig> = {};
  for (const [field, expr] of Object.entries(tpl.computedFields)) {
    const value = evaluateTemplateExpr(expr, ctx);
    // Only numeric config fields are settable via computed expressions
    (patch as Record<string, number>)[field] = value;
  }
  return { ...base, ...patch };
}

/**
 * Returns sensible default dimensions and settings for each furniture type.
 * Use when the user switches furniture type in the configurator so the config
 * reflects realistic starting values for the selected type.
 */
export function getTemplateDefaults(type: FurnitureType): Partial<CabinetConfig> {
  switch (type) {
    case 'bookshelf':
      return { ...BOOKSHELF_DEFAULTS };
    case 'desk':
      return { ...DESK_DEFAULTS };
    case 'wardrobe':
      return { ...WARDROBE_DEFAULTS };
    case 'panel':
      return { ...PANEL_DEFAULTS };
    case 'cabinet':
    default:
      return { ...CABINET_DEFAULTS };
  }
}
