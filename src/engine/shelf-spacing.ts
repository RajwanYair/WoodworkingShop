/**
 * Sprint 30 — Smart shelf spacing presets engine.
 *
 * Calculates optimal shelf intervals for common storage use-cases:
 *   - Standard books (240 mm clearance per shelf)
 *   - Large/art books (330 mm clearance)
 *   - Paperback books (180 mm clearance)
 *   - Dishes / crockery (280 mm clearance with reinforced shelves)
 *   - Wine bottles (horizontal — 100 mm pitch)
 *   - Garments folded (350 mm clearance)
 *   - Garments hanging (1000 mm minimum clear height)
 *   - Children's toys (200 mm clearance)
 *   - Custom (user-supplied clearance)
 *
 * Returns an array of shelf positions (mm from cabinet bottom, inside
 * carcass) and any shelf count / material warnings.
 *
 * Pure function — no React, no side effects.
 */

import { asMm } from './types';
import type { Mm } from './types';

// ─── Preset catalogue ─────────────────────────────────────────────────────────

export type ShelfPresetId =
  | 'books-standard'
  | 'books-large'
  | 'books-paperback'
  | 'dishes'
  | 'wine-horizontal'
  | 'garments-folded'
  | 'garments-hanging'
  | 'toys'
  | 'custom';

export interface ShelfPreset {
  id: ShelfPresetId;
  name: { en: string; he: string };
  /** Clear height between shelves (mm). */
  clearancePerShelfMm: number;
  /** Recommended minimum shelf thickness (mm) for the load type. */
  minThicknessMm: number;
  /** True when an even item count across the height is strongly preferred. */
  uniformOnly: boolean;
  /** Advisory note shown to the user. */
  note: { en: string; he: string };
}

/** Built-in shelf-spacing presets, ordered from tightest to widest nominal pitch. */
export const SHELF_PRESETS: Readonly<ShelfPreset[]> = [
  {
    id: 'books-standard',
    name: { en: 'Standard Books', he: 'ספרים רגילים' },
    clearancePerShelfMm: 240,
    minThicknessMm: 18,
    uniformOnly: false,
    note: {
      en: 'A4 height + 20 mm clearance. Suitable for novels, textbooks, binders.',
      he: 'גובה A4 + פינוי 20 מ"מ. מתאים לרומנים, ספרי לימוד, קלסרים.',
    },
  },
  {
    id: 'books-large',
    name: { en: 'Large / Art Books', he: 'ספרים גדולים / ספרי אמנות' },
    clearancePerShelfMm: 330,
    minThicknessMm: 18,
    uniformOnly: false,
    note: {
      en: '310 mm book height + 20 mm clearance.',
      he: 'ספרים גבוהים 310 מ"מ + פינוי 20 מ"מ.',
    },
  },
  {
    id: 'books-paperback',
    name: { en: 'Paperbacks', he: 'ספרים כיס' },
    clearancePerShelfMm: 180,
    minThicknessMm: 18,
    uniformOnly: false,
    note: {
      en: '160 mm book height + 20 mm clearance.',
      he: 'ספרים 160 מ"מ + פינוי 20 מ"מ.',
    },
  },
  {
    id: 'dishes',
    name: { en: 'Dishes & Crockery', he: 'צלחות וכלי שולחן' },
    clearancePerShelfMm: 280,
    minThicknessMm: 18,
    uniformOnly: false,
    note: {
      en: 'Stack height ~250 mm + 30 mm clearance.  Use 18 mm thick shelves minimum.',
      he: 'גובה ערימה ~250 מ"מ + 30 מ"מ פינוי. מינימום מדף 18 מ"מ.',
    },
  },
  {
    id: 'wine-horizontal',
    name: { en: 'Wine (Horizontal)', he: 'יין (אחסון שכוב)' },
    clearancePerShelfMm: 100,
    minThicknessMm: 18,
    uniformOnly: true,
    note: {
      en: '75 mm bottle diameter + 25 mm clearance.  Horizontal row storage.',
      he: 'קוטר בקבוק 75 מ"מ + 25 מ"מ פינוי. אחסון שורות שכובות.',
    },
  },
  {
    id: 'garments-folded',
    name: { en: 'Folded Garments', he: 'בגדים מקופלים' },
    clearancePerShelfMm: 350,
    minThicknessMm: 18,
    uniformOnly: false,
    note: {
      en: '320 mm stack height + 30 mm clearance.',
      he: 'ערימת קיפול 320 מ"מ + 30 מ"מ פינוי.',
    },
  },
  {
    id: 'garments-hanging',
    name: { en: 'Hanging Garments', he: 'תלייה' },
    clearancePerShelfMm: 1000,
    minThicknessMm: 18,
    uniformOnly: true,
    note: {
      en: 'Requires at least 1000 mm clear height for a hanging rail.  Usually 1 rail only.',
      he: 'נדרש פינוי 1000 מ"מ לפחות לפס תליה. לרוב פס אחד בלבד.',
    },
  },
  {
    id: 'toys',
    name: { en: "Children's Toys", he: 'צעצועים' },
    clearancePerShelfMm: 200,
    minThicknessMm: 18,
    uniformOnly: false,
    note: {
      en: 'Variable box heights — 200 mm default clearance is a reasonable starting point.',
      he: 'גבהי קופסאות משתנים — 200 מ"מ כנקודת התחלה סבירה.',
    },
  },
];

