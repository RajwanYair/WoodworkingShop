/**
 * Sprint 27 — Drawer runner load validator.
 *
 * Validates the selected drawer slide type against the design load and
 * drawer box depth per manufacturer specifications.  Returns a structured
 * `Result` — either a pass with the applied spec, or an error with a
 * recommended alternative.
 *
 * Pure function — no React, no side effects.
 *
 * Load spec sources:
 *   - Blum TANDEM plus BLUMOTION (563H): 50 kg rated load, requires ≥ 270 mm depth
 *   - Blum MOVENTO full-extension: 70 kg rated load, requires ≥ 250 mm depth
 *   - Grass Nova Pro Scala: 40 kg rated load
 *   - Generic soft-close (market average): 35 kg rated load
 *   - Generic standard: 25 kg rated load
 */

import { asKg, asMm } from './types';
import type { Mm, Kg, Result } from './types';
import { ok, err } from './types';
import type { DrawerSlideType } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DrawerRunnerSpec {
  slideType: DrawerSlideType;
  /** Maximum rated load per pair (kg). */
  maxLoadKg: Kg;
  /** Minimum recommended drawer depth (mm). */
  minDepthMm: Mm;
  /** True when full-extension (drawer comes fully out of carcass). */
  fullExtension: boolean;
  /** True when integrated soft-close damper is assumed. */
  softClose: boolean;
  /** Human-readable spec description. */
  description: { en: string; he: string };
}

export interface DrawerRunnerValidation {
  /** The spec used for validation. */
  spec: DrawerRunnerSpec;
  /** true when all checks pass. */
  valid: boolean;
  /** Percentage of rated load being used (0–100). */
  loadUtilisationPct: number;
  /** List of passed checks. */
  passes: string[];
  /** List of failed checks (empty when valid). */
  failures: string[];
  /** Suggested alternative slide type when validation fails. */
  suggestedAlternative?: DrawerSlideType;
}

export type DrawerRunnerError =
  | { code: 'UNKNOWN_SLIDE_TYPE'; message: string }
  | { code: 'ZERO_DEPTH'; message: string };

// ─── Spec catalogue ──────────────────────────────────────────────────────────

/** Built-in slide specs keyed by `DrawerSlideType`. */
const RUNNER_SPECS: Record<DrawerSlideType, DrawerRunnerSpec> = {
  standard: {
    slideType: 'standard',
    maxLoadKg: asKg(25),
    minDepthMm: asMm(250),
    fullExtension: false,
    softClose: false,
    description: {
      en: 'Standard side-mount runner — 25 kg rated, ¾ extension',
      he: 'מסילה סטנדרטית — עומס 25 ק"ג, פתיחה ¾',
    },
  },
  'soft-close': {
    slideType: 'soft-close',
    maxLoadKg: asKg(35),
    minDepthMm: asMm(270),
    fullExtension: false,
    softClose: true,
    description: {
      en: 'Soft-close side-mount runner — 35 kg rated, ¾ extension',
      he: 'מסילה בסגירה רכה — עומס 35 ק"ג, פתיחה ¾',
    },
  },
  'full-extension': {
    slideType: 'full-extension',
    maxLoadKg: asKg(50),
    minDepthMm: asMm(250),
    fullExtension: true,
    softClose: true,
    description: {
      en: 'Full-extension undermount runner — 50 kg rated, 100% extension, soft-close',
      he: 'מסילה מלאה תחתית — עומס 50 ק"ג, פתיחה 100%, סגירה רכה',
    },
  },
};

// ─── Validation function ──────────────────────────────────────────────────────

/**
 * Validate a drawer runner selection against the design load and drawer depth.
 *
 * @param slideType       Selected slide type.
 * @param loadKg          Expected load the drawer will carry (kg).
 * @param drawerDepthMm   Drawer box depth (inside carcass depth, mm).
 * @returns               `Result<DrawerRunnerValidation, DrawerRunnerError>`
 */
export function validateDrawerRunner(
  slideType: DrawerSlideType,
  loadKg: number,
  drawerDepthMm: number,
): Result<DrawerRunnerValidation, DrawerRunnerError> {
  if (drawerDepthMm <= 0) {
    return err({ code: 'ZERO_DEPTH', message: 'Drawer depth must be greater than 0 mm.' });
  }

  const spec = RUNNER_SPECS[slideType];
  if (!spec) {
    return err({ code: 'UNKNOWN_SLIDE_TYPE', message: `Unknown slide type: ${slideType}` });
  }

  const passes: string[] = [];
  const failures: string[] = [];

  // Check 1: load within rated capacity
  const loadUtilisationPct = Math.round((loadKg / spec.maxLoadKg) * 100);
  if (loadKg <= spec.maxLoadKg) {
    passes.push(`Load ${loadKg} kg ≤ rated ${spec.maxLoadKg} kg (${loadUtilisationPct}% utilisation)`);
  } else {
    failures.push(`Load ${loadKg} kg exceeds rated ${spec.maxLoadKg} kg (${loadUtilisationPct}% utilisation)`);
  }

  // Check 2: drawer depth sufficient for runner
  if (drawerDepthMm >= spec.minDepthMm) {
    passes.push(`Drawer depth ${drawerDepthMm} mm ≥ minimum ${spec.minDepthMm} mm`);
  } else {
    failures.push(`Drawer depth ${drawerDepthMm} mm is below minimum ${spec.minDepthMm} mm for this runner`);
  }

  const valid = failures.length === 0;

  // Suggest an upgrade when load exceeds current spec
  let suggestedAlternative: DrawerSlideType | undefined;
  if (!valid && loadKg > spec.maxLoadKg) {
    // Pick the lowest-rated spec that can handle the load
    const alternatives = (Object.entries(RUNNER_SPECS) as [DrawerSlideType, DrawerRunnerSpec][])
      .filter(([t, s]) => t !== slideType && s.maxLoadKg >= loadKg)
      .sort(([, a], [, b]) => a.maxLoadKg - b.maxLoadKg);
    suggestedAlternative = alternatives[0]?.[0];
  }

  return ok({ spec, valid, loadUtilisationPct, passes, failures, suggestedAlternative });
}

/**
 * Return the spec for a given slide type.
 * Useful for display purposes in UI components without running a full validation.
 */
export function getDrawerRunnerSpec(slideType: DrawerSlideType): DrawerRunnerSpec {
  return RUNNER_SPECS[slideType] ?? RUNNER_SPECS['standard'];
}

/**
 * Return all available runner specs ordered by rated load ascending.
 */
export function getAllDrawerRunnerSpecs(): DrawerRunnerSpec[] {
  return (Object.values(RUNNER_SPECS) as DrawerRunnerSpec[]).sort((a, b) => a.maxLoadKg - b.maxLoadKg);
}
