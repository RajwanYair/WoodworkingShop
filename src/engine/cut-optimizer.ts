import type { Part, CutSheet, OptimizationResult, Result, OffcutEntry, DefectZone } from './types';
import { ok, err } from './types';
import { getMaterial, SAW_KERF } from './materials.ts';

/**
 * 2-D Maximal Rectangles bin-packing optimizer (Best Short Side Fit).
 *
 * Replaces the previous strip-based FFD packer (Sprint A3). The MaxRects
 * algorithm keeps a list of maximal empty rectangles per sheet; for every
 * piece it picks the placement minimising the *shorter* leftover side
 * (BSSF), considering both orientations. Critically, before opening a new
 * sheet it re-tries the piece against every free rectangle on every
 * existing sheet — so leftover gaps next to tall vertical strips are
 * actually used.
 *
 * Reference: Jukka Jylänki, "A Thousand Ways to Pack the Bin" (2010),
 * section 4.3. The split step here uses the maximal-rectangles approach
 * (split *every* free rect that intersects the placement, then merge
 * away contained rectangles).
 *
 * Axes: y is along the sheet length (grain direction), x is across.
 */
/**
 * Phase 11 — Same as `optimizeCutSheets` but wraps the result in a
 * `Result<OptimizationResult, string>`. This is the boundary-safe form;
 * callers (workers, store sync-fallback) should prefer it so that an
 * unknown material key surfaces as a typed error rather than an exception.
 */
