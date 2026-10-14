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
} from './dimensions.ts';

export { generateParts, computeEdgeBandingTotal, computePartsWeight } from './parts.ts';

export { calculateShelfSpacing, getShelfPresets, getShelfPreset, SHELF_PRESETS } from './shelf-spacing';

export type { ShelfPresetId, ShelfPreset, ShelfSpacingResult } from './shelf-spacing';

export { calculateCabinetDoor, recommendDoorCount } from './cabinet-door';

export type { DoorOverlay, CabinetDoorInput, DoorLeafResult, CabinetDoorResult } from './cabinet-door';

export { calculateDrawerBox } from './drawer-box';

export type { DrawerBoxInput, DrawerBoxResult } from './drawer-box';
