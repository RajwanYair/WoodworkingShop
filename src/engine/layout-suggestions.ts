/**
 * AI layout suggestions — Sprint 119 (Phase 27)
 *
 * Pure TypeScript heuristic engine. No ML, no DOM, no React.
 * Analyses a CabinetConfig and returns scored improvement suggestions.
 */
import type { CabinetConfig } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const SUGGESTION_CATEGORIES = {
  dimensions: 'dimensions',
  shelving: 'shelving',
  drawers: 'drawers',
  materials: 'materials',
  hardware: 'hardware',
  ergonomics: 'ergonomics',
} as const;

export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[keyof typeof SUGGESTION_CATEGORIES];

export interface LayoutSuggestion {
  /** Stable id for deduplication. */
  readonly id: string;
  /** Heuristic category. */
  readonly category: SuggestionCategory;
  /** i18n key for the suggestion text (in suggestions.* namespace). */
  readonly messageKey: string;
  /** Template variables for the i18n message. */
  readonly params: Readonly<Record<string, unknown>>;
  /**
   * Score in [0, 1]: higher = more important to address.
   * Used to sort and optionally filter suggestions.
   */
  readonly score: number;
}

/** Optional context fed into the heuristic engine. */
export interface SuggestionContext {
  /** Room height in mm (for ergonomic ceiling-clearance checks). */
  roomHeightMm?: number;
  /** Whether cost minimisation is a priority. */
  optimiseForCost?: boolean;
}

// ---------------------------------------------------------------------------
// Internal heuristic helpers
// ---------------------------------------------------------------------------

function suggestion(
  id: string,
  category: SuggestionCategory,
  messageKey: string,
  params: Record<string, unknown>,
  score: number,
): LayoutSuggestion {
  return { id, category, messageKey, params, score: Math.min(1, Math.max(0, score)) };
}

// Ideal shelf spacing: 200–350 mm for most use-cases
const IDEAL_SHELF_GAP_MIN = 200;
const IDEAL_SHELF_GAP_MAX = 350;

// Standard kitchen base height / depth
const STD_KITCHEN_BASE_HEIGHT = 870;
const STD_KITCHEN_BASE_DEPTH = 580;

// Max comfortable reach height
const MAX_REACH_HEIGHT = 1900;

// Ideal drawer-to-height ratio: drawers become useful above ~3 per 700 mm of height
const DRAWER_HEIGHT_RATIO_THRESHOLD = 200; // mm per drawer

// ---------------------------------------------------------------------------
// generateSuggestions
// ---------------------------------------------------------------------------

/**
 * Analyses the cabinet configuration and returns a list of
 * heuristic-based {@link LayoutSuggestion}s.
 *
 * @throws {RangeError} if config is not a plain object.
 */