export function optimizeCutSheetsResult(
  parts: Part[],
  sawKerfMm = SAW_KERF,
  sheetSizeOverrides: Record<string, { width: number; length: number }> = {},
  cutMode: 'guillotine' | 'freeform' = 'freeform',
  offcutCatalog: OffcutEntry[] = [],
  defectZones: Record<string, DefectZone[]> = {},
): Result<OptimizationResult, string> {
  try {
    return ok(optimizeCutSheets(parts, sawKerfMm, sheetSizeOverrides, cutMode, offcutCatalog, defectZones));
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

/**
 * Pack all cabinet parts onto the minimum number of material sheets using the
 * MaxRects BSSF (Best Short Side Fit) bin-packing algorithm.
 *
 * Parts are grouped by material key. Within each group the algorithm maintains
 * a list of maximal free rectangles per sheet; for every piece it selects the
 * placement that minimises the shorter leftover side, trying both orientations
 * (unless `rotationLocked` is set). Before opening a new sheet it re-tries the
 * piece against all existing sheets to exploit leftover gaps.
 *
 * @param parts               - Flat list of cabinet parts to pack. `qty` is
 *                              expanded into individual rects.
 * @param sawKerfMm           - Saw kerf allowance in mm added between cuts
 *                              (default {@link SAW_KERF}).
 * @param sheetSizeOverrides  - Per-material sheet dimension overrides in mm.
 *                              When present, replaces `mat.sheetWidth` /
 *                              `mat.sheetLength` for that material key.
 * @param cutMode             - Packing algorithm: `'freeform'` = MaxRects BSSF
 *                              (default); `'guillotine'` = strip-based FFD.
 * @param offcutCatalog       - Catalog offcuts used as pre-populated starting
 *                              sheets before opening full sheets.
 * @param defectZones         - Per-material defect zones; MaxRects pre-blocks
 *                              these regions on every new sheet.
 * @returns Full optimisation result including all sheets, placed rects, yield
 *          percentage, and waste area per sheet.
 */
export function optimizeCutSheets(
  parts: Part[],
  sawKerfMm = SAW_KERF,
  sheetSizeOverrides: Record<string, { width: number; length: number }> = {},
  cutMode: 'guillotine' | 'freeform' = 'freeform',
  offcutCatalog: OffcutEntry[] = [],
  defectZones: Record<string, DefectZone[]> = {},
): OptimizationResult {
  // Group parts by material key (which implies thickness).
  const groups = new Map<string, { rects: Rect[]; materialKey: string }>();
  for (const p of parts) {
    const group = groups.get(p.material) ?? { rects: [], materialKey: p.material };
    for (let i = 0; i < p.qty; i++) {
      group.rects.push({
        partId: p.id,
        label: p.name.en,
        length: p.length,
        width: p.width,
        edgeBanding: p.edgeBanding.en,
        rotationLocked: p.rotationLocked === true,
      });
    }
    groups.set(p.material, group);
  }

  const allSheets: CutSheet[] = [];
  let sheetIdx = 0;

  for (const [, group] of groups) {
    const mat = getMaterial(group.materialKey);
    const override = sheetSizeOverrides[group.materialKey];
    const sheetLength = override?.length ?? mat.sheetLength;
    const sheetWidth = override?.width ?? mat.sheetWidth;

    // Phase 12 / Sprint 12 — Phase 1: pack on catalog offcuts first.
    let remainingRects = [...group.rects];
    const matchingOffcuts = offcutCatalog
      .filter((o) => o.material === group.materialKey)
      .sort((a, b) => b.width * b.length - a.width * a.length);

    for (const offcut of matchingOffcuts) {
      if (remainingRects.length === 0) break;
      const trialPacked =
        cutMode === 'guillotine'
          ? packGuillotine(remainingRects, offcut.length, offcut.width, sawKerfMm, !mat.hasGrain, mat.hasGrain)
          : packMaxRects(remainingRects, offcut.length, offcut.width, sawKerfMm, !mat.hasGrain, mat.hasGrain);
      const firstSheet = trialPacked[0];
      if (!firstSheet || firstSheet.length === 0) continue;
      // Consume placed parts from remainingRects (count-aware for repeated partIds).
      const consumed = new Map<string, number>();
      for (const p of firstSheet) consumed.set(p.partId, (consumed.get(p.partId) ?? 0) + 1);
      const newRemaining: Rect[] = [];
      for (const r of remainingRects) {
        const c = consumed.get(r.partId) ?? 0;
        if (c > 0) {
          consumed.set(r.partId, c - 1);
        } else {
          newRemaining.push(r);
        }
      }
      remainingRects = newRemaining;
      const offcutArea = offcut.length * offcut.width;
      const usedOnOffcut = firstSheet.reduce((s, r) => s + r.length * r.width, 0);
      allSheets.push({
        sheetIndex: sheetIdx++,
        material: group.materialKey,
        thickness: mat.thickness,
        sheetLength: offcut.length,
        sheetWidth: offcut.width,
        parts: firstSheet.map((r) => ({
          partId: r.partId,
          label: r.label,
          length: r.length,
          width: r.width,
          x: r.x,
          y: r.y,
          edgeBanding: r.edgeBanding,
          grainVertical: !r.rotated,
          rotated: r.rotated,
          grainConflict: r.grainConflict,
          rationale: r.rationale,
          rotationLocked: r.rotationLocked || undefined,
        })),
        yieldPercent: round2((usedOnOffcut / offcutArea) * 100),
      });
    }

    // Phase 2: pack remaining parts on full-size sheets.
    if (remainingRects.length === 0) continue;
    // Convert DefectZone[] (mm coords) to FreeRect[] for the MaxRects pre-blocking step.
    const dzFR: FreeRect[] = (defectZones[group.materialKey] ?? []).map((dz) => ({
      x: dz.x,
      y: dz.y,
      w: dz.width,
      h: dz.length,
    }));
    const packed =
      cutMode === 'guillotine'
        ? packGuillotine(remainingRects, sheetLength, sheetWidth, sawKerfMm, !mat.hasGrain, mat.hasGrain)
        : packMaxRects(remainingRects, sheetLength, sheetWidth, sawKerfMm, !mat.hasGrain, mat.hasGrain, dzFR);

    for (const sheet of packed) {
      const sheetArea = sheetLength * sheetWidth;
      const usedArea = sheet.reduce((s, r) => s + r.length * r.width, 0);
      allSheets.push({
        sheetIndex: sheetIdx++,
        material: group.materialKey,
        thickness: mat.thickness,
        sheetLength,
        sheetWidth,
        parts: sheet.map((r) => ({
          partId: r.partId,
          label: r.label,
          length: r.length,
          width: r.width,
          x: r.x,
          y: r.y,
          edgeBanding: r.edgeBanding,
          grainVertical: !r.rotated,
          rotated: r.rotated,
          grainConflict: r.grainConflict,
          rationale: r.rationale,
          rotationLocked: r.rotationLocked || undefined,
        })),
        yieldPercent: round2((usedArea / sheetArea) * 100),
      });
    }
  }

  const totalArea = allSheets.reduce((s, sh) => s + sh.sheetLength * sh.sheetWidth, 0);
  const usedArea = allSheets.reduce((s, sh) => s + sh.parts.reduce((a, p) => a + p.length * p.width, 0), 0);
  const grainConflictCount = allSheets.reduce((s, sh) => s + sh.parts.filter((p) => p.grainConflict).length, 0);

  return {
    sheets: allSheets,
    totalSheets: allSheets.length,
    overallYield: totalArea > 0 ? round2((usedArea / totalArea) * 100) : 0,
    totalWaste: totalArea - usedArea,
    grainConflictCount,
  };
}

// ─── Internal types & helpers ───

interface Rect {
  partId: string;
  label: string;
  length: number; // along grain (y)
  width: number; // across grain (x)
  edgeBanding?: string;
  /** Sprint 16 — when true this individual part must not be rotated 90° by the packer. */
  rotationLocked?: boolean;
}

interface PlacedRect extends Rect {
  x: number;
  y: number;
  rotated: boolean;
  /** true when this grain-constrained part had to be rotated to fit (grain direction compromised). */
  grainConflict?: boolean;
  /** Human-readable BSSF placement rationale — short/long margin and orientation. */
  rationale?: string;
}

/** An axis-aligned empty rectangle on a sheet. */
interface FreeRect {
  x: number;
  y: number;
  w: number; // along x (sheetWidth axis)
  h: number; // along y (sheetLength axis)
}

interface Sheet {
  placed: PlacedRect[];
  free: FreeRect[];
}

/**
 * Phase 11 / Sprint 5 — Guillotine strip-based packer.
 *
 * Produces cut layouts compatible with a panel saw: every cut runs from one
 * edge of the sheet (or sub-strip) to the other, so no T-cuts or partial
 * cross-cuts are needed.  Algorithm: sort parts by descending length, then
 * pack each part horizontally in a strip.  When the current strip is full,
 * a new horizontal strip is started below (one guillotine cross-cut).  When
 * the sheet is exhausted a new sheet is opened.
 *
 * Trade-off vs MaxRects: yield is typically 5–15 % lower but every cut can
 * be executed on a standard sliding-table saw without repositioning.
 */
function packGuillotine(
  rects: Rect[],
  sheetLength: number,
  sheetWidth: number,
  kerf: number,
  allowRotation = true,
  trackGrainConflicts = false,
): PlacedRect[][] {
  if (rects.length === 0) return [];

  const queue = [...rects].sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return b.length * b.width - a.length * a.width;
  });

  const finishedSheets: PlacedRect[][] = [];
  let currentSheet: PlacedRect[] = [];
  let stripY = 0; // y-origin of the current horizontal strip
  let stripH = 0; // reserved height of the strip (max placed length + kerf)
  let curX = 0; // next available x within the strip

  const openNewSheet = () => {
    if (currentSheet.length > 0) finishedSheets.push(currentSheet);
    currentSheet = [];
    stripY = 0;
    stripH = 0;
    curX = 0;
  };

  for (const rect of queue) {
    const canRotate = allowRotation && rect.rotationLocked !== true;
    let w = rect.width;
    let h = rect.length;
    let rotated = false;
    let grainConflict = false;

    // Try rotation when the natural orientation doesn't fit the sheet.
    if ((w > sheetWidth || h > sheetLength) && canRotate) {
      if (rect.length <= sheetWidth && rect.width <= sheetLength) {
        w = rect.length;
        h = rect.width;
        rotated = true;
      }
    }
    // Grain-conflict forced rotation (grain material, not locked, still doesn't fit).
    if ((w > sheetWidth || h > sheetLength) && trackGrainConflicts && rect.rotationLocked !== true) {
      if (rect.length <= sheetWidth && rect.width <= sheetLength) {
        w = rect.length;
        h = rect.width;
        rotated = true;
        grainConflict = true;
      }
    }

    if (w > sheetWidth || h > sheetLength) {
      console.warn(`Guillotine: Part ${rect.label} (${rect.length}×${rect.width}) exceeds sheet — skipped`);
      continue;
    }

    // Up to 3 placement attempts: current strip → new strip → new sheet.
    for (let attempt = 0; attempt < 3; attempt++) {
      if (curX + w <= sheetWidth && stripY + h <= sheetLength) {
        currentSheet.push({
          ...rect,
          width: w,
          length: h,
          x: curX,
          y: stripY,
          rotated,
          grainConflict: grainConflict || undefined,
          rationale: `Guillotine(${rotated ? 'rotated' : 'normal'}${grainConflict ? ', grain-forced' : ''}): strip y=${stripY}`,
        });
        curX += w + kerf;
        stripH = Math.max(stripH, h + kerf);
        break;
      } else if (curX > 0) {
        // Move down to a new horizontal strip on the same sheet.
        stripY += stripH;
        stripH = 0;
        curX = 0;
      } else {
        // Strip starts at x=0 and the part still doesn't fit — open a new sheet.
        openNewSheet();
      }
    }
  }

  if (currentSheet.length > 0) finishedSheets.push(currentSheet);
  return finishedSheets;
}

