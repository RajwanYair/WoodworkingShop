/**
 * Sanding Progression Planner — Sprint 209
 *
 * Plans sanding grit sequences and estimates sanding time based on
 * area, material hardness, and finish target.
 */

/** Material class affecting sanding effort. */
export type SandingMaterial = 'softwood' | 'hardwood' | 'plywood' | 'mdf';

/** Finish target quality level. */
export type FinishTarget = 'paint' | 'stain' | 'clear';

/** Input for sanding progression planning. */
export interface SandingProgressionInput {
  /** Starting grit. */
  readonly startGrit: number;
  /** Target final grit. */
  readonly targetGrit: number;
  /** Workpiece area in square meters. */
  readonly areaM2: number;
  /** Material class. */
  readonly material: SandingMaterial;
  /** Finish target. */
  readonly finishTarget: FinishTarget;
}

/** Result of progression planning. */
export interface SandingProgressionResult {
  /** Ordered grit sequence from start to target. */
  readonly gritSequence: readonly number[];
  /** Estimated total sanding minutes. */
  readonly estimatedMinutes: number;
  /** Suggested sheet count for random orbit sanding. */
  readonly estimatedSheets: number;
}

/** Supported grit set. */
export const SANDING_GRITS = [40, 60, 80, 100, 120, 150, 180, 220, 320] as const;

const MATERIAL_TIME_FACTOR: Record<SandingMaterial, number> = {
  softwood: 1.0,
  hardwood: 1.25,
  plywood: 1.1,
  mdf: 0.9,
} as const;

const FINISH_TARGET_MAX_GRIT: Record<FinishTarget, number> = {
  paint: 180,
  stain: 220,
  clear: 320,
} as const;

/**
 * Plan a sanding progression and estimate time.
 *
 * @param input - sanding parameters
 * @returns grit sequence and effort estimate
 * @throws RangeError for invalid grit/area values
 */
export function planSandingProgression(input: SandingProgressionInput): SandingProgressionResult {
  const { startGrit, targetGrit, areaM2, material, finishTarget } = input;

  if (!SANDING_GRITS.includes(startGrit as (typeof SANDING_GRITS)[number])) {
    throw new RangeError(`planSandingProgression: unsupported startGrit ${startGrit}`);
  }
  if (!SANDING_GRITS.includes(targetGrit as (typeof SANDING_GRITS)[number])) {
    throw new RangeError(`planSandingProgression: unsupported targetGrit ${targetGrit}`);
  }
  if (startGrit > targetGrit) {
    throw new RangeError(`planSandingProgression: startGrit must be <= targetGrit, got ${startGrit} > ${targetGrit}`);
  }
  if (areaM2 <= 0) {
    throw new RangeError(`planSandingProgression: areaM2 must be > 0, got ${areaM2}`);
  }

  const maxRecommended = FINISH_TARGET_MAX_GRIT[finishTarget];
  const effectiveTarget = Math.min(targetGrit, maxRecommended);

  const startIndex = SANDING_GRITS.indexOf(startGrit as (typeof SANDING_GRITS)[number]);
  const endIndex = SANDING_GRITS.indexOf(effectiveTarget as (typeof SANDING_GRITS)[number]);

  const gritSequence: number[] = [];
  for (let i = startIndex; i <= endIndex; i += 1) {
    gritSequence.push(SANDING_GRITS[i]);
  }

  const materialFactor = MATERIAL_TIME_FACTOR[material];
  const passes = gritSequence.length;

  // Baseline: ~7 minutes per m2 per grit pass at factor 1.0
  const estimatedMinutes = Math.round(areaM2 * passes * 7 * materialFactor);

  // Approximate one sheet per 0.6m2 per pass
  const estimatedSheets = Math.max(1, Math.ceil((areaM2 / 0.6) * passes));

  return {
    gritSequence,
    estimatedMinutes,
    estimatedSheets,
  };
}
