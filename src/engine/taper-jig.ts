/**
 * Taper Jig Calculator — Sprint 230
 *
 * Calculates tablesaw taper-jig settings for cutting tapered workpieces
 * such as furniture legs, tapered table aprons, or decorative columns.
 *
 * The jig is set so the far end of the workpiece is offset from the fence
 * by jigOffsetMm. For a two-sided (symmetric) taper the workpiece is flipped
 * after the first pass; each pass removes half the total material.
 *
 *   totalRemoval       = startWidth − endWidth
 *   jigOffset          = totalRemoval          (1-face)
 *                      = totalRemoval / 2      (per face, 2-face)
 *   taperAngleDeg      = atan(jigOffset / workpieceLength) × (180 / π)
 *   taperPerFoot       = (jigOffset / workpieceLength) × 304.8
 */

import { assertGreaterThan, assertLessThan } from './invariant';

export interface TaperJigInput {
  /** Total length of the workpiece to be tapered in mm */
  workpieceLengthMm: number;
  /** Width at the wide end (the starting width) in mm */
  startWidthMm: number;
  /** Desired width at the narrow end in mm */
  endWidthMm: number;
  /** Number of faces to taper: 1 (single-sided) or 2 (symmetric) — default 1 */
  taperedFaces?: 1 | 2;
}

export interface TaperJigResult {
  /** Taper angle in degrees */
  taperAngleDeg: number;
  /** Jig offset at the tip of the workpiece in mm (distance to pivot the sled) */
  jigOffsetMm: number;
  /** Material removed per linear foot (304.8 mm) in mm */
  taperPerFootMm: number;
  /** Total material removed per tapered face in mm */
  materialRemovedPerFaceMm: number;
  /** Number of tapered faces in the result */
  taperedFaces: 1 | 2;
}

export function calculateTaperJig(input: TaperJigInput): TaperJigResult {
  const fn = 'calculateTaperJig';
  const { workpieceLengthMm, startWidthMm, endWidthMm, taperedFaces = 1 } = input;

  assertGreaterThan(fn, 'workpieceLengthMm', workpieceLengthMm, 0);
  assertGreaterThan(fn, 'startWidthMm', startWidthMm, 0);
  assertGreaterThan(fn, 'endWidthMm', endWidthMm, 0);
  assertLessThan(fn, 'endWidthMm', endWidthMm, startWidthMm);

  const totalRemovalMm = startWidthMm - endWidthMm;
  const materialRemovedPerFaceMm = taperedFaces === 2 ? totalRemovalMm / 2 : totalRemovalMm;
  const jigOffsetMm = materialRemovedPerFaceMm;
  const taperAngleDeg = Math.atan(jigOffsetMm / workpieceLengthMm) * (180 / Math.PI);
  const taperPerFootMm = (jigOffsetMm / workpieceLengthMm) * 304.8;

  return {
    taperAngleDeg: Math.round(taperAngleDeg * 100) / 100,
    jigOffsetMm: Math.round(jigOffsetMm * 10) / 10,
    taperPerFootMm: Math.round(taperPerFootMm * 10) / 10,
    materialRemovedPerFaceMm: Math.round(materialRemovedPerFaceMm * 10) / 10,
    taperedFaces,
  };
}
