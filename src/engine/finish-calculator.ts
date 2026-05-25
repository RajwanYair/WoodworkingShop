/**
 * Sprint 88 — Finish / Paint Calculator
 *
 * Pure-TS utility that estimates finish product quantities for a cabinet
 * given its total painted/stained surface area.
 *
 * Coverage rates are typical industry values at normal dilution (no thinning).
 * Results are advisory — always refer to the manufacturer's data sheet.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type FinishType = 'primer' | 'stain' | 'paint' | 'varnish' | 'oil' | 'lacquer';

export interface FinishSpec {
  type: FinishType;
  /** Localisation key suffix — matches i18n key `finish.<type>`. */
  labelKey: string;
  /** Typical coverage rate in m² per litre (one coat, smooth surface). */
  coverageM2PerLitre: number;
  /** Recommended minimum number of coats for a durable finish. */
  defaultCoats: number;
  /** Advisory note key for i18n. */
  noteKey: string;
}

export interface FinishEstimate {
  finishType: FinishType;
  totalAreaM2: number;
  coats: number;
  litresNeeded: number;
  /** Smallest combination of standard can sizes that covers `litresNeeded`. */
  canSizes: CanSelection[];
  /** Sum of selected can sizes in litres. */
  totalCanLitres: number;
}

export interface CanSelection {
  /** Can volume in litres (e.g. 0.75, 1, 2.5, 5). */
  size: number;
  count: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const FINISH_SPECS: Record<FinishType, FinishSpec> = {
  primer: {
    type: 'primer',
    labelKey: 'finish.primer',
    coverageM2PerLitre: 8,
    defaultCoats: 1,
    noteKey: 'finish.notePrimer',
  },
  stain: {
    type: 'stain',
    labelKey: 'finish.stain',
    coverageM2PerLitre: 10,
    defaultCoats: 2,
    noteKey: 'finish.noteStain',
  },
  paint: {
    type: 'paint',
    labelKey: 'finish.paint',
    coverageM2PerLitre: 12,
    defaultCoats: 2,
    noteKey: 'finish.notePaint',
  },
  varnish: {
    type: 'varnish',
    labelKey: 'finish.varnish',
    coverageM2PerLitre: 6,
    defaultCoats: 3,
    noteKey: 'finish.noteVarnish',
  },
  oil: {
    type: 'oil',
    labelKey: 'finish.oil',
    coverageM2PerLitre: 12,
    defaultCoats: 2,
    noteKey: 'finish.noteOil',
  },
  lacquer: {
    type: 'lacquer',
    labelKey: 'finish.lacquer',
    coverageM2PerLitre: 10,
    defaultCoats: 2,
    noteKey: 'finish.noteLacquer',
  },
};

/** Standard can sizes available at most timber/paint merchants (litres). */
const CAN_SIZES: readonly number[] = [5, 2.5, 1, 0.75, 0.5, 0.25];

/**
 * Given a required volume, return the smallest combination of standard can
 * sizes whose total is ≥ `litresNeeded`.
 *
 * Uses a greedy algorithm descending through can sizes.
 */
export function selectCanSizes(litresNeeded: number): CanSelection[] {
  const result: CanSelection[] = [];
  let remaining = litresNeeded;
  for (const size of CAN_SIZES) {
    if (remaining <= 0) break;
    const count = Math.ceil(remaining / size);
    if (count * size <= remaining + 0.001) {
      result.push({ size, count });
      remaining -= count * size;
      break;
    }
    // Try fitting with smaller cans
    const wholeCount = Math.floor(remaining / size);
    if (wholeCount > 0) {
      result.push({ size, count: wholeCount });
      remaining -= wholeCount * size;
    }
  }
  if (remaining > 0.001) {
    // Round up to smallest can
    const smallest = CAN_SIZES[CAN_SIZES.length - 1]!;
    result.push({ size: smallest, count: 1 });
  }
  return result;
}

/**
 * Calculate finish product requirements.
 *
 * @param totalAreaM2   Total exposed surface area in m² (all parts, both faces + edges).
 * @param finishType    Chosen finish product type.
 * @param coats         Number of coats to apply (defaults to `FINISH_SPECS[finishType].defaultCoats`).
 */
export function calculateFinish(totalAreaM2: number, finishType: FinishType, coats?: number): FinishEstimate {
  const spec = FINISH_SPECS[finishType];
  const actualCoats = coats ?? spec.defaultCoats;
  const litresNeeded = (totalAreaM2 * actualCoats) / spec.coverageM2PerLitre;
  const canSizes = selectCanSizes(litresNeeded);
  const totalCanLitres = canSizes.reduce((s, c) => s + c.size * c.count, 0);
  return {
    finishType,
    totalAreaM2,
    coats: actualCoats,
    litresNeeded,
    canSizes,
    totalCanLitres,
  };
}

/**
 * Compute total exposed surface area for an array of parts (m²).
 *
 * Only includes faces that are typically finished:
 * - Both faces (length × width) × qty
 * - Four edges: 2×(length × thickness) + 2×(width × thickness) × qty
 */
export function computeFinishAreaM2(
  parts: { length: number; width: number; thickness: number; qty: number }[],
): number {
  let totalMm2 = 0;
  for (const p of parts) {
    const facesArea = 2 * p.length * p.width; // mm²
    const edgesArea = 2 * (p.length + p.width) * p.thickness; // mm²
    totalMm2 += (facesArea + edgesArea) * p.qty;
  }
  return totalMm2 / 1_000_000; // convert mm² → m²
}