function packMaxRects(
  rects: Rect[],
  sheetLength: number,
  sheetWidth: number,
  kerf: number,
  allowRotation = true,
  /**
   * When true (grain materials), attempt a forced rotation as last resort when
   * a part cannot be placed in the preferred orientation; the placed rect is
   * marked `grainConflict: true`.
   */
  trackGrainConflicts = false,
  /**
   * Phase 12 / Sprint 13 — defect zones pre-blocked on every new sheet.
   * Each zone is treated like an opaque pre-placed part: it splits the initial
   * free-rect list so the packer never places parts on top of it.
   */
  initDefectZones: readonly FreeRect[] = [],
): PlacedRect[][] {
  if (rects.length === 0) return [];

  // Sort by descending max-side; ties broken by descending area.
  const queue = [...rects].sort((a, b) => {
    const aMax = Math.max(a.length, a.width);
    const bMax = Math.max(b.length, b.width);
    if (bMax !== aMax) return bMax - aMax;
    return b.length * b.width - a.length * a.width;
  });

  const sheets: Sheet[] = [];

  for (const rect of queue) {
    // Sprint 16 — per-part rotation lock overrides the material-level rotation gate.
    const allowRotForRect = allowRotation && rect.rotationLocked !== true;
    let grainConflict = false;
    let best: {
      sheetIdx: number;
      freeIdx: number;
      x: number;
      y: number;
      w: number;
      h: number;
      rotated: boolean;
      score: number;
      leftoverMin: number;
      leftoverMax: number;
    } | null = null;
    // Prefer the *earliest* (most-filled) sheet: add a large penalty per
    // sheet index so we only open a new sheet when no older sheet fits.
    // Max raw BSSF score ≈ 3000 * 1e6 = 3e9, so 1e12 dominates.
    const SHEET_PREFERENCE_PENALTY = 1e12;
    let bestEffective = Infinity;

    for (let si = 0; si < sheets.length; si++) {
      const candidate = findBestPlacement(sheets[si].free, rect, kerf, allowRotForRect);
      if (candidate) {
        const effective = candidate.score + si * SHEET_PREFERENCE_PENALTY;
        if (effective < bestEffective) {
          best = { sheetIdx: si, ...candidate };
          bestEffective = effective;
        }
      }
    }

    // Grain-conflict fallback: if no normal fit on existing sheets, try forced rotation
    // (only when this part is NOT locked — Sprint 16: locked parts may never be rotated).
    if (!best && trackGrainConflicts && rect.rotationLocked !== true) {
      let bestForcedEffective = Infinity;
      for (let si = 0; si < sheets.length; si++) {
        const candidate = findBestPlacement(sheets[si].free, rect, kerf, true);
        if (candidate) {
          const effective = candidate.score + si * SHEET_PREFERENCE_PENALTY;
          if (effective < bestForcedEffective) {
            best = { sheetIdx: si, ...candidate };
            bestForcedEffective = effective;
            grainConflict = true;
          }
        }
      }
    }

    if (!best) {
      // Open a new sheet. Pre-block any defect zones by splitting the initial
      // free rect around them (Sprint 13 defect avoidance).
      const initFree: FreeRect[] = [{ x: 0, y: 0, w: sheetWidth, h: sheetLength }];
      for (const dz of initDefectZones) {
        splitFreeRects(initFree, dz);
      }
      if (initDefectZones.length > 0) pruneContained(initFree);
      const sheet: Sheet = {
        placed: [],
        free: initFree,
      };
      sheets.push(sheet);
      let candidate = findBestPlacement(sheet.free, rect, kerf, allowRotForRect);
      if (!candidate && trackGrainConflicts && rect.rotationLocked !== true) {
        // Last-resort forced rotation for grain-constrained materials (Sprint 16: locks override).
        candidate = findBestPlacement(sheet.free, rect, kerf, true);
        if (candidate) {
          grainConflict = true;
        }
      }
      if (!candidate) {
        // Piece doesn't even fit on an empty sheet — skip with a warning.
        // (Engine validation should prevent this in normal flow.)
        console.warn(`Part ${rect.label} (${rect.length}×${rect.width}) larger than sheet`);
        continue;
      }
      best = { sheetIdx: sheets.length - 1, ...candidate };
    }

    const sheet = sheets[best.sheetIdx];
    const orientation = best.rotated ? 'rotated' : 'normal';
    const conflictTag = grainConflict ? ', grain-forced' : '';
    const placed: PlacedRect = {
      ...rect,
      length: best.h,
      width: best.w,
      x: best.x,
      y: best.y,
      rotated: best.rotated,
      grainConflict: grainConflict || undefined,
      rationale: `BSSF(${orientation}${conflictTag}): ${Math.round(best.leftoverMin)}mm × ${Math.round(best.leftoverMax)}mm margin`,
    };
    sheet.placed.push(placed);
    splitFreeRects(sheet.free, {
      x: best.x,
      y: best.y,
      w: best.w + kerf,
      h: best.h + kerf,
    });
    pruneContained(sheet.free);
  }

  return sheets.map((s) => s.placed);
}

