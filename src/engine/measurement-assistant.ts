/**
 * Sprint 85 — Measurement assistant: ergonomic & best-practice hints.
 *
 * Produces a list of advisory MeasurementHint objects based on the cabinet
 * dimensions and furniture type.  These are positive suggestions (not
 * structural errors — see validation.ts for those).
 *
 * References:
 *   - ISO 9241-5 (ergonomics of work systems)
 *   - BS 8300 (kitchen accessibility)
 *   - IKEA kitchen planning standards (de facto industry reference)
 *
 * NOTE: Pure TypeScript — no React, no DOM, no side effects.
 */

import type { CabinetConfig } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HintLevel = 'tip' | 'ergonomic' | 'standard';

export interface MeasurementHint {
  /** Stable, unique identifier — safe to use as a React key. */
  id: string;
  level: HintLevel;
  /** i18n key used for the display message. */
  messageKey: string;
  /** Interpolation values for the i18n key (all numeric). */
  values?: Record<string, number>;
}

// ─── Standards (mm unless noted) ─────────────────────────────────────────────

const STD = {
  // Kitchen base cabinet
  kitchenBaseHeight: 870, // floor to worktop underside
  kitchenBaseDepth: 600,
  kitchenWorktopGap: 550, // clearance between worktop and overhead unit

  // Kitchen overhead / wall unit
  kitchenWallDepth: 350,
  kitchenWallHeightMin: 600,
  kitchenWallHeightMax: 900,

  // Ergonomic reach zones
  comfortableReachMax: 1700, // top of cabinet from floor (standing reach)
  wheelchairReachMax: 1220, // BS 8300 wheelchair upper reach
  accessibleBaseHeight: 850, // accessible counter height

  // Bookshelf / wardrobe
  bookshelfDepthMin: 220, // A4 paper = 210 mm
  bookshelfDepthMax: 300,
  wardrobeDepthMin: 550, // coats / shirts
  wardrobeDepthMax: 650,

  // Desk
  deskHeightMin: 700,
  deskHeightMax: 760,
  deskDepthMin: 500,

  // Sheet goods standard sizes (mm)
  standardSheetWidths: [1220, 1525, 2440],

  // Min shelf load span (mm) before deflection risk (18 mm sheet)
  maxShelfSpan18mm: 900,
  maxShelfSpan25mm: 1200,
} as const;

// ─── Hint factories ───────────────────────────────────────────────────────────

function tip(id: string, messageKey: string, values?: Record<string, number>): MeasurementHint {
  return { id, level: 'tip', messageKey, values };
}
function ergonomic(id: string, messageKey: string, values?: Record<string, number>): MeasurementHint {
  return { id, level: 'ergonomic', messageKey, values };
}
function standard(id: string, messageKey: string, values?: Record<string, number>): MeasurementHint {
  return { id, level: 'standard', messageKey, values };
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Analyse a CabinetConfig and return advisory measurement hints.
 * Returns at most ~6 hints to avoid overwhelming the user.
 */
export function getMeasurementHints(config: CabinetConfig): MeasurementHint[] {
  const hints: MeasurementHint[] = [];
  const { furnitureType, width, height, depth, shelfCount } = config;

  // ── Cabinet / kitchen base ────────────────────────────────────────────────
  if (furnitureType === 'cabinet') {
    if (height > 700 && height < 1000) {
      // Likely a kitchen base — check standard height
      const diff = Math.abs(height - STD.kitchenBaseHeight);
      if (diff > 30) {
        hints.push(
          standard('cabinet-height', 'measurementAssistant.kitchenBaseHeight', {
            standard: STD.kitchenBaseHeight,
            current: height,
          }),
        );
      }
    }

    if (depth !== STD.kitchenBaseDepth) {
      hints.push(
        tip('cabinet-depth', 'measurementAssistant.kitchenBaseDepth', {
          standard: STD.kitchenBaseDepth,
          current: depth,
        }),
      );
    }

    if (height + STD.kitchenWorktopGap + STD.kitchenWallHeightMin > STD.comfortableReachMax) {
      hints.push(
        ergonomic('cabinet-overhead-gap', 'measurementAssistant.overheadGap', {
          gap: STD.kitchenWorktopGap,
        }),
      );
    }
  }

  // ── Bookshelf ─────────────────────────────────────────────────────────────
  if (furnitureType === 'bookshelf') {
    if (depth < STD.bookshelfDepthMin) {
      hints.push(
        standard('bookshelf-depth-shallow', 'measurementAssistant.bookshelfDepthShallow', {
          min: STD.bookshelfDepthMin,
          current: depth,
        }),
      );
    }
    if (depth > STD.bookshelfDepthMax) {
      hints.push(
        tip('bookshelf-depth-deep', 'measurementAssistant.bookshelfDepthDeep', {
          recommended: STD.bookshelfDepthMax,
          current: depth,
        }),
      );
    }
    if (width > STD.maxShelfSpan18mm && shelfCount > 0) {
      hints.push(
        ergonomic('bookshelf-span', 'measurementAssistant.bookshelfSpan', {
          maxSpan: STD.maxShelfSpan18mm,
          current: width,
        }),
      );
    }
  }

  // ── Wardrobe ──────────────────────────────────────────────────────────────
  if (furnitureType === 'wardrobe') {
    if (depth < STD.wardrobeDepthMin) {
      hints.push(
        standard('wardrobe-depth', 'measurementAssistant.wardrobeDepthShallow', {
          min: STD.wardrobeDepthMin,
          current: depth,
        }),
      );
    }
    if (height > STD.comfortableReachMax) {
      hints.push(
        ergonomic('wardrobe-height', 'measurementAssistant.tallCabinet', {
          max: STD.comfortableReachMax,
          current: height,
        }),
      );
    }
  }

  // ── Desk ──────────────────────────────────────────────────────────────────
  if (furnitureType === 'desk') {
    if (height < STD.deskHeightMin || height > STD.deskHeightMax) {
      hints.push(
        ergonomic('desk-height', 'measurementAssistant.deskHeight', {
          min: STD.deskHeightMin,
          max: STD.deskHeightMax,
          current: height,
        }),
      );
    }
    if (depth < STD.deskDepthMin) {
      hints.push(
        tip('desk-depth', 'measurementAssistant.deskDepth', {
          min: STD.deskDepthMin,
          current: depth,
        }),
      );
    }
  }

  // ── General hints (all types) ─────────────────────────────────────────────

  // Reach zone — top of cabinet
  if (height > STD.comfortableReachMax) {
    hints.push(
      ergonomic('reach-zone', 'measurementAssistant.reachZone', {
        max: STD.comfortableReachMax,
        current: height,
      }),
    );
  }

  // Sheet goods: does width align with a standard sheet width?
  const nearest = STD.standardSheetWidths.reduce((a, b) => (Math.abs(b - width) < Math.abs(a - width) ? b : a));
  if (Math.abs(width - nearest) > 50) {
    hints.push(
      tip('sheet-alignment', 'measurementAssistant.sheetAlignment', {
        nearest,
        current: width,
      }),
    );
  }

  // Return at most 5 hints, prioritised: standard > ergonomic > tip
  const order: HintLevel[] = ['standard', 'ergonomic', 'tip'];
  return hints.sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level)).slice(0, 5);
}
