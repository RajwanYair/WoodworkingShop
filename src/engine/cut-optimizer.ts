import type { Part, CutSheet, OptimizationResult } from './types';
import { getMaterial, SAW_KERF } from './materials';

/**
 * First-Fit Decreasing (FFD) 2-D shelf/strip bin-packing optimizer.
 *
 * Groups parts by material+thickness, then packs each group into
 * standard sheets using a strip-based approach:
 *   1. Sort pieces by descending height (length)
 *   2. Place into horizontal strips across the sheet
 *   3. Within each strip, pack left-to-right with saw kerf gaps
 *   4. Open a new sheet when the current one is full
 */
export function optimizeCutSheets(parts: Part[]): OptimizationResult {
  // Group parts by material key (which implies thickness)
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
      });
    }
    groups.set(p.material, group);
  }

  const allSheets: CutSheet[] = [];
  let sheetIdx = 0;

  for (const [, group] of groups) {
    const mat = getMaterial(group.materialKey);
    const sheetW = mat.sheetWidth;
    const sheetL = mat.sheetLength;
    const sheetArea = sheetW * sheetL;

    // FFD: sort descending by length (height in grain direction)
    const rects = [...group.rects].sort((a, b) => b.length - a.length);

    // Pack into sheets
    const sheets = packFFD(rects, sheetL, sheetW, SAW_KERF);

    for (const packedRects of sheets) {
      const usedArea = packedRects.reduce(
        (sum, r) => sum + r.length * r.width,
        0,
      );
      allSheets.push({
        sheetIndex: sheetIdx++,
        material: group.materialKey,
        thickness: mat.thickness,
        sheetLength: sheetL,
        sheetWidth: sheetW,
        parts: packedRects.map(r => ({
          partId: r.partId,
          label: r.label,
          length: r.length,
          width: r.width,
          x: r.x,
          y: r.y,
          edgeBanding: r.edgeBanding,
          grainVertical: !r.rotated, // grain along Y when not rotated (length = Y in strip packing)
        })),
        yieldPercent: round2((usedArea / sheetArea) * 100),
      });
    }
  }

  const totalArea = allSheets.reduce(
    (s, sh) => s + sh.sheetLength * sh.sheetWidth,
    0,
  );
  const usedArea = allSheets.reduce(
    (s, sh) => s + sh.parts.reduce((a, p) => a + p.length * p.width, 0),
    0,
  );

  return {
    sheets: allSheets,
    totalSheets: allSheets.length,
    overallYield: totalArea > 0 ? round2((usedArea / totalArea) * 100) : 0,
    totalWaste: totalArea - usedArea,
  };
}

// ─── Internal types & helpers ───

interface Rect {
  partId: string;
  label: string;
  length: number;
  width: number;
  edgeBanding?: string;
}

interface PlacedRect extends Rect {
  x: number;
  y: number;
  rotated: boolean; // true if length/width were swapped during packing
}

/**
 * FFD strip-based packing.
 * Returns an array of sheets, each sheet being an array of placed rects.
 */
function packFFD(
  rects: Rect[],
  sheetLength: number,
  sheetWidth: number,
  kerf: number,
): PlacedRect[][] {
  if (rects.length === 0) return [];

  const sheets: PlacedRect[][] = [];
  // Track remaining space per sheet as a list of strips (shelves)
  const sheetStrips: Strip[][] = [];

  for (const rect of rects) {
    // Try both orientations — pick the one that fits better
    const orientations = [
      { l: rect.length, w: rect.width, rot: false },
      { l: rect.width, w: rect.length, rot: true },
    ];

    let placed = false;

    for (let si = 0; si < sheets.length && !placed; si++) {
      for (const o of orientations) {
        const stripIdx = tryFitInStrip(sheetStrips[si], o.l, o.w, sheetLength, sheetWidth, kerf);
        if (stripIdx >= 0) {
          const strip = sheetStrips[si][stripIdx];
          const pr: PlacedRect = {
            ...rect,
            length: o.l,
            width: o.w,
            x: strip.usedX,
            y: strip.y,
            rotated: o.rot,
          };
          sheets[si].push(pr);
          strip.usedX += o.w + kerf;
          strip.maxHeight = Math.max(strip.maxHeight, o.l);
          placed = true;
          break;
        }
      }

      // Try opening a new strip on this sheet
      if (!placed) {
        for (const o of orientations) {
          const newY = nextStripY(sheetStrips[si], kerf);
          if (newY + o.l <= sheetLength && o.w <= sheetWidth) {
            const strip: Strip = { y: newY, usedX: 0, maxHeight: o.l };
            const pr: PlacedRect = {
              ...rect,
              length: o.l,
              width: o.w,
              x: 0,
              y: newY,
              rotated: o.rot,
            };
            strip.usedX = o.w + kerf;
            sheetStrips[si].push(strip);
            sheets[si].push(pr);
            placed = true;
            break;
          }
        }
      }
    }

    // Need a new sheet
    if (!placed) {
      const isNatural = rect.length <= sheetLength && rect.width <= sheetWidth;
      const o = isNatural
          ? { l: rect.length, w: rect.width }
          : { l: rect.width, w: rect.length };

      const strip: Strip = { y: 0, usedX: o.w + kerf, maxHeight: o.l };
      const pr: PlacedRect = {
        ...rect,
        length: o.l,
        width: o.w,
        x: 0,
        y: 0,
        rotated: !isNatural,
      };
      sheets.push([pr]);
      sheetStrips.push([strip]);
    }
  }

  return sheets;
}

interface Strip {
  y: number;       // top-edge Y offset on the sheet
  usedX: number;   // rightmost used X
  maxHeight: number;
}

function tryFitInStrip(
  strips: Strip[],
  rectLength: number,
  rectWidth: number,
  _sheetLength: number,
  sheetWidth: number,
  _kerf: number,
): number {
  for (let i = 0; i < strips.length; i++) {
    const s = strips[i];
    if (rectLength <= s.maxHeight && s.usedX + rectWidth <= sheetWidth) {
      return i;
    }
  }
  return -1;
}

function nextStripY(strips: Strip[], kerf: number): number {
  if (strips.length === 0) return 0;
  const last = strips[strips.length - 1];
  return last.y + last.maxHeight + kerf;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
