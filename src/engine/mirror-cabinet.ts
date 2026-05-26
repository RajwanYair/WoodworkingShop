/**
 * Sprint 93 — Cabinet Mirror utility.
 *
 * Produces a mirrored variant of a CabinetConfig.  The physical parts of a
 * rectangular cabinet are identical whether it is left-hand or right-hand
 * oriented; the mirror flag is used by the assembly instructions and
 * labelling to indicate that doors/drawers open on the opposite side.
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

import type { CabinetConfig } from './types';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Return a shallow copy of `config` with the `isMirrored` flag toggled.
 *
 * When `config.isMirrored` is `true` (already a mirror), calling this
 * function restores the original orientation (`isMirrored: false`).
 *
 * @example
 * const twin = mirrorConfig(leftHandUnit);
 * // twin.isMirrored === true
 */
export function mirrorConfig(config: CabinetConfig): CabinetConfig {
  return { ...config, isMirrored: !config.isMirrored };
}

/**
 * Produce a display label for a mirrored cabinet name.
 *
 * - No existing mirror suffix → append `(mirror)`.
 * - Bare `(mirror)` suffix → append `(mirror 2)`.
 * - Numbered `(mirror N)` suffix → increment N.
 *
 * @example
 * mirrorName('Base Cabinet')            → 'Base Cabinet (mirror)'
 * mirrorName('Base Cabinet (mirror)')   → 'Base Cabinet (mirror 2)'
 * mirrorName('Base Cabinet (mirror 2)') → 'Base Cabinet (mirror 3)'
 */
export function mirrorName(sourceName: string): string {
  const numMatch = /\s*\(mirror\s+(\d+)\)\s*$/.exec(sourceName);
  if (numMatch) {
    const base = sourceName.slice(0, numMatch.index);
    return `${base} (mirror ${Number(numMatch[1]) + 1})`;
  }
  const bareMatch = /\s*\(mirror\)\s*$/.exec(sourceName);
  if (bareMatch) {
    const base = sourceName.slice(0, bareMatch.index);
    return `${base} (mirror 2)`;
  }
  return `${sourceName} (mirror)`;
}