/**
 * Best Short Side Fit across both orientations: score = min(leftoverX, leftoverY).
 * Lower score wins.
 */
function findBestPlacement(
  free: FreeRect[],
  rect: Rect,
  kerf: number,
  allowRotation = true,
): {
  freeIdx: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
  score: number;
  leftoverMin: number;
  leftoverMax: number;
} | null {
  let best: ReturnType<typeof findBestPlacement> = null;

  for (let i = 0; i < free.length; i++) {
    const f = free[i];
    const orientations = allowRotation
      ? [
          { w: rect.width, h: rect.length, rotated: false },
          { w: rect.length, h: rect.width, rotated: true },
        ]
      : [{ w: rect.width, h: rect.length, rotated: false }];
    for (const o of orientations) {
      // Account for saw kerf around the placement (no kerf needed against
      // the sheet edge, but easier and safe to always reserve it).
      const needW = o.w;
      const needH = o.h;
      if (needW > f.w || needH > f.h) continue;
      const leftoverX = f.w - needW;
      const leftoverY = f.h - needH;
      const leftoverMin = Math.min(leftoverX, leftoverY);
      const leftoverMax = Math.max(leftoverX, leftoverY);
      const score = leftoverMin * 1e6 + leftoverMax;
      if (!best || score < best.score) {
        best = {
          freeIdx: i,
          x: f.x,
          y: f.y,
          w: o.w,
          h: o.h,
          rotated: o.rotated,
          score,
          leftoverMin,
          leftoverMax,
        };
      }
    }
    void kerf; // kerf used downstream when splitting
  }
  return best;
}

