import type { Part, CutSheet, OptimizationResult, Result } from './types';
import { ok, err } from './types';
import { getMaterial, SAW_KERF } from './materials';

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
): Result<OptimizationResult, string> {
  try {
    return ok(optimizeCutSheets(parts, sawKerfMm, sheetSizeOverrides));
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

export function optimizeCutSheets(
  parts: Part[],
  sawKerfMm = SAW_KERF,
  /** Sprint 165 — per-material sheet size overrides (mm). When present, overrides mat.sheetWidth / mat.sheetLength. */
  sheetSizeOverrides: Record<string, { width: number; length: number }> = {},
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
    const packed = packMaxRects(group.rects, sheetLength, sheetWidth, sawKerfMm, !mat.hasGrain, mat.hasGrain);

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
      // Open a new sheet.
      const sheet: Sheet = {
        placed: [],
        free: [{ x: 0, y: 0, w: sheetWidth, h: sheetLength }],
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
