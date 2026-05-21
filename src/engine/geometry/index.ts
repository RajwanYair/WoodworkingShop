/**
 * Phase 12 / Sprint 8 — Engine geometry sub-module barrel.
 * Covers: dimension computation and part generation.
 *
 * @example
 * ```ts
 * import { computeDimensions, generateParts } from '../engine/geometry';
 * ```
 */
export {
  computeDimensions,
  computeHingesPerDoor,
  computeHingePositions,
  computeEqualShelfPositions,
} from '../dimensions.ts';

export { generateParts, computeEdgeBandingTotal, computePartsWeight } from '../parts.ts';
