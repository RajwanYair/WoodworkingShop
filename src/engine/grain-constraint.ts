import type { Part } from './types';

/**
 * Apply per-part grain direction constraints to a parts list.
 *
 * The cut optimizer already respects material-level grain via `rotationLocked`.
 * This function maps the higher-level `grainConstraint` field to the concrete
 * `rotationLocked` flag consumed by the optimizer, and swaps `length`/`width`
 * for parts that specify `'along-width'` (so the optimizer receives them with
 * grain already running in the correct orientation).
 *
 * This is a pure, side-effect-free transform that runs before
 * `optimizeCutSheets`.
 *
 * @param parts - Input parts list (not mutated).
 * @returns New parts list with `grainConstraint` translated to `rotationLocked`
 *          and dimensions adjusted where necessary.
 */
export function applyGrainConstraints(parts: Part[]): Part[] {
  return parts.map((p) => {
    if (p.grainConstraint === undefined) return p;

    if (p.grainConstraint === 'along-length') {
      // Grain must run along the length axis → rotation is forbidden.
      return { ...p, rotationLocked: true };
    }

    // grainConstraint === 'along-width':
    // Grain must run along the width axis.  Swap length ↔ width so that the
    // optimizer receives the part with the grain running along the length
    // (Y-axis) as required by the coordinate system, then lock rotation.
    return {
      ...p,
      length: p.width,
      width: p.length,
      rotationLocked: true,
    };
  });
}

/**
 * Validate that a `grainConstraint` value is a recognised variant.
 *
 * @param value - The value to validate (from user input / JSON import).
 * @returns The validated constraint or `undefined` if the value is absent.
 * @throws RangeError When `value` is a non-empty string that is not a valid variant.
 */
export function validateGrainConstraint(value: unknown): 'along-length' | 'along-width' | undefined {
  if (value === undefined || value === null) return undefined;
  if (value === 'along-length' || value === 'along-width') return value;
  const safe = typeof value === 'string' ? value : '[non-string]';
  throw new RangeError(
    `validateGrainConstraint: invalid value "${safe}" — expected 'along-length', 'along-width', or undefined`,
  );
}
