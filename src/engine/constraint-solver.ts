/**
 * Sprint 109 — Constraint solver for cabinet dimensions.
 *
 * Provides min/max/step/ratio rules for each numeric dimension field in a
 * CabinetConfig. The solver can validate a config against a constraint set and
 * optionally auto-correct violations by clamping/rounding values.
 *
 * All functions are pure (no side effects, no imports from React or DOM).
 */
import type { CabinetConfig } from './types';

// ─── Public types ─────────────────────────────────────────────────────────────

/** A numeric field in CabinetConfig that can be constrained. */
export type DimensionField = 'width' | 'height' | 'depth' | 'shelfCount' | 'drawerCount' | 'kickHeight' | 'doorReveal';

/** Constraint operator. */
export type ConstraintOp = 'min' | 'max' | 'step' | 'ratio';

/**
 * A single constraint rule applied to one dimension field.
 *
 * - `min`   — field value must be ≥ `value`
 * - `max`   — field value must be ≤ `value`
 * - `step`  — field value must be a multiple of `value` (snapped to nearest)
 * - `ratio` — field value must be ≤ `value` × `relatedField` value
 */
export interface DimensionConstraint {
  /** The config field this rule applies to. */
  field: DimensionField;
  /** Constraint type. */
  op: ConstraintOp;
  /**
   * Constraint threshold.
   * - `min`/`max`: absolute mm (or count) limit
   * - `step`: grid increment in mm (or count)
   * - `ratio`: multiplier applied to `relatedField` value
   */
  value: number;
  /** Only required for `op === 'ratio'` — the field whose value is scaled by `value`. */
  relatedField?: DimensionField;
  /** Human-readable English violation message. */
  message: string;
}

/** A constraint violation reported by `validateConstraints`. */
export interface ConstraintViolation {
  /** The field that violated the constraint. */
  field: DimensionField;
  /** Which constraint was violated. */
  op: ConstraintOp;
  /** The current (violating) value. */
  currentValue: number;
  /** The constraint threshold value. */
  limitValue: number;
  /** Human-readable message from the constraint definition. */
  message: string;
  /** The auto-corrected value that would satisfy this constraint. */
  correctedValue: number;
}

// ─── Default manufacturing constraints ────────────────────────────────────────

/**
 * Standard manufacturing constraint set aligned with SketchList 3D parametric
 * limits and the EU EN 14749 residential furniture safety standard.
 *
 * All limits are in mm or unit counts. Ratio constraints prevent unstable
 * tall-and-shallow cabinets (depth ≤ 0.8 × height).
 */
