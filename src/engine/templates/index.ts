import type { CabinetConfig, FurnitureType } from '../types';
import {
  BOOKSHELF_DEFAULTS,
  CABINET_DEFAULTS,
  DESK_DEFAULTS,
  WARDROBE_DEFAULTS,
  PANEL_DEFAULTS,
} from '../materials.ts';
import { evaluateTemplateExpr } from './dsl';
import { TEMPLATES } from './data';
export { evaluateTemplateExpr, TEMPLATES };
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
export function instantiateTemplate(tpl: CabinetTemplate, sizeOverrides?: Partial<CabinetConfig>): CabinetConfig {
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

export {
  TEMPLATE_CATALOGUE,
  getTemplate as getLibraryTemplate,
  getTemplatesByCategory as getLibraryTemplatesByCategory,
  instantiateTemplate as instantiateLibraryTemplate,
  listTemplateIds,
} from './library';
export type {
  TemplateCategory,
  TemplateDimensions,
  CabinetTemplate as LibraryCabinetTemplate,
  TemplateInstance as LibraryTemplateInstance,
} from './library';

export {
  getTemplate as getCabinetTemplate,
  getTemplatesByCategory as getCabinetTemplatesByCategory,
  instantiateTemplate as instantiateCabinetTemplate,
  BUILT_IN_TEMPLATES,
} from './cabinet';
export type {
  CabinetCategory,
  DimensionConstraint as CabinetDimensionConstraint,
  CabinetTemplate as BuiltInCabinetTemplate,
  ValidationError as CabinetValidationError,
  TemplateParams,
  TemplateInstance as CabinetTemplateInstance,
} from './cabinet';

export {
  validateTemplate,
  instantiateTemplate as instantiateParametricTemplate,
  getDefaultValues,
  getParamDependencies,
  evaluateExpression,
  MAX_PARAMS,
  MAX_RULES,
  MAX_COMPUTED,
  MAX_EXPRESSION_LENGTH,
} from './parametric';
export type {
  ParamType,
  NumberConstraint,
  ParamDefBase,
  NumberParamDef,
  BooleanParamDef,
  ChoiceParamDef,
  ParamDef,
  ConditionalRule,
  ComputedField,
  ParametricTemplate,
  ParamValues,
  TemplateInstance as ParametricTemplateInstance,
  TemplateValidationError,
  TemplateValidationResult,
} from './parametric';
