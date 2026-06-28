/**
 * Sprint 36 — Grain conflict resolver engine.
 *
 * Detects parts whose grain direction conflicts with structural or aesthetic
 * rules and suggests corrective actions.
 *
 * Rules checked:
 *   1. DOOR_GRAIN_VERTICAL  — door-type parts must have grain running along
 *      the length (vertical). Flag when grainAlongLength is false.
 *   2. SHELF_GRAIN_DEPTH    — shelf-type parts must have grain running along
 *      the depth (width dimension). Flag when grainAlongLength is true AND
 *      lengthMm > widthMm (i.e. grain is across the wrong axis).
 *   3. CARCASS_GRAIN        — carcass panels (sides, tops, bottoms) should
 *      have grain vertical (along height/lengthMm). Flag otherwise.
 *   4. CROSS_GRAIN_TOO_WIDE — any panel with cross-grain width > threshold
 *      (default 600 mm) risks wood movement issues.
 *
 * Pure function — no React, no side effects.
 */

// ─── Input ────────────────────────────────────────────────────────────────────

export interface GrainCheckPart {
  id: string;
  name: { en: string; he: string };
  type: string;
  grainAlongLength: boolean;
  widthMm: number;
  lengthMm: number;
}

export interface GrainConflictOptions {
  /** Maximum cross-grain panel width before raising a movement warning (mm). Default: 600. */
  crossGrainMaxWidthMm?: number;
  /** Part types to treat as "door". Default: ["door", "drawer-front"]. */
  doorTypes?: string[];
  /** Part types to treat as "shelf". Default: ["shelf", "fixed-shelf"]. */
  shelfTypes?: string[];
  /** Part types to treat as "carcass panel". Default: ["panel", "side", "top", "bottom", "back"]. */
  carcassTypes?: string[];
}

// ─── Output ───────────────────────────────────────────────────────────────────

export type GrainConflictCode =
  'DOOR_GRAIN_HORIZONTAL' | 'SHELF_GRAIN_WRONG' | 'CARCASS_GRAIN_WRONG' | 'CROSS_GRAIN_TOO_WIDE';

export interface GrainConflict {
  partId: string;
  partName: { en: string; he: string };
  code: GrainConflictCode;
  suggestion: { en: string; he: string };
}

// ─── Core ─────────────────────────────────────────────────────────────────────

const DEFAULT_DOOR_TYPES = ['door', 'drawer-front'];
const DEFAULT_SHELF_TYPES = ['shelf', 'fixed-shelf'];
const DEFAULT_CARCASS_TYPES = ['panel', 'side', 'top', 'bottom', 'back'];

/**
 * Analyse a list of parts for grain direction conflicts.
 * Returns an array of conflicts (may be empty if all grain is correct).
 */
export function resolveGrainConflicts(parts: GrainCheckPart[], options: GrainConflictOptions = {}): GrainConflict[] {
  const doorTypes = options.doorTypes ?? DEFAULT_DOOR_TYPES;
  const shelfTypes = options.shelfTypes ?? DEFAULT_SHELF_TYPES;
  const carcassTypes = options.carcassTypes ?? DEFAULT_CARCASS_TYPES;
  const crossGrainMax = options.crossGrainMaxWidthMm ?? 600;

  const conflicts: GrainConflict[] = [];
  const lc = (s: string) => s.toLowerCase();

  for (const part of parts) {
    const type = lc(part.type);

    // Rule 1 — door grain must be vertical (along length)
    if (doorTypes.map(lc).includes(type) && !part.grainAlongLength) {
      conflicts.push({
        partId: part.id,
        partName: part.name,
        code: 'DOOR_GRAIN_HORIZONTAL',
        suggestion: {
          en: `"${part.name.en}" (${part.type}): grain should run vertically (along length). Rotate the part 90°.`,
          he: `"${part.name.he}" (${part.type}): ניב העץ צריך לרוץ אנכית (לאורך). סובב את הלוח 90°.`,
        },
      });
    }

    // Rule 2 — shelf grain should run along the depth (widthMm), not lengthMm
    if (shelfTypes.map(lc).includes(type) && part.grainAlongLength && part.lengthMm > part.widthMm) {
      conflicts.push({
        partId: part.id,
        partName: part.name,
        code: 'SHELF_GRAIN_WRONG',
        suggestion: {
          en: `"${part.name.en}" (${part.type}): grain should run along the shelf depth (${part.widthMm} mm). Rotate or re-orient the part.`,
          he: `"${part.name.he}" (${part.type}): ניב העץ צריך לרוץ לאורך עומק המדף (${part.widthMm} מ"מ). שנה כיוון.`,
        },
      });
    }

    // Rule 3 — carcass panel grain must be vertical (along length)
    if (carcassTypes.map(lc).includes(type) && !part.grainAlongLength) {
      conflicts.push({
        partId: part.id,
        partName: part.name,
        code: 'CARCASS_GRAIN_WRONG',
        suggestion: {
          en: `"${part.name.en}" (${part.type}): carcass panel grain should be vertical. Rotate the part.`,
          he: `"${part.name.he}" (${part.type}): ניב לוח הקארקס צריך להיות אנכי. סובב את הלוח.`,
        },
      });
    }

    // Rule 4 — cross-grain panel too wide
    if (!part.grainAlongLength && part.widthMm > crossGrainMax) {
      conflicts.push({
        partId: part.id,
        partName: part.name,
        code: 'CROSS_GRAIN_TOO_WIDE',
        suggestion: {
          en: `"${part.name.en}": cross-grain width ${part.widthMm} mm exceeds ${crossGrainMax} mm. Consider grain-matched edge banding or alternate layout.`,
          he: `"${part.name.he}": רוחב רוחבי-ניב ${part.widthMm} מ"מ עולה על ${crossGrainMax} מ"מ. שקול סרט שפה תואם-ניב.`,
        },
      });
    }
  }

  return conflicts;
}

/** True when zero grain conflicts exist for the given parts. */
export function hasGrainConflicts(parts: GrainCheckPart[], options?: GrainConflictOptions): boolean {
  return resolveGrainConflicts(parts, options).length > 0;
}