/**
 * Replace every free rectangle that overlaps `used` with up to four
 * sub-rectangles representing the still-empty L-shape around it. This is
 * the canonical Maximal Rectangles split step.
 */
function splitFreeRects(free: FreeRect[], used: FreeRect): void {
  for (let i = free.length - 1; i >= 0; i--) {
    const f = free[i];
    if (!overlaps(f, used)) continue;

    // Remove the intersected free rect; add up to four pieces back.
    free.splice(i, 1);

    // Left piece
    if (used.x > f.x && used.x < f.x + f.w) {
      free.push({ x: f.x, y: f.y, w: used.x - f.x, h: f.h });
    }
    // Right piece
    if (used.x + used.w > f.x && used.x + used.w < f.x + f.w) {
      free.push({ x: used.x + used.w, y: f.y, w: f.x + f.w - (used.x + used.w), h: f.h });
    }
    // Bottom piece
    if (used.y > f.y && used.y < f.y + f.h) {
      free.push({ x: f.x, y: f.y, w: f.w, h: used.y - f.y });
    }
    // Top piece
    if (used.y + used.h > f.y && used.y + used.h < f.y + f.h) {
      free.push({ x: f.x, y: used.y + used.h, w: f.w, h: f.y + f.h - (used.y + used.h) });
    }
  }
}

