/**
 * Sprint 28 — Part sequential labeling for shop-floor tracking.
 *
 * Assigns deterministic sequential IDs (P-001, P-002 …) to cut parts so
 * that every individual piece can be uniquely identified on the shop floor.
 * Labels are derived from the sorted parts list — same input always yields
 * the same labels.
 *
 * Labeling rules:
 *   - Parts are sorted by: material → name.en → length (desc) → width (desc)
 *   - Each unique (name + material) group gets the same prefix; qty items
 *     within a group receive individual suffixes (P-001a, P-001b, …) when
 *     the quantity is > 1 and `expandMultiQty` is true (default false).
 *   - Label format: `P-NNN` (zero-padded to 3 digits by default).
 *   - Cabinet prefix: when `cabinetIndex` is provided, format is `C1-P-001`.
 *
 * Pure function — no React, no side effects.
 */

import type { Part } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LabeledPart extends Part {
  /** Sequential shop-floor label for this part entry (e.g. "P-001"). */
  partLabel: string;
}

export interface LabelingOptions {
  /**
   * Zero-padding width for the numeric counter. Default 3 (→ P-001).
   * Set to 4 for very large projects with > 999 parts.
   */
  padWidth?: number;
  /**
   * Optional cabinet index prefix.  When provided, labels are prefixed
   * with `C<n>-` (e.g. "C2-P-003").  Useful for multi-cabinet BOMs.
   */
  cabinetIndex?: number;
  /**
   * When true, multi-qty parts are expanded so each physical piece gets its
   * own label (e.g. qty=3 → P-001a, P-001b, P-001c).
   * Default false — the group label covers all qty copies.
   */
  expandMultiQty?: boolean;
}

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Assign sequential shop-floor labels to a list of parts.
 *
 * @param parts   Parts list (e.g. from `generateParts()`).
 * @param options Labeling configuration.
 * @returns       New array of `LabeledPart` objects (original `parts` untouched).
 */
export function assignPartLabels(parts: readonly Part[], options: LabelingOptions = {}): LabeledPart[] {
  const { padWidth = 3, cabinetIndex, expandMultiQty = false } = options;

  // Stable sort: material → name.en → length desc → width desc
  const sorted = [...parts].sort((a, b) => {
    if (a.material !== b.material) return a.material.localeCompare(b.material);
    if (a.name.en !== b.name.en) return a.name.en.localeCompare(b.name.en);
    if (b.length !== a.length) return b.length - a.length;
    return b.width - a.width;
  });

  const prefix = cabinetIndex !== undefined ? `C${cabinetIndex}-` : '';
  const labeled: LabeledPart[] = [];
  let counter = 1;

  for (const part of sorted) {
    const numStr = String(counter).padStart(padWidth, '0');
    const baseLabel = `${prefix}P-${numStr}`;

    if (expandMultiQty && part.qty > 1) {
      // Expand: one label per physical piece
      for (let i = 0; i < part.qty; i++) {
        const suffix = String.fromCharCode(97 + i); // 'a', 'b', 'c', …
        labeled.push({ ...part, qty: 1, partLabel: `${baseLabel}${suffix}` });
      }
    } else {
      labeled.push({ ...part, partLabel: baseLabel });
    }
    counter++;
  }

  return labeled;
}

/**
 * Produce a flat label→part lookup map (useful for QR-code scanning flows).
 * When `expandMultiQty` is false (default), the value is the part group;
 * when true, each label maps to a single-piece part.
 */
export function buildPartLabelMap(labeledParts: readonly LabeledPart[]): Map<string, LabeledPart> {
  const map = new Map<string, LabeledPart>();
  for (const p of labeledParts) {
    map.set(p.partLabel, p);
  }
  return map;
}

/**
 * Format labeled parts as a tab-separated CSV suitable for printing
 * shop-floor cut tickets.
 *
 * Columns: Label | Name | Material | Length (mm) | Width (mm) | Qty | Edge banding
 */
export function formatPartLabelsAsCsv(labeledParts: readonly LabeledPart[], lang: 'en' | 'he' = 'en'): string {
  const header = ['Label', 'Name', 'Material', 'Length (mm)', 'Width (mm)', 'Qty', 'Edge Banding'].join('\t');
  const rows = labeledParts.map((p) =>
    [p.partLabel, p.name[lang], p.material, p.length, p.width, p.qty, p.edgeBanding[lang]].join('\t'),
  );
  return [header, ...rows].join('\n');
}