// ─── Result types ──────────────────────────────────────────────────────────────

export interface ShelfSpacingResult {
  /** Calculated shelf positions (mm from cabinet bottom, inside carcass). */
  positions: Mm[];
  /** Number of shelves that fit. */
  shelfCount: number;
  /** Actual clearance used per shelf (mm) — may differ from requested if clamped. */
  actualClearanceMm: number;
  /** True when at least one shelf fits. */
  fitsAtLeastOne: boolean;
  /** Any advisory warnings (e.g. material too thin). */
  warnings: { en: string; he: string }[];
}

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Calculate optimal shelf positions for a given preset inside a cabinet.
 *
 * @param presetId        Shelf preset identifier.
 * @param internalHeightMm  Available internal height of the cabinet (mm).
 * @param materialThicknessMm  Shelf material thickness (mm) — affects stack clearance.
 * @param customClearanceMm  Required when `presetId === 'custom'`.
 */
export function calculateShelfSpacing(
  presetId: ShelfPresetId,
  internalHeightMm: number,
  materialThicknessMm: number,
  customClearanceMm?: number,
): ShelfSpacingResult {
  const preset = SHELF_PRESETS.find((p) => p.id === presetId);
  const clearance = presetId === 'custom' ? (customClearanceMm ?? 250) : (preset?.clearancePerShelfMm ?? 250);
  const minThick = preset?.minThicknessMm ?? 18;

  const warnings: { en: string; he: string }[] = [];

  if (materialThicknessMm < minThick) {
    warnings.push({
      en: `Shelf material ${materialThicknessMm} mm is below recommended ${minThick} mm for this storage type.`,
      he: `עובי מדף ${materialThicknessMm} מ"מ נמוך מהמינימום המומלץ ${minThick} מ"מ עבור סוג אחסון זה.`,
    });
  }

  // Pitch = clearance + shelf thickness
  const pitch = clearance + materialThicknessMm;
  const maxShelves = Math.floor((internalHeightMm - clearance) / pitch);
  const shelfCount = Math.max(0, maxShelves);

  const positions: Mm[] = [];
  if (shelfCount > 0) {
    // Distribute evenly within available height
    const span = internalHeightMm - clearance;
    for (let i = 0; i < shelfCount; i++) {
      const pos = Math.round(pitch / 2 + (i * span) / shelfCount);
      positions.push(asMm(pos));
    }
  }

  return {
    positions,
    shelfCount,
    actualClearanceMm: clearance,
    fitsAtLeastOne: shelfCount > 0,
    warnings,
  };
}

/** Return all preset definitions. */
export function getShelfPresets(): Readonly<ShelfPreset[]> {
  return SHELF_PRESETS;
}

/** Return a single preset definition by id. */
export function getShelfPreset(id: ShelfPresetId): ShelfPreset | undefined {
  return SHELF_PRESETS.find((p) => p.id === id);
}