export function generateSuggestions(config: CabinetConfig, context: SuggestionContext = {}): LayoutSuggestion[] {
  if (typeof config !== 'object' || config === null) {
    throw new RangeError('config must be a non-null object');
  }

  const suggestions: LayoutSuggestion[] = [];
  const { width, height, depth, shelfCount, drawerCount, furnitureType, kickHeight } = config;
  const { roomHeightMm, optimiseForCost = false } = context;

  // ── Shelf spacing ─────────────────────────────────────────────────────────
  if (shelfCount > 0) {
    // Internal height approximation (subtract 2 × 18 mm panels)
    const internalHeight = height - 36;
    // Number of gaps = shelfCount + 1 (below first shelf, between each, above last)
    const gapCount = shelfCount + 1;
    const avgGap = internalHeight / gapCount;

    if (avgGap < IDEAL_SHELF_GAP_MIN) {
      suggestions.push(
        suggestion(
          'shelf-too-crowded',
          'shelving',
          'suggestions.shelfTooClose',
          { avgGapMm: Math.round(avgGap), minMm: IDEAL_SHELF_GAP_MIN },
          0.7,
        ),
      );
    } else if (avgGap > IDEAL_SHELF_GAP_MAX && shelfCount < 3) {
      suggestions.push(
        suggestion(
          'shelf-too-sparse',
          'shelving',
          'suggestions.shelfTooFar',
          { avgGapMm: Math.round(avgGap), maxMm: IDEAL_SHELF_GAP_MAX },
          0.5,
        ),
      );
    }
  }

  // ── Drawer count vs height ────────────────────────────────────────────────
  if (furnitureType === 'cabinet' || furnitureType === 'desk') {
    const maxUsefulDrawers = Math.floor(height / DRAWER_HEIGHT_RATIO_THRESHOLD);
    if (drawerCount > maxUsefulDrawers) {
      suggestions.push(
        suggestion(
          'too-many-drawers',
          'drawers',
          'suggestions.tooManyDrawers',
          { drawerCount, maxUseful: maxUsefulDrawers, heightMm: height },
          0.8,
        ),
      );
    } else if (drawerCount === 0 && height >= 700 && furnitureType === 'cabinet') {
      suggestions.push(suggestion('add-drawers', 'drawers', 'suggestions.addDrawers', { heightMm: height }, 0.35));
    }
  }

  // ── Kitchen base dimensions ───────────────────────────────────────────────
  if (furnitureType === 'cabinet' && height >= 700 && height <= 1000) {
    if (Math.abs(height - STD_KITCHEN_BASE_HEIGHT) > 30) {
      suggestions.push(
        suggestion(
          'kitchen-height',
          'dimensions',
          'suggestions.kitchenBaseHeight',
          { current: height, standard: STD_KITCHEN_BASE_HEIGHT },
          0.6,
        ),
      );
    }
    if (depth < STD_KITCHEN_BASE_DEPTH - 30 || depth > STD_KITCHEN_BASE_DEPTH + 30) {
      suggestions.push(
        suggestion(
          'kitchen-depth',
          'dimensions',
          'suggestions.kitchenBaseDepth',
          { current: depth, standard: STD_KITCHEN_BASE_DEPTH },
          0.55,
        ),
      );
    }
  }

  // ── Ergonomic reach zone ──────────────────────────────────────────────────
  if (height > MAX_REACH_HEIGHT) {
    suggestions.push(
      suggestion('reach-zone', 'ergonomics', 'suggestions.reachZone', { current: height, max: MAX_REACH_HEIGHT }, 0.65),
    );
  }

  // ── Ceiling clearance ─────────────────────────────────────────────────────
  if (roomHeightMm !== undefined && roomHeightMm > 0) {
    const clearance = roomHeightMm - height - (kickHeight ?? 0);
    if (clearance < 50 && clearance >= 0) {
      suggestions.push(
        suggestion(
          'ceiling-clearance',
          'ergonomics',
          'suggestions.lowClearance',
          { clearanceMm: Math.round(clearance) },
          0.75,
        ),
      );
    } else if (clearance < 0) {
      suggestions.push(
        suggestion(
          'ceiling-exceeds',
          'ergonomics',
          'suggestions.exceedsCeiling',
          { overMm: Math.round(-clearance) },
          1.0,
        ),
      );
    }
  }

  // ── Wide span (shelf deflection risk) ─────────────────────────────────────
  if (width > 900 && shelfCount > 0) {
    suggestions.push(suggestion('wide-span', 'shelving', 'suggestions.wideSpanRisk', { widthMm: width }, 0.65));
  }

  // ── Cost optimisation: material upgrade suggestion ────────────────────────
  if (!optimiseForCost && config.carcassMaterial.startsWith('plywood')) {
    // Plywood is good quality — if user cares about cost, melamine is cheaper
    suggestions.push(suggestion('cost-material', 'materials', 'suggestions.costMaterialAlternative', {}, 0.2));
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// scoreSuggestion
// ---------------------------------------------------------------------------

/** Returns the numeric score of a suggestion (convenience accessor). */
export function scoreSuggestion(s: LayoutSuggestion): number {
  return s.score;
}

// ---------------------------------------------------------------------------
// filterSuggestions
// ---------------------------------------------------------------------------

/**
 * Returns only suggestions with score ≥ minScore (default 0.4),
 * sorted descending by score.
 *
 * @throws {RangeError} if minScore is outside [0, 1].
 */
export function filterSuggestions(suggestions: ReadonlyArray<LayoutSuggestion>, minScore = 0.4): LayoutSuggestion[] {
  if (minScore < 0 || minScore > 1) {
    throw new RangeError(`minScore must be in [0, 1], got ${minScore}`);
  }
  return [...suggestions].filter((s) => s.score >= minScore).sort((a, b) => b.score - a.score);
}
