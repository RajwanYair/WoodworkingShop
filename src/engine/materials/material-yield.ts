/**
 * Sprint 164 — Material Yield Optimizer.
 *
 * Cross-project material allocation engine that analyses off-cuts from
 * multiple projects/cabinets and re-allocates them to minimize waste.
 *
 * The algorithm:
 *   1. Collects all material requirements (parts) across projects
 *   2. Groups by material type and thickness
 *   3. Identifies reusable off-cuts from completed cuts
 *   4. Allocates parts to off-cuts using first-fit decreasing (FFD)
 *   5. Reports yield metrics and savings
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** A material demand from a specific project. */
export interface MaterialDemand {
  /** Unique demand ID. */
  id: string;
  /** Owning project ID. */
  projectId: string;
  /** Project display name. */
  projectName: string;
  /** Material identifier. */
  materialId: string;
  /** Material thickness in mm. */
  thickness: number;
  /** Required width in mm. */
  width: number;
  /** Required length in mm (grain direction). */
  length: number;
  /** Quantity needed. */
  quantity: number;
  /** Whether grain direction must be preserved. */
  grainLocked: boolean;
}

/** A reusable off-cut from a previous cut operation. */
export interface OffCut {
  /** Unique off-cut ID. */
  id: string;
  /** Source project ID (where it came from). */
  sourceProjectId: string;
  /** Material identifier. */
  materialId: string;
  /** Material thickness in mm. */
  thickness: number;
  /** Available width in mm. */
  width: number;
  /** Available length in mm. */
  length: number;
  /** Whether grain direction is known. */
  grainKnown: boolean;
}

/** Result of allocating a demand to an off-cut. */
export interface YieldAllocation {
  /** Demand that was satisfied. */
  demandId: string;
  /** Off-cut used (null if new sheet required). */
  offCutId: string | null;
  /** Whether the demand was rotated to fit. */
  rotated: boolean;
  /** Remaining off-cut width after allocation. */
  remainingWidth: number;
  /** Remaining off-cut length after allocation. */
  remainingLength: number;
}

/** Summary metrics for a yield optimization run. */
export interface YieldMetrics {
  /** Total demands processed. */
  totalDemands: number;
  /** Demands satisfied from off-cuts. */
  fromOffCuts: number;
  /** Demands requiring new material. */
  fromNewSheets: number;
  /** Total material area demanded (mm²). */
  totalAreaDemanded: number;
  /** Area saved by reusing off-cuts (mm²). */
  areaSaved: number;
  /** Yield percentage (0–100). */
  yieldPercentage: number;
  /** Cost savings estimate (using material cost per m²). */
  costSavingsEstimate: number;
}

/** Full yield optimization result. */
export interface YieldResult {
  /** All allocations. */
  allocations: YieldAllocation[];
  /** Summary metrics. */
  metrics: YieldMetrics;
  /** Remaining off-cuts after allocation. */
  remainingOffCuts: OffCut[];
  /** New off-cuts generated from partial use. */
  newOffCuts: OffCut[];
}