function overlaps(a: FreeRect, b: FreeRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Drop any free rectangle wholly contained in another. */
function pruneContained(free: FreeRect[]): void {
  for (let i = free.length - 1; i >= 0; i--) {
    for (let j = 0; j < free.length; j++) {
      if (i === j) continue;
      if (contains(free[j], free[i])) {
        free.splice(i, 1);
        break;
      }
    }
  }
}

function contains(outer: FreeRect, inner: FreeRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Phase 13 / Sprint 5 — Cross-material co-nesting ──────────────────────────
// When two or more materials share identical sheet dimensions (thickness +
// sheetWidth + sheetLength), they can be packed together on the same physical
// sheet.  This reduces the total sheet count for small projects.

/** A group of materials eligible for co-nesting (same thickness + sheet size). */
export interface CoNestCandidate {
  /** Composite geometry key: `${thickness}x${sheetWidth}x${sheetLength}` */
  key: string;
  /** All distinct material keys on sheets with this geometry. */
  materialKeys: string[];
  thickness: number;
  sheetWidth: number;
  sheetLength: number;
}

/**
 * Scan an OptimizationResult and return groups of materials that share
 * identical sheet geometry (thickness + width + length). Only groups
 * with ≥ 2 distinct materials are returned — those are eligible for co-nesting.
 *
 * Call this before `applyCoNesting` to let the user opt in per candidate.
 */
export function findCoNestCandidates(result: OptimizationResult): CoNestCandidate[] {
  const byKey = new Map<string, { thickness: number; sheetWidth: number; sheetLength: number; mats: Set<string> }>();
  for (const sheet of result.sheets) {
    const key = `${sheet.thickness}x${sheet.sheetWidth}x${sheet.sheetLength}`;
    const e = byKey.get(key) ?? {
      thickness: sheet.thickness,
      sheetWidth: sheet.sheetWidth,
      sheetLength: sheet.sheetLength,
      mats: new Set<string>(),
    };
    e.mats.add(sheet.material);
    byKey.set(key, e);
  }
  return [...byKey.entries()]
    .filter(([, v]) => v.mats.size >= 2)
    .map(([key, v]) => ({
      key,
      materialKeys: [...v.mats].sort(),
      thickness: v.thickness,
      sheetWidth: v.sheetWidth,
      sheetLength: v.sheetLength,
    }));
}

/** Internal rect with attached partMaterial for co-nesting. */
interface CoRect extends Rect {
  partMaterial: string;
}

/**
 * Re-pack selected material groups onto shared sheets to reduce sheet count.
 * Parts from different materials are placed side-by-side on the same physical
 * sheet. Each resulting CutRect gets `partMaterial` set to its original
 * material key so DXF/BOM export can still distinguish them.
 *
 * Grain constraints are honoured per-part via `rotationLocked` carried forward
 * from the original placement.  Parts that were grain-locked in the original
 * result remain locked in the co-nested result.
 *
 * @param result      Original OptimizationResult from optimizeCutSheets().
 * @param coNestKeys  Set of geometry keys to co-nest (from findCoNestCandidates).
 *                    Pass an empty set to return the result unchanged.
 * @param sawKerfMm   Kerf used during re-packing (defaults to SAW_KERF).
 */
export function applyCoNesting(
  result: OptimizationResult,
  coNestKeys: ReadonlySet<string>,
  sawKerfMm = SAW_KERF,
): OptimizationResult {
  if (coNestKeys.size === 0) return result;

  type GroupEntry = {
    thickness: number;
    sheetWidth: number;
    sheetLength: number;
    rects: CoRect[];
  };

  const nestGroups = new Map<string, GroupEntry>();
  const untouched: CutSheet[] = [];

  for (const sheet of result.sheets) {
    const key = `${sheet.thickness}x${sheet.sheetWidth}x${sheet.sheetLength}`;
    if (!coNestKeys.has(key)) {
      untouched.push(sheet);
      continue;
    }
    const entry = nestGroups.get(key) ?? {
      thickness: sheet.thickness,
      sheetWidth: sheet.sheetWidth,
      sheetLength: sheet.sheetLength,
      rects: [],
    };
    for (const part of sheet.parts) {
      entry.rects.push({
        partId: part.partId,
        label: part.label,
        length: part.length,
        width: part.width,
        edgeBanding: part.edgeBanding ?? '',
        // Preserve rotation lock — if grain was respected originally, honour it here.
        rotationLocked: part.rotationLocked === true,
        partMaterial: part.partMaterial ?? sheet.material,
      });
    }
    nestGroups.set(key, entry);
  }

  let sheetIdx = untouched.reduce((max, s) => Math.max(max, s.sheetIndex + 1), 0);
  const coNested: CutSheet[] = [];

  for (const [, group] of nestGroups) {
    // Preserve per-part rotation locks; packer runs in freeform mode.
    const packed = packMaxRects(
      group.rects,
      group.sheetLength,
      group.sheetWidth,
      sawKerfMm,
      /* allowRotation */ true,
      /* trackGrainConflicts */ false,
    );

    const matSet = new Set<string>(group.rects.map((r) => r.partMaterial));
    const combinedMaterial = [...matSet].sort().join('+');
    const matByPartId = new Map<string, string>(group.rects.map((r) => [r.partId, r.partMaterial]));

    for (const sheetParts of packed) {
      if (sheetParts.length === 0) continue;
      const usedArea = sheetParts.reduce((s, p) => s + p.length * p.width, 0);
      const sheetArea = group.sheetWidth * group.sheetLength;
      coNested.push({
        sheetIndex: sheetIdx++,
        material: combinedMaterial,
        thickness: group.thickness,
        sheetLength: group.sheetLength,
        sheetWidth: group.sheetWidth,
        yieldPercent: round2((usedArea / sheetArea) * 100),
        parts: sheetParts.map((p) => ({
          partId: p.partId,
          label: p.label,
          length: p.length,
          width: p.width,
          x: p.x,
          y: p.y,
          edgeBanding: p.edgeBanding,
          grainVertical: !p.rotated,
          rotated: p.rotated,
          grainConflict: p.grainConflict,
          rationale: p.rationale,
          rotationLocked: p.rotationLocked || undefined,
          partMaterial: matByPartId.get(p.partId) ?? combinedMaterial,
        })),
      });
    }
  }

  const newSheets = [...untouched, ...coNested].sort((a, b) => a.sheetIndex - b.sheetIndex);
  const totalArea = newSheets.reduce((s, sh) => s + sh.sheetWidth * sh.sheetLength, 0);
  const usedArea = newSheets.reduce((s, sh) => s + sh.parts.reduce((ps, p) => ps + p.width * p.length, 0), 0);
  const grainConflictCount = newSheets.reduce((s, sh) => s + sh.parts.filter((p) => p.grainConflict).length, 0);

  return {
    sheets: newSheets,
    totalSheets: newSheets.length,
    overallYield: totalArea > 0 ? round2((usedArea / totalArea) * 100) : 0,
    totalWaste: totalArea - usedArea,
    grainConflictCount,
  };
}
