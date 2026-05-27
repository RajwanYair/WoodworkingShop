/**
 * Edge Banding Calculator — Sprint 185
 *
 * Computes total edge banding length per material/color,
 * accounts for exposed edges only, groups by banding type,
 * and adds configurable wastage allowance.
 */

/** Edge position on a rectangular part. */
export type EdgePosition = 'top' | 'bottom' | 'left' | 'right';

/** Edge exposure configuration for a part. */
export interface EdgeExposure {
  readonly top: boolean;
  readonly bottom: boolean;
  readonly left: boolean;
  readonly right: boolean;
}

/** Banding material specification. */
export interface BandingSpec {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly widthMm: number;
  readonly thicknessMm: number;
  /** Cost per linear metre. */
  readonly costPerMetre: number;
}

/** A part requiring edge banding. */
export interface BandingPart {
  readonly partId: string;
  readonly label: string;
  /** Part width in mm (horizontal). */
  readonly width: number;
  /** Part height in mm (vertical). */
  readonly height: number;
  /** Which edges are exposed/visible. */
  readonly exposure: EdgeExposure;
  /** Banding spec to apply. */
  readonly bandingId: string;
}

/** Result for a single edge. */
export interface EdgeBandingLine {
  readonly partId: string;
  readonly partLabel: string;
  readonly edge: EdgePosition;
  readonly lengthMm: number;
  readonly bandingId: string;
}

/** Grouped banding summary per banding type. */
export interface BandingGroup {
  readonly bandingId: string;
  readonly bandingName: string;
  readonly color: string;
  readonly totalLengthMm: number;
  readonly totalLengthWithWasteMm: number;
  readonly edgeCount: number;
  readonly cost: number;
  readonly costWithWaste: number;
}

/** Full edge banding calculation result. */
export interface EdgeBandingResult {
  readonly lines: readonly EdgeBandingLine[];
  readonly groups: readonly BandingGroup[];
  readonly totalLengthMm: number;
  readonly totalLengthWithWasteMm: number;
  readonly totalCost: number;
  readonly totalCostWithWaste: number;
  readonly wastagePercent: number;
}

/**
 * Get the length of an edge based on position and part dimensions.
 */
function edgeLength(part: BandingPart, edge: EdgePosition): number {
  if (edge === 'top' || edge === 'bottom') return part.width;
  return part.height;
}

/**
 * Calculate edge banding requirements for a set of parts.
 *
 * @param parts - Parts with edge exposure data.
 * @param specs - Available banding materials.
 * @param wastagePercent - Extra wastage allowance (default 10%).
 * @throws {RangeError} If wastagePercent is negative.
 * @throws {RangeError} If a part references an unknown bandingId.
 */
export function calculateEdgeBanding(
  parts: readonly BandingPart[],
  specs: readonly BandingSpec[],
  wastagePercent = 10,
): EdgeBandingResult {
  if (wastagePercent < 0) {
    throw new RangeError('wastagePercent must be >= 0');
  }

  const specMap = new Map(specs.map((s) => [s.id, s]));
  const lines: EdgeBandingLine[] = [];
  const edges: EdgePosition[] = ['top', 'bottom', 'left', 'right'];

  for (const part of parts) {
    if (!specMap.has(part.bandingId)) {
      throw new RangeError(`unknown bandingId: "${part.bandingId}"`);
    }

    for (const edge of edges) {
      if (part.exposure[edge]) {
        lines.push({
          partId: part.partId,
          partLabel: part.label,
          edge,
          lengthMm: edgeLength(part, edge),
          bandingId: part.bandingId,
        });
      }
    }
  }

  const groupMap = new Map<string, { lengthMm: number; edgeCount: number }>();
  for (const line of lines) {
    const existing = groupMap.get(line.bandingId) ?? { lengthMm: 0, edgeCount: 0 };
    existing.lengthMm += line.lengthMm;
    existing.edgeCount += 1;
    groupMap.set(line.bandingId, existing);
  }

  const wastageFactor = 1 + wastagePercent / 100;
  const groups: BandingGroup[] = [];

  for (const [bandingId, data] of groupMap) {
    const spec = specMap.get(bandingId)!;
    const totalWithWaste = data.lengthMm * wastageFactor;
    const costBase = (data.lengthMm / 1000) * spec.costPerMetre;
    const costWaste = (totalWithWaste / 1000) * spec.costPerMetre;

    groups.push({
      bandingId,
      bandingName: spec.name,
      color: spec.color,
      totalLengthMm: data.lengthMm,
      totalLengthWithWasteMm: Math.ceil(totalWithWaste),
      edgeCount: data.edgeCount,
      cost: Math.round(costBase * 100) / 100,
      costWithWaste: Math.round(costWaste * 100) / 100,
    });
  }

  groups.sort((a, b) => b.totalLengthMm - a.totalLengthMm);

  const totalLengthMm = lines.reduce((sum, l) => sum + l.lengthMm, 0);
  const totalLengthWithWasteMm = Math.ceil(totalLengthMm * wastageFactor);
  const totalCost = groups.reduce((sum, g) => sum + g.cost, 0);
  const totalCostWithWaste = groups.reduce((sum, g) => sum + g.costWithWaste, 0);

  return {
    lines,
    groups,
    totalLengthMm,
    totalLengthWithWasteMm,
    totalCost: Math.round(totalCost * 100) / 100,
    totalCostWithWaste: Math.round(totalCostWithWaste * 100) / 100,
    wastagePercent,
  };
}

/**
 * Detect which edges of a part are exposed based on adjacency rules.
 *
 * @param isTopExposed - Top edge visible (not against another part/wall).
 * @param isBottomExposed - Bottom edge visible.
 * @param isLeftExposed - Left edge visible.
 * @param isRightExposed - Right edge visible.
 */
export function detectExposedEdges(
  isTopExposed: boolean,
  isBottomExposed: boolean,
  isLeftExposed: boolean,
  isRightExposed: boolean,
): EdgeExposure {
  return {
    top: isTopExposed,
    bottom: isBottomExposed,
    left: isLeftExposed,
    right: isRightExposed,
  };
}

/**
 * Convenience: create an EdgeExposure where all edges are exposed.
 */
export function allEdgesExposed(): EdgeExposure {
  return { top: true, bottom: true, left: true, right: true };
}

/**
 * Convenience: create an EdgeExposure for front-facing parts only
 * (top and bottom exposed, left/right hidden by cabinet sides).
 */
export function frontEdgesOnly(): EdgeExposure {
  return { top: true, bottom: true, left: false, right: false };
}