export function getDefaultConstraints(): DimensionConstraint[] {
  return [
    // ── Width ──────────────────────────────────────────────────────────────
    { field: 'width', op: 'min', value: 200, message: 'Width must be at least 200 mm.' },
    { field: 'width', op: 'max', value: 2400, message: 'Width cannot exceed 2400 mm (single-sheet panel width).' },
    { field: 'width', op: 'step', value: 1, message: 'Width must be a whole number of mm.' },

    // ── Height ─────────────────────────────────────────────────────────────
    { field: 'height', op: 'min', value: 200, message: 'Height must be at least 200 mm.' },
    {
      field: 'height',
      op: 'max',
      value: 3000,
      message: 'Height cannot exceed 3000 mm (maximum standard sheet length).',
    },
    { field: 'height', op: 'step', value: 1, message: 'Height must be a whole number of mm.' },

    // ── Depth ──────────────────────────────────────────────────────────────
    { field: 'depth', op: 'min', value: 100, message: 'Depth must be at least 100 mm.' },
    { field: 'depth', op: 'max', value: 1200, message: 'Depth cannot exceed 1200 mm.' },
    { field: 'depth', op: 'step', value: 1, message: 'Depth must be a whole number of mm.' },
    {
      field: 'depth',
      op: 'ratio',
      value: 0.8,
      relatedField: 'height',
      message: 'Depth must not exceed 80 % of cabinet height (EN 14749 tip-over safety).',
    },

    // ── Shelf count ────────────────────────────────────────────────────────
    { field: 'shelfCount', op: 'min', value: 0, message: 'Shelf count cannot be negative.' },
    { field: 'shelfCount', op: 'max', value: 20, message: 'Shelf count cannot exceed 20.' },
    { field: 'shelfCount', op: 'step', value: 1, message: 'Shelf count must be a whole number.' },

    // ── Drawer count ───────────────────────────────────────────────────────
    { field: 'drawerCount', op: 'min', value: 0, message: 'Drawer count cannot be negative.' },
    { field: 'drawerCount', op: 'max', value: 8, message: 'Drawer count cannot exceed 8.' },
    { field: 'drawerCount', op: 'step', value: 1, message: 'Drawer count must be a whole number.' },

    // ── Kick height ────────────────────────────────────────────────────────
    { field: 'kickHeight', op: 'min', value: 0, message: 'Kick height cannot be negative.' },
    { field: 'kickHeight', op: 'max', value: 300, message: 'Kick height cannot exceed 300 mm.' },
    { field: 'kickHeight', op: 'step', value: 1, message: 'Kick height must be a whole number of mm.' },

    // ── Door reveal ────────────────────────────────────────────────────────
    { field: 'doorReveal', op: 'min', value: 1, message: 'Door reveal must be at least 1 mm.' },
    { field: 'doorReveal', op: 'max', value: 10, message: 'Door reveal cannot exceed 10 mm.' },
    { field: 'doorReveal', op: 'step', value: 0.5, message: 'Door reveal must be in 0.5 mm increments.' },
  ];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Extract the numeric value of a DimensionField from a CabinetConfig. */
function getFieldValue(config: CabinetConfig, field: DimensionField): number {
  switch (field) {
    case 'width':
      return config.width;
    case 'height':
      return config.height;
    case 'depth':
      return config.depth;
    case 'shelfCount':
      return config.shelfCount;
    case 'drawerCount':
      return config.drawerCount;
    case 'kickHeight':
      return config.kickHeight;
    case 'doorReveal':
      return config.doorReveal;
  }
}

/**
 * Compute the corrected value for a single constraint violation.
 * Returns a value that satisfies the constraint.
 */
function computeCorrectedValue(current: number, constraint: DimensionConstraint, config: CabinetConfig): number {
  switch (constraint.op) {
    case 'min':
      return Math.max(current, constraint.value);
    case 'max':
      return Math.min(current, constraint.value);
    case 'step': {
      const step = constraint.value;
      return Math.round(current / step) * step;
    }
    case 'ratio': {
      if (!constraint.relatedField) return current;
      const related = getFieldValue(config, constraint.relatedField);
      return Math.min(current, Math.floor(related * constraint.value));
    }
  }
}

/**
 * Test whether a single constraint is violated.
 * Returns `true` when the constraint is satisfied (no violation).
 */
function isSatisfied(current: number, constraint: DimensionConstraint, config: CabinetConfig): boolean {
  switch (constraint.op) {
    case 'min':
      return current >= constraint.value;
    case 'max':
      return current <= constraint.value;
    case 'step': {
      const step = constraint.value;
      // Allow floating-point tolerance of 1e-9
      const remainder = current % step;
      return remainder < 1e-9 || step - remainder < 1e-9;
    }
    case 'ratio': {
      if (!constraint.relatedField) return true;
      const related = getFieldValue(config, constraint.relatedField);
      return current <= related * constraint.value + 1e-9;
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validate a CabinetConfig against an array of dimension constraints.
 *
 * Returns all violations found. An empty array means the config is valid.
 * Does not mutate the config.
 *
 * @param config      The cabinet configuration to validate.
 * @param constraints Constraint rules to apply. Defaults to `getDefaultConstraints()`.
 */
export function validateConstraints(
  config: CabinetConfig,
  constraints: DimensionConstraint[] = getDefaultConstraints(),
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  for (const constraint of constraints) {
    const current = getFieldValue(config, constraint.field);
    if (!isSatisfied(current, constraint, config)) {
      violations.push({
        field: constraint.field,
        op: constraint.op,
        currentValue: current,
        limitValue: constraint.value,
        message: constraint.message,
        correctedValue: computeCorrectedValue(current, constraint, config),
      });
    }
  }

  return violations;
}

/**
 * Auto-correct a CabinetConfig by applying all constraint corrections in order.
 *
 * Applies each constraint in sequence, updating the working config so that
 * later constraints (e.g. ratio) see already-clamped values.  Returns a new
 * config object — the original is never mutated.
 *
 * @param config      The cabinet configuration to correct.
 * @param constraints Constraint rules to apply. Defaults to `getDefaultConstraints()`.
 */
export function applyConstraints(
  config: CabinetConfig,
  constraints: DimensionConstraint[] = getDefaultConstraints(),
): CabinetConfig {
  let working = { ...config };

  for (const constraint of constraints) {
    const current = getFieldValue(working, constraint.field);
    if (!isSatisfied(current, constraint, working)) {
      const corrected = computeCorrectedValue(current, constraint, working);
      working = { ...working, [constraint.field]: corrected };
    }
  }

  return working;
}

/**
 * Clamp a single dimension value against the min/max/step constraints for its
 * field in the given constraint set.  Useful for live input validation where
 * only one field changes at a time.
 *
 * @param field       The dimension field being updated.
 * @param value       The proposed new value.
 * @param config      The current config (needed for ratio constraints).
 * @param constraints Constraint rules to apply. Defaults to `getDefaultConstraints()`.
 */
export function clampDimension(
  field: DimensionField,
  value: number,
  config: CabinetConfig,
  constraints: DimensionConstraint[] = getDefaultConstraints(),
): number {
  const fieldConstraints = constraints.filter((c) => c.field === field);
  let clamped = value;
  // Build a temporary config with the proposed value for ratio evaluation
  const tempConfig = { ...config, [field]: value };

  for (const constraint of fieldConstraints) {
    if (!isSatisfied(clamped, constraint, tempConfig)) {
      clamped = computeCorrectedValue(clamped, constraint, tempConfig);
    }
  }

  return clamped;
}

/**
 * Return a summary of the valid range for a dimension field under the given
 * constraints and current config context.
 *
 * Useful for rendering slider/input bounds in the configurator UI.
 */
export function getDimensionRange(
  field: DimensionField,
  config: CabinetConfig,
  constraints: DimensionConstraint[] = getDefaultConstraints(),
): { min: number; max: number; step: number } {
  const fieldConstraints = constraints.filter((c) => c.field === field);

  let min = 0;
  let max = Number.MAX_SAFE_INTEGER;
  let step = 1;

  for (const c of fieldConstraints) {
    switch (c.op) {
      case 'min':
        min = Math.max(min, c.value);
        break;
      case 'max':
        max = Math.min(max, c.value);
        break;
      case 'step':
        step = c.value;
        break;
      case 'ratio': {
        if (!c.relatedField) break;
        const related = getFieldValue(config, c.relatedField);
        max = Math.min(max, Math.floor(related * c.value));
        break;
      }
    }
  }

  return { min, max, step };
}
