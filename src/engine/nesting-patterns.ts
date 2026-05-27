/**
 * Sprint 168 — Nesting Pattern Library.
 *
 * Manages a library of reusable cut-nesting patterns. Patterns capture
 * proven arrangements of parts on sheet stock (e.g., "4-drawer fronts on
 * 2440×1220" or "6 shelves + 2 sides on plywood") that can be recalled
 * and applied to new projects.
 *
 * Features:
 *   - Pattern creation from existing cut placements
 *   - Pattern matching (find patterns that fit a given set of parts)
 *   - Pattern scoring (how well a stored pattern fits the current demand)
 *   - Pattern serialization/deserialization (JSON-safe)
 *   - Pattern categories and tags
 *   - Fill-rate and waste metrics
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** A rectangle placement within a pattern. */
export interface PatternPlacement {
  /** Part label or category. */
  label: string;
  /** X position on sheet (mm). */
  x: number;
  /** Y position on sheet (mm). */
  y: number;
  /** Width of the placed rectangle (mm). */
  width: number;
  /** Length of the placed rectangle (mm, along grain). */
  length: number;
  /** Whether the part is rotated 90°. */
  rotated: boolean;
}

/** A nesting pattern — a proven arrangement on a sheet. */
export interface NestingPattern {
  /** Unique pattern ID. */
  id: string;
  /** Display name. */
  name: string;
  /** Category (e.g., 'drawer', 'shelf', 'door'). */
  category: string;
  /** Tags for search. */
  tags: string[];
  /** Sheet width (mm). */
  sheetWidth: number;
  /** Sheet length (mm). */
  sheetLength: number;
  /** Placements on the sheet. */
  placements: PatternPlacement[];
  /** Fill rate (0–1). */
  fillRate: number;
  /** Creation timestamp (ISO). */
  createdAt: string;
  /** Optional description. */
  description: string;
}

/** Demand item — a part that needs to be cut. */
export interface DemandItem {
  /** Part label. */
  label: string;
  /** Required width (mm). */
  width: number;
  /** Required length (mm). */
  length: number;
  /** Quantity needed. */
  qty: number;
  /** Whether the part can be rotated. */
  canRotate: boolean;
}

/** Score result from matching a pattern to demand. */
export interface PatternMatchScore {
  /** Pattern ID. */
  patternId: string;
  /** Pattern name. */
  patternName: string;
  /** Fit score (0–1, higher = better fit). */
  fitScore: number;
  /** Number of demand items the pattern can satisfy. */
  satisfiedItems: number;
  /** Total demand items. */
  totalDemand: number;
  /** Waste percentage if this pattern is used. */
  wastePercent: number;
}

/** Pattern library (collection of patterns). */
export interface PatternLibrary {
  /** Library version. */
  version: number;
  /** All stored patterns. */
  patterns: NestingPattern[];
}

/** ID generator type. */
export type IdGenerator = () => string;

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum patterns per library. */
export const MAX_PATTERNS = 200;

/** Maximum placements per pattern. */
export const MAX_PLACEMENTS = 100;

/** Current library version. */
export const LIBRARY_VERSION = 1;

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Create an empty pattern library.
 */
export function createLibrary(): PatternLibrary {
  return { version: LIBRARY_VERSION, patterns: [] };
}

/**
 * Create a nesting pattern from placements.
 *
 * @param name        Pattern name.
 * @param category    Category label.
 * @param sheetWidth  Sheet width in mm.
 * @param sheetLength Sheet length in mm.
 * @param placements  Part placements.
 * @param options     Optional fields.
 * @param idGen       ID generator.
 * @returns New nesting pattern.
 */
export function createPattern(
  name: string,
  category: string,
  sheetWidth: number,
  sheetLength: number,
  placements: PatternPlacement[],
  options: { tags?: string[]; description?: string } = {},
  idGen: IdGenerator = defaultIdGen,
): NestingPattern {
  if (!name.trim()) {
    throw new RangeError('createPattern: name must not be empty');
  }
  if (sheetWidth <= 0 || sheetLength <= 0) {
    throw new RangeError('createPattern: sheet dimensions must be positive');
  }
  if (placements.length > MAX_PLACEMENTS) {
    throw new RangeError(`createPattern: placements exceed maximum of ${MAX_PLACEMENTS}`);
  }

  // Validate placements fit on sheet
  for (const p of placements) {
    if (p.x + p.width > sheetWidth || p.y + p.length > sheetLength) {
      throw new RangeError(`createPattern: placement "${p.label}" at (${p.x},${p.y}) exceeds sheet bounds`);
    }
    if (p.width <= 0 || p.length <= 0) {
      throw new RangeError(`createPattern: placement "${p.label}" has non-positive dimensions`);
    }
  }

  const sheetArea = sheetWidth * sheetLength;
  const usedArea = placements.reduce((sum, p) => sum + p.width * p.length, 0);
  const fillRate = Math.round((usedArea / sheetArea) * 1000) / 1000;

  return {
    id: idGen(),
    name: name.trim(),
    category,
    tags: options.tags ?? [],
    sheetWidth,
    sheetLength,
    placements,
    fillRate,
    createdAt: new Date().toISOString(),
    description: options.description ?? '',
  };
}

/**
 * Add a pattern to the library.
 *
 * @param library  Current library.
 * @param pattern  Pattern to add.
 * @returns Updated library.
 */
