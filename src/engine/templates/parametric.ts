/**
 * Sprint 162 — Parametric Template Engine.
 *
 * Allows users to define parametric cabinet templates with typed variables,
 * dimension constraints, conditional rules, and computed properties.
 * A template can be instantiated with user-supplied parameter overrides
 * to produce a concrete configuration.
 *
 * Features:
 *   - Typed parameter definitions (number, boolean, choice)
 *   - Min/max/step constraints on numeric parameters
 *   - Conditional rules (if parameter X, then enforce Y)
 *   - Computed fields derived from parameter expressions
 *   - Template validation and instantiation
 *   - Parameter dependency resolution (topological sort)
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Supported parameter types. */
export type ParamType = 'number' | 'boolean' | 'choice';

/** Numeric parameter constraint. */
export interface NumberConstraint {
  min: number;
  max: number;
  step: number;
}

/** Base parameter definition. */
export interface ParamDefBase {
  /** Unique parameter ID. */
  id: string;
  /** Display label. */
  label: string;
  /** Parameter type. */
  type: ParamType;
}

/** Number parameter definition. */
export interface NumberParamDef extends ParamDefBase {
  type: 'number';
  defaultValue: number;
  constraint: NumberConstraint;
  /** Unit label (e.g., 'mm', 'in'). */
  unit: string;
}

/** Boolean parameter definition. */
export interface BooleanParamDef extends ParamDefBase {
  type: 'boolean';
  defaultValue: boolean;
}

/** Choice parameter definition. */
export interface ChoiceParamDef extends ParamDefBase {
  type: 'choice';
  options: readonly string[];
  defaultValue: string;
}

/** Union of all parameter definitions. */
export type ParamDef = NumberParamDef | BooleanParamDef | ChoiceParamDef;

/** A conditional rule that constrains parameters based on other parameters. */
export interface ConditionalRule {
  /** Rule ID for reference. */
  id: string;
  /** Parameter ID that triggers this rule. */
  when: string;
  /** Value that triggers: for boolean the trigger is `true`; for number/choice the trigger value. */
  equals: string | number | boolean;
  /** Parameter overrides applied when the condition is met. */
  then: Record<string, string | number | boolean>;
}

/** A computed field derived from parameters. */
export interface ComputedField {
  /** Output field ID. */
  id: string;
  /** Expression referencing parameter IDs (arithmetic only). */
  expression: string;
  /** Display label. */
  label: string;
  /** Unit label. */
  unit: string;
}

/** A complete parametric template definition. */
export interface ParametricTemplate {
  /** Unique template ID. */
  id: string;
  /** Template display name. */
  name: string;
  /** Template description. */
  description: string;
  /** Template category. */
  category: string;
  /** Version string. */
  version: string;
  /** Ordered parameter definitions. */
  params: ParamDef[];
  /** Conditional rules. */
  rules: ConditionalRule[];
  /** Computed output fields. */
  computed: ComputedField[];
}

/** Parameter values map (user-supplied overrides). */
export type ParamValues = Record<string, string | number | boolean>;

/** Result of template instantiation. */
export interface TemplateInstance {
  /** Template ID. */
  templateId: string;
  /** Resolved parameter values (after defaults + overrides + rules). */
  params: ParamValues;
  /** Computed field results. */
  computed: Record<string, number>;
  /** Validation warnings (non-fatal). */
  warnings: string[];
}

/** Validation error from template or instantiation. */
export interface TemplateValidationError {
  /** Parameter or rule ID. */
  target: string;
  /** Error description. */
  message: string;
}