/** Configuration for the yield optimizer. */
export interface YieldConfig {
  /** Saw kerf in mm (subtracted from off-cuts on each cut). */
  sawKerf: number;
  /** Minimum usable off-cut dimension in mm. */
  minOffCutSize: number;
  /** Cost per m² for savings estimate. */
  costPerSquareMeter: number;
  /** Allow rotation of non-grain-locked parts. */
  allowRotation: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum demands per optimization run. */
export const MAX_DEMANDS = 500;

/** Maximum off-cuts per optimization run. */
export const MAX_OFFCUTS = 1000;

/** Default yield optimizer configuration. */
export const DEFAULT_YIELD_CONFIG: YieldConfig = {
  sawKerf: 3,
  minOffCutSize: 50,
  costPerSquareMeter: 45,
  allowRotation: true,
};

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Run material yield optimization across demands and available off-cuts.
 *
 * @param demands   Material demands from projects.
 * @param offCuts   Available off-cuts for reuse.
 * @param config    Optimizer configuration.
 * @returns Yield optimization result with allocations and metrics.
 * @throws RangeError if inputs exceed limits.
 */
export function optimizeYield(
  demands: MaterialDemand[],
  offCuts: OffCut[],
  config: YieldConfig = DEFAULT_YIELD_CONFIG,
): YieldResult {
  if (demands.length === 0) {
    throw new RangeError('optimizeYield: at least one demand is required');
  }
  if (demands.length > MAX_DEMANDS) {
    throw new RangeError(`optimizeYield: demands exceed maximum of ${MAX_DEMANDS}`);
  }
  if (offCuts.length > MAX_OFFCUTS) {
    throw new RangeError(`optimizeYield: off-cuts exceed maximum of ${MAX_OFFCUTS}`);
  }

  // Expand demands by quantity into individual pieces, sorted largest-area first (FFD)
  const pieces = expandDemands(demands);
  pieces.sort((a, b) => b.width * b.length - a.width * a.length);

  // Clone off-cuts for mutation tracking
  const available: MutableOffCut[] = offCuts.map((o) => ({
    ...o,
    currentWidth: o.width,
    currentLength: o.length,
  }));

  const allocations: YieldAllocation[] = [];
  const newOffCuts: OffCut[] = [];
  let areaSaved = 0;

  for (const piece of pieces) {
    const allocation = tryAllocate(piece, available, config);
    if (allocation) {
      allocations.push(allocation.result);
      areaSaved += piece.width * piece.length;

      // Generate new off-cut from remaining space
      if (allocation.remainingCut) {
        const remaining = allocation.remainingCut;
        if (remaining.width >= config.minOffCutSize && remaining.length >= config.minOffCutSize) {
          newOffCuts.push(remaining);
        }
      }
    } else {
      // Needs new sheet
      allocations.push({
        demandId: piece.demandId,
        offCutId: null,
        rotated: false,
        remainingWidth: 0,
        remainingLength: 0,
      });
    }
  }

  const totalAreaDemanded = pieces.reduce((s, p) => s + p.width * p.length, 0);
  const fromOffCuts = allocations.filter((a) => a.offCutId !== null).length;
  const fromNewSheets = allocations.filter((a) => a.offCutId === null).length;

  const metrics: YieldMetrics = {
    totalDemands: pieces.length,
    fromOffCuts,
    fromNewSheets,
    totalAreaDemanded,
    areaSaved,
    yieldPercentage: totalAreaDemanded > 0 ? Math.round((areaSaved / totalAreaDemanded) * 100) : 0,
    costSavingsEstimate: (areaSaved / 1000000) * config.costPerSquareMeter,
  };

  const remainingOffCuts = available
    .filter((o) => o.currentWidth >= config.minOffCutSize && o.currentLength >= config.minOffCutSize)
    .map(({ currentWidth, currentLength, ...rest }) => ({
      ...rest,
      width: currentWidth,
      length: currentLength,
    }));

  return { allocations, metrics, remainingOffCuts, newOffCuts };
}

/**
 * Group demands by material and thickness for reporting.
 *
 * @param demands  Material demands.
 * @returns Map of material key to grouped demands.
 */
export function groupByMaterial(demands: MaterialDemand[]): Map<string, MaterialDemand[]> {
  const groups = new Map<string, MaterialDemand[]>();
  for (const d of demands) {
    const key = `${d.materialId}:${d.thickness}`;
    const group = groups.get(key) ?? [];
    group.push(d);
    groups.set(key, group);
  }
  return groups;
}

/**
 * Calculate total area needed for a list of demands.
 *
 * @param demands  Material demands.
 * @returns Total area in mm².
 */
export function calculateTotalArea(demands: MaterialDemand[]): number {
  return demands.reduce((sum, d) => sum + d.width * d.length * d.quantity, 0);
}

/**
 * Filter off-cuts compatible with a given demand (same material + thickness).
 *
 * @param demand   Material demand.
 * @param offCuts  Available off-cuts.
 * @returns Compatible off-cuts.
 */
export function findCompatibleOffCuts(demand: MaterialDemand, offCuts: OffCut[]): OffCut[] {
  return offCuts.filter((o) => o.materialId === demand.materialId && o.thickness === demand.thickness);
}

/**
 * Estimate savings from a yield result in human-readable format.
 *
 * @param metrics  Yield metrics.
 * @returns Object with formatted area and cost savings.
 */
export function formatSavings(metrics: YieldMetrics): { area: string; cost: string } {
  const areaM2 = metrics.areaSaved / 1000000;
  const area = `${areaM2.toFixed(3)} m²`;
  const cost = `$${metrics.costSavingsEstimate.toFixed(2)}`;
  return { area, cost };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

interface MutableOffCut extends OffCut {
  currentWidth: number;
  currentLength: number;
}

interface ExpandedPiece {
  demandId: string;
  materialId: string;
  thickness: number;
  width: number;
  length: number;
  grainLocked: boolean;
}

interface AllocationResult {
  result: YieldAllocation;
  remainingCut: OffCut | null;
}

function expandDemands(demands: MaterialDemand[]): ExpandedPiece[] {
  const pieces: ExpandedPiece[] = [];
  for (const d of demands) {
    for (let i = 0; i < d.quantity; i++) {
      pieces.push({
        demandId: d.id,
        materialId: d.materialId,
        thickness: d.thickness,
        width: d.width,
        length: d.length,
        grainLocked: d.grainLocked,
      });
    }
  }
  return pieces;
}

function tryAllocate(piece: ExpandedPiece, available: MutableOffCut[], config: YieldConfig): AllocationResult | null {
  // Find compatible off-cuts (same material + thickness)
  for (const offCut of available) {
    if (offCut.materialId !== piece.materialId || offCut.thickness !== piece.thickness) {
      continue;
    }

    // Try normal orientation
    const normalFit = checkFit(piece.width, piece.length, offCut.currentWidth, offCut.currentLength, config.sawKerf);
    if (normalFit) {
      return consumeOffCut(piece, offCut, false, config);
    }

    // Try rotated (only if not grain-locked and rotation allowed)
    if (!piece.grainLocked && config.allowRotation) {
      const rotatedFit = checkFit(piece.length, piece.width, offCut.currentWidth, offCut.currentLength, config.sawKerf);
      if (rotatedFit) {
        return consumeOffCut(piece, offCut, true, config);
      }
    }
  }
  return null;
}

function checkFit(pieceW: number, pieceL: number, cutW: number, cutL: number, kerf: number): boolean {
  return pieceW + kerf <= cutW && pieceL + kerf <= cutL;
}

function consumeOffCut(
  piece: ExpandedPiece,
  offCut: MutableOffCut,
  rotated: boolean,
  config: YieldConfig,
): AllocationResult {
  const usedW = rotated ? piece.length : piece.width;
  const usedL = rotated ? piece.width : piece.length;

  const remainingWidth = offCut.currentWidth - usedW - config.sawKerf;
  const remainingLength = offCut.currentLength - usedL - config.sawKerf;

  // Update the off-cut in place (largest remaining dimension)
  // Use guillotine cut: reduce the larger dimension
  if (remainingWidth * offCut.currentLength >= offCut.currentWidth * remainingLength) {
    offCut.currentWidth = remainingWidth;
  } else {
    offCut.currentLength = remainingLength;
  }

  let remainingCut: OffCut | null = null;
  if (remainingWidth >= config.minOffCutSize && remainingLength >= config.minOffCutSize) {
    remainingCut = {
      id: `${offCut.id}-rem-${piece.demandId}`,
      sourceProjectId: offCut.sourceProjectId,
      materialId: offCut.materialId,
      thickness: offCut.thickness,
      width: remainingWidth,
      length: remainingLength,
      grainKnown: offCut.grainKnown,
    };
  }

  return {
    result: {
      demandId: piece.demandId,
      offCutId: offCut.id,
      rotated,
      remainingWidth: Math.max(0, remainingWidth),
      remainingLength: Math.max(0, remainingLength),
    },
    remainingCut,
  };
}