export function addPattern(library: PatternLibrary, pattern: NestingPattern): PatternLibrary {
  if (library.patterns.length >= MAX_PATTERNS) {
    throw new RangeError(`addPattern: library full (max ${MAX_PATTERNS})`);
  }
  if (library.patterns.some((p) => p.id === pattern.id)) {
    throw new RangeError(`addPattern: pattern "${pattern.id}" already exists`);
  }

  return { ...library, patterns: [...library.patterns, pattern] };
}

/**
 * Remove a pattern from the library.
 *
 * @param library    Current library.
 * @param patternId  ID of pattern to remove.
 * @returns Updated library.
 */
export function removePattern(library: PatternLibrary, patternId: string): PatternLibrary {
  const filtered = library.patterns.filter((p) => p.id !== patternId);
  if (filtered.length === library.patterns.length) {
    throw new RangeError(`removePattern: pattern "${patternId}" not found`);
  }
  return { ...library, patterns: filtered };
}

/**
 * Find patterns that match a given sheet size.
 *
 * @param library     Pattern library.
 * @param sheetWidth  Target sheet width.
 * @param sheetLength Target sheet length.
 * @returns Matching patterns.
 */
export function findBySheet(library: PatternLibrary, sheetWidth: number, sheetLength: number): NestingPattern[] {
  return library.patterns.filter((p) => p.sheetWidth === sheetWidth && p.sheetLength === sheetLength);
}

/**
 * Find patterns by category.
 *
 * @param library  Pattern library.
 * @param category Category to filter by.
 * @returns Matching patterns.
 */
export function findByCategory(library: PatternLibrary, category: string): NestingPattern[] {
  return library.patterns.filter((p) => p.category === category);
}

/**
 * Find patterns by tag.
 *
 * @param library Pattern library.
 * @param tag     Tag to search for.
 * @returns Matching patterns.
 */
export function findByTag(library: PatternLibrary, tag: string): NestingPattern[] {
  const lower = tag.toLowerCase();
  return library.patterns.filter((p) => p.tags.some((t) => t.toLowerCase() === lower));
}

/**
 * Score how well each pattern in the library fits a set of demand items.
 *
 * @param library     Pattern library.
 * @param demand      Parts needed.
 * @param sheetWidth  Target sheet width.
 * @param sheetLength Target sheet length.
 * @returns Scored matches, sorted best-first.
 */
export function scorePatterns(
  library: PatternLibrary,
  demand: DemandItem[],
  sheetWidth: number,
  sheetLength: number,
): PatternMatchScore[] {
  const candidates = findBySheet(library, sheetWidth, sheetLength);
  const totalDemand = demand.reduce((s, d) => s + d.qty, 0);

  const scores: PatternMatchScore[] = candidates.map((pattern) => {
    let satisfiedItems = 0;

    // Count how many demand items this pattern can satisfy
    const remainingDemand = demand.map((d) => ({ ...d }));
    for (const placement of pattern.placements) {
      for (const item of remainingDemand) {
        if (item.qty <= 0) continue;
        const fits = partFitsPlacement(item, placement);
        if (fits) {
          item.qty--;
          satisfiedItems++;
          break;
        }
      }
    }

    const fitScore = totalDemand > 0 ? satisfiedItems / totalDemand : 0;
    const wastePercent = Math.round((1 - pattern.fillRate) * 100);

    return {
      patternId: pattern.id,
      patternName: pattern.name,
      fitScore: Math.round(fitScore * 1000) / 1000,
      satisfiedItems,
      totalDemand,
      wastePercent,
    };
  });

  return scores.sort((a, b) => b.fitScore - a.fitScore);
}

/**
 * Get all unique categories in the library.
 *
 * @param library Pattern library.
 * @returns Sorted category list.
 */
export function getCategories(library: PatternLibrary): string[] {
  const cats = new Set(library.patterns.map((p) => p.category));
  return [...cats].sort();
}

/**
 * Get all unique tags in the library.
 *
 * @param library Pattern library.
 * @returns Sorted tag list.
 */
export function getTags(library: PatternLibrary): string[] {
  const tags = new Set(library.patterns.flatMap((p) => p.tags));
  return [...tags].sort();
}

/**
 * Compute library statistics.
 *
 * @param library Pattern library.
 * @returns Stats summary.
 */
export function getLibraryStats(library: PatternLibrary): {
  totalPatterns: number;
  categories: number;
  avgFillRate: number;
  bestFillRate: number;
  worstFillRate: number;
} {
  const patterns = library.patterns;
  if (patterns.length === 0) {
    return { totalPatterns: 0, categories: 0, avgFillRate: 0, bestFillRate: 0, worstFillRate: 0 };
  }

  const fillRates = patterns.map((p) => p.fillRate);
  const avgFillRate = Math.round((fillRates.reduce((a, b) => a + b, 0) / fillRates.length) * 1000) / 1000;
  const bestFillRate = Math.max(...fillRates);
  const worstFillRate = Math.min(...fillRates);

  return {
    totalPatterns: patterns.length,
    categories: getCategories(library).length,
    avgFillRate,
    bestFillRate,
    worstFillRate,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

let idSeq = 0;
function defaultIdGen(): string {
  return `pat-${Date.now()}-${++idSeq}`;
}

function partFitsPlacement(item: DemandItem, placement: PatternPlacement): boolean {
  // Direct fit
  if (item.width <= placement.width && item.length <= placement.length) {
    return true;
  }
  // Rotated fit (if allowed)
  if (item.canRotate && item.length <= placement.width && item.width <= placement.length) {
    return true;
  }
  return false;
}