/** Result of template validation. */
export interface TemplateValidationResult {
  /** Whether the template is valid. */
  valid: boolean;
  /** Errors found. */
  errors: TemplateValidationError[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum parameters per template. */
export const MAX_PARAMS = 50;

/** Maximum rules per template. */
export const MAX_RULES = 100;

/** Maximum computed fields per template. */
export const MAX_COMPUTED = 30;

/** Maximum expression length. */
export const MAX_EXPRESSION_LENGTH = 200;

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a parametric template definition.
 *
 * @param template  Template to validate.
 * @returns Validation result with errors (if any).
 */
export function validateTemplate(template: ParametricTemplate): TemplateValidationResult {
  const errors: TemplateValidationError[] = [];

  if (!template.id || template.id.trim().length === 0) {
    errors.push({ target: 'id', message: 'Template ID must not be empty.' });
  }
  if (!template.name || template.name.trim().length === 0) {
    errors.push({ target: 'name', message: 'Template name must not be empty.' });
  }
  if (template.params.length > MAX_PARAMS) {
    errors.push({ target: 'params', message: `Too many parameters (max ${MAX_PARAMS}).` });
  }
  if (template.rules.length > MAX_RULES) {
    errors.push({ target: 'rules', message: `Too many rules (max ${MAX_RULES}).` });
  }
  if (template.computed.length > MAX_COMPUTED) {
    errors.push({ target: 'computed', message: `Too many computed fields (max ${MAX_COMPUTED}).` });
  }

  // Validate unique IDs
  const paramIds = new Set<string>();
  for (const p of template.params) {
    if (paramIds.has(p.id)) {
      errors.push({ target: p.id, message: `Duplicate parameter ID '${p.id}'.` });
    }
    paramIds.add(p.id);
    validateParamDef(p, errors);
  }

  // Validate rules reference existing params
  for (const rule of template.rules) {
    if (!paramIds.has(rule.when)) {
      errors.push({ target: rule.id, message: `Rule references unknown parameter '${rule.when}'.` });
    }
    for (const key of Object.keys(rule.then)) {
      if (!paramIds.has(key)) {
        errors.push({ target: rule.id, message: `Rule 'then' references unknown parameter '${key}'.` });
      }
    }
  }

  // Validate computed expressions
  for (const c of template.computed) {
    if (c.expression.length > MAX_EXPRESSION_LENGTH) {
      errors.push({ target: c.id, message: `Expression exceeds ${MAX_EXPRESSION_LENGTH} characters.` });
    }
    const refs = extractExpressionRefs(c.expression);
    for (const ref of refs) {
      if (!paramIds.has(ref)) {
        errors.push({ target: c.id, message: `Expression references unknown parameter '${ref}'.` });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a single parameter definition.
 *
 * @param param   Parameter to validate.
 * @param errors  Error accumulator.
 */
function validateParamDef(param: ParamDef, errors: TemplateValidationError[]): void {
  if (!param.id || param.id.trim().length === 0) {
    errors.push({ target: 'param', message: 'Parameter ID must not be empty.' });
  }
  if (param.type === 'number') {
    const { min, max, step } = param.constraint;
    if (min > max) {
      errors.push({ target: param.id, message: `min (${min}) must be ≤ max (${max}).` });
    }
    if (step <= 0) {
      errors.push({ target: param.id, message: `step must be > 0, got ${step}.` });
    }
    if (param.defaultValue < min || param.defaultValue > max) {
      errors.push({ target: param.id, message: `Default value ${param.defaultValue} out of range [${min}, ${max}].` });
    }
  }
  if (param.type === 'choice') {
    if (param.options.length === 0) {
      errors.push({ target: param.id, message: 'Choice parameter must have at least one option.' });
    }
    if (!param.options.includes(param.defaultValue)) {
      errors.push({ target: param.id, message: `Default '${param.defaultValue}' not in options.` });
    }
  }
}

// ─── Instantiation ────────────────────────────────────────────────────────────

/**
 * Instantiate a parametric template with user-supplied parameter values.
 *
 * @param template   Template definition.
 * @param overrides  User-supplied parameter overrides.
 * @returns Template instance with resolved params and computed fields.
 * @throws RangeError if template is invalid.
 */
export function instantiateTemplate(template: ParametricTemplate, overrides: ParamValues = {}): TemplateInstance {
  const validation = validateTemplate(template);
  if (!validation.valid) {
    throw new RangeError(`instantiateTemplate: template '${template.id}' is invalid — ${validation.errors[0].message}`);
  }

  const warnings: string[] = [];
  const params: ParamValues = {};

  // Apply defaults
  for (const def of template.params) {
    params[def.id] = def.defaultValue;
  }

  // Apply overrides with validation
  for (const [key, value] of Object.entries(overrides)) {
    const def = template.params.find((p) => p.id === key);
    if (!def) {
      warnings.push(`Unknown parameter '${key}' ignored.`);
      continue;
    }
    const clamped = clampValue(def, value, warnings);
    params[key] = clamped;
  }

  // Apply conditional rules
  applyRules(template.rules, params);

  // Evaluate computed fields
  const computed: Record<string, number> = {};
  for (const c of template.computed) {
    computed[c.id] = evaluateExpression(c.expression, params);
  }

  return { templateId: template.id, params, computed, warnings };
}

/**
 * Get the default parameter values for a template.
 *
 * @param template  Template definition.
 * @returns Default parameter values.
 */
export function getDefaultValues(template: ParametricTemplate): ParamValues {
  const values: ParamValues = {};
  for (const def of template.params) {
    values[def.id] = def.defaultValue;
  }
  return values;
}

/**
 * Get parameter dependency graph (which params are affected by rules).
 *
 * @param template  Template definition.
 * @returns Map of parameter ID → set of dependent parameter IDs.
 */
export function getParamDependencies(template: ParametricTemplate): Map<string, string[]> {
  const deps = new Map<string, string[]>();
  for (const param of template.params) {
    deps.set(param.id, []);
  }
  for (const rule of template.rules) {
    const targets = Object.keys(rule.then);
    const existing = deps.get(rule.when) ?? [];
    deps.set(rule.when, [...existing, ...targets]);
  }
  return deps;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Clamp/validate a parameter value. */
function clampValue(def: ParamDef, value: string | number | boolean, warnings: string[]): string | number | boolean {
  if (def.type === 'number') {
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(num)) {
      warnings.push(`Parameter '${def.id}': invalid number, using default.`);
      return def.defaultValue;
    }
    const { min, max, step } = def.constraint;
    const clamped = Math.min(max, Math.max(min, num));
    const stepped = Math.round(clamped / step) * step;
    if (stepped !== num) {
      warnings.push(`Parameter '${def.id}': clamped ${num} → ${stepped}.`);
    }
    return stepped;
  }
  if (def.type === 'boolean') {
    return Boolean(value);
  }
  // choice
  const str = String(value);
  if (!def.options.includes(str)) {
    warnings.push(`Parameter '${def.id}': '${str}' not in options, using default.`);
    return def.defaultValue;
  }
  return str;
}

/** Apply conditional rules to parameter values. */
function applyRules(rules: ConditionalRule[], params: ParamValues): void {
  for (const rule of rules) {
    const actual = params[rule.when];
    if (actual === rule.equals) {
      for (const [key, value] of Object.entries(rule.then)) {
        params[key] = value;
      }
    }
  }
}

/** Extract parameter references from an expression (identifiers). */
function extractExpressionRefs(expression: string): string[] {
  const refs: string[] = [];
  const idRegex = /[a-z_]\w*/gi;
  let match: RegExpExecArray | null;
  while ((match = idRegex.exec(expression)) !== null) {
    const id = match[0];
    // Skip known math functions
    if (!['Math', 'floor', 'ceil', 'round', 'min', 'max', 'abs', 'trunc', 'PI'].includes(id)) {
      refs.push(id);
    }
  }
  return [...new Set(refs)];
}

/**
 * Evaluate a simple arithmetic expression with parameter substitution.
 * Supports: +, -, *, /, parentheses, number literals, and parameter refs.
 * No eval() — uses a safe recursive-descent parser.
 *
 * @param expression  Expression string.
 * @param params      Parameter values (only number params are used).
 * @returns Computed numeric result.
 */
export function evaluateExpression(expression: string, params: ParamValues): number {
  const tokens = tokenize(expression);
  let pos = 0;

  function peek(): Token | undefined {
    return tokens[pos];
  }

  function consume(): Token {
    return tokens[pos++];
  }

  function parseExpr(): number {
    let result = parseTerm();
    while (peek()?.type === 'op' && (peek()?.value === '+' || peek()?.value === '-')) {
      const op = consume().value;
      const right = parseTerm();
      result = op === '+' ? result + right : result - right;
    }
    return result;
  }

  function parseTerm(): number {
    let result = parseFactor();
    while (peek()?.type === 'op' && (peek()?.value === '*' || peek()?.value === '/')) {
      const op = consume().value;
      const right = parseFactor();
      result = op === '*' ? result * right : result / right;
    }
    return result;
  }

  function parseFactor(): number {
    const tok = peek();
    if (!tok) return 0;

    if (tok.type === 'num') {
      consume();
      return tok.numValue;
    }

    if (tok.type === 'lp') {
      consume();
      const val = parseExpr();
      consume(); // rp
      return val;
    }

    if (tok.type === 'id') {
      consume();
      // Check for function call (Math.floor etc.)
      if (peek()?.type === 'dot') {
        consume(); // dot
        const fn = consume(); // function name
        consume(); // lp
        const arg = parseExpr();
        consume(); // rp
        return callMathFn(fn.value, arg);
      }
      // Parameter reference
      const val = params[tok.value];
      if (typeof val === 'number') return val;
      if (typeof val === 'boolean') return val ? 1 : 0;
      return 0;
    }

    // Unary minus
    if (tok.type === 'op' && tok.value === '-') {
      consume();
      return -parseFactor();
    }

    return 0;
  }

  return parseExpr();
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────

interface Token {
  type: 'num' | 'id' | 'op' | 'lp' | 'rp' | 'dot' | 'comma';
  value: string;
  numValue: number;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/\d/.test(ch)) {
      let s = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) s += expr[i++];
      tokens.push({ type: 'num', value: s, numValue: parseFloat(s) });
      continue;
    }
    if (/[a-z_]/i.test(ch)) {
      let s = '';
      while (i < expr.length && /\w/.test(expr[i])) s += expr[i++];
      tokens.push({ type: 'id', value: s, numValue: 0 });
      continue;
    }
    if ('+-*/'.includes(ch)) {
      tokens.push({ type: 'op', value: ch, numValue: 0 });
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lp', value: '(', numValue: 0 });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rp', value: ')', numValue: 0 });
      i++;
      continue;
    }
    if (ch === '.') {
      tokens.push({ type: 'dot', value: '.', numValue: 0 });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma', value: ',', numValue: 0 });
      i++;
      continue;
    }
    i++; // skip unknown
  }
  return tokens;
}

function callMathFn(name: string, arg: number): number {
  switch (name) {
    case 'floor':
      return Math.floor(arg);
    case 'ceil':
      return Math.ceil(arg);
    case 'round':
      return Math.round(arg);
    case 'abs':
      return Math.abs(arg);
    case 'trunc':
      return Math.trunc(arg);
    default:
      return arg;
  }
}
