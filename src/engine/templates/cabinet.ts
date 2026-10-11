/**
 * Cabinet Template Library — Sprint 184
 *
 * Pre-built parametric templates for common cabinet types.
 * Validate dimensions against constraints, instantiate with overrides.
 */

/** Cabinet type category. */
export type CabinetCategory = 'base' | 'wall' | 'tall' | 'drawerBank' | 'corner' | 'vanity';

/** Dimension constraint range. */
export interface DimensionConstraint {
  readonly min: number;
  readonly max: number;
  readonly default: number;
}

/** A parametric cabinet template definition. */
export interface CabinetTemplate {
  readonly id: string;
  readonly name: string;
  readonly category: CabinetCategory;
  readonly width: DimensionConstraint;
  readonly height: DimensionConstraint;
  readonly depth: DimensionConstraint;
  /** Default number of shelves. */
  readonly shelves: number;
  /** Default number of drawers (0 for shelf-only). */
  readonly drawers: number;
  /** Whether template supports a door. */
  readonly hasDoor: boolean;
}

/** Validation error for a dimension. */
export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
}

/** Template instantiation parameters. */
export interface TemplateParams {
  readonly width?: number;
  readonly height?: number;
  readonly depth?: number;
  readonly shelves?: number;
  readonly drawers?: number;
}

/** Instantiated cabinet from a template. */
export interface TemplateInstance {
  readonly templateId: string;
  readonly category: CabinetCategory;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly shelves: number;
  readonly drawers: number;
  readonly hasDoor: boolean;
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}

/**
 * Built-in cabinet templates.
 */
export const BUILT_IN_TEMPLATES: readonly CabinetTemplate[] = [
  {
    id: 'base-standard',
    name: 'Standard Base Cabinet',
    category: 'base',
    width: { min: 300, max: 900, default: 600 },
    height: { min: 700, max: 900, default: 720 },
    depth: { min: 500, max: 650, default: 580 },
    shelves: 1,
    drawers: 0,
    hasDoor: true,
  },
  {
    id: 'wall-standard',
    name: 'Standard Wall Cabinet',
    category: 'wall',
    width: { min: 300, max: 900, default: 600 },
    height: { min: 300, max: 900, default: 720 },
    depth: { min: 250, max: 400, default: 320 },
    shelves: 2,
    drawers: 0,
    hasDoor: true,
  },
  {
    id: 'tall-pantry',
    name: 'Tall Pantry Cabinet',
    category: 'tall',
    width: { min: 400, max: 800, default: 600 },
    height: { min: 1800, max: 2400, default: 2100 },
    depth: { min: 500, max: 650, default: 580 },
    shelves: 5,
    drawers: 0,
    hasDoor: true,
  },
  {
    id: 'drawer-bank-4',
    name: '4-Drawer Bank',
    category: 'drawerBank',
    width: { min: 400, max: 900, default: 600 },
    height: { min: 700, max: 900, default: 720 },
    depth: { min: 500, max: 650, default: 580 },
    shelves: 0,
    drawers: 4,
    hasDoor: false,
  },
  {
    id: 'corner-l',
    name: 'L-Shape Corner Cabinet',
    category: 'corner',
    width: { min: 800, max: 1100, default: 900 },
    height: { min: 700, max: 900, default: 720 },
    depth: { min: 500, max: 650, default: 580 },
    shelves: 1,
    drawers: 0,
    hasDoor: true,
  },
  {
    id: 'vanity-standard',
    name: 'Bathroom Vanity',
    category: 'vanity',
    width: { min: 500, max: 1200, default: 800 },
    height: { min: 700, max: 850, default: 800 },
    depth: { min: 400, max: 550, default: 500 },
    shelves: 1,
    drawers: 2,
    hasDoor: true,
  },
] as const;

/**
 * Validate a dimension value against its constraint.
 */
function validateDimension(field: string, value: number, constraint: DimensionConstraint): ValidationError | null {
  if (value < constraint.min || value > constraint.max) {
    return {
      field,
      message: `${field} must be between ${constraint.min} and ${constraint.max}`,
      value,
      min: constraint.min,
      max: constraint.max,
    };
  }
  return null;
}

/**
 * Get a template by ID.
 *
 * @param templateId - Template ID to look up.
 * @param customTemplates - Optional additional templates.
 * @returns Template or undefined.
 */
export function getTemplate(
  templateId: string,
  customTemplates: readonly CabinetTemplate[] = [],
): CabinetTemplate | undefined {
  return [...BUILT_IN_TEMPLATES, ...customTemplates].find((t) => t.id === templateId);
}

/**
 * Get all templates for a category.
 */
export function getTemplatesByCategory(
  category: CabinetCategory,
  customTemplates: readonly CabinetTemplate[] = [],
): CabinetTemplate[] {
  return [...BUILT_IN_TEMPLATES, ...customTemplates].filter((t) => t.category === category);
}

/**
 * Instantiate a cabinet from a template with parameter overrides.
 *
 * @param templateId - Template to instantiate.
 * @param params - Dimension overrides (uses template defaults for unspecified).
 * @param customTemplates - Optional additional templates.
 * @throws {RangeError} If template not found.
 */
export function instantiateTemplate(
  templateId: string,
  params: TemplateParams = {},
  customTemplates: readonly CabinetTemplate[] = [],
): TemplateInstance {
  const template = getTemplate(templateId, customTemplates);
  if (!template) {
    throw new RangeError(`template not found: "${templateId}"`);
  }

  const width = params.width ?? template.width.default;
  const height = params.height ?? template.height.default;
  const depth = params.depth ?? template.depth.default;
  const shelves = params.shelves ?? template.shelves;
  const drawers = params.drawers ?? template.drawers;

  const errors: ValidationError[] = [];
  const wErr = validateDimension('width', width, template.width);
  const hErr = validateDimension('height', height, template.height);
  const dErr = validateDimension('depth', depth, template.depth);
  if (wErr) errors.push(wErr);
  if (hErr) errors.push(hErr);
  if (dErr) errors.push(dErr);

  return {
    templateId,
    category: template.category,
    width,
    height,
    depth,
    shelves,
    drawers,
    hasDoor: template.hasDoor,
    valid: errors.length === 0,
    errors,
  };
}
