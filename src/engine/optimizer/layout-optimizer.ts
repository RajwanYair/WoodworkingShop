/**
 * Workshop Layout Optimizer — Sprint 179
 *
 * Score tool placements based on workflow efficiency.
 * Compute workflow distance matrix and suggest position swaps
 * to minimize total walking distance during a project.
 */

/** 2D position in the workshop (metres from origin). */
export interface ToolPosition {
  readonly toolId: string;
  readonly x: number;
  readonly y: number;
}

/** A workflow step: move from one tool to another. */
export interface WorkflowStep {
  readonly from: string;
  readonly to: string;
  /** Number of times this transition occurs during the project. */
  readonly frequency: number;
}

/** A suggested swap to improve layout efficiency. */
export interface SwapSuggestion {
  readonly toolA: string;
  readonly toolB: string;
  readonly currentDistance: number;
  readonly savedDistance: number;
  readonly percentImprovement: number;
}

/** Full layout analysis result. */
export interface LayoutAnalysisResult {
  readonly totalDistance: number;
  readonly distanceMatrix: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly suggestions: readonly SwapSuggestion[];
  readonly efficiencyScore: number;
}

/**
 * Compute Euclidean distance between two positions.
 */
function euclidean(a: ToolPosition, b: ToolPosition): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Build a full distance matrix between all tool positions.
 */
export function buildDistanceMatrix(positions: readonly ToolPosition[]): Map<string, Map<string, number>> {
  if (positions.length === 0) {
    throw new RangeError('positions must not be empty');
  }

  const matrix = new Map<string, Map<string, number>>();

  for (const a of positions) {
    const row = new Map<string, number>();
    for (const b of positions) {
      row.set(b.toolId, a.toolId === b.toolId ? 0 : euclidean(a, b));
    }
    matrix.set(a.toolId, row);
  }

  return matrix;
}

/**
 * Compute total walking distance for a given layout and workflow.
 */
export function computeTotalDistance(positions: readonly ToolPosition[], workflow: readonly WorkflowStep[]): number {
  if (positions.length === 0) {
    throw new RangeError('positions must not be empty');
  }
  if (workflow.length === 0) {
    throw new RangeError('workflow must not be empty');
  }

  const posMap = new Map(positions.map((p) => [p.toolId, p]));

  let total = 0;
  for (const step of workflow) {
    const from = posMap.get(step.from);
    const to = posMap.get(step.to);
    if (!from) throw new RangeError(`no position for tool "${step.from}"`);
    if (!to) throw new RangeError(`no position for tool "${step.to}"`);
    total += euclidean(from, to) * step.frequency;
  }

  return total;
}

/**
 * Generate swap suggestions that would reduce total walking distance.
 * Tests all pairwise swaps and returns those with positive improvement,
 * sorted by greatest distance saved.
 */
export function suggestSwaps(
  positions: readonly ToolPosition[],
  workflow: readonly WorkflowStep[],
  maxSuggestions = 5,
): SwapSuggestion[] {
  if (positions.length < 2) return [];
  if (workflow.length === 0) return [];

  const baseline = computeTotalDistance(positions, workflow);
  const suggestions: SwapSuggestion[] = [];

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      // Swap positions of tool i and tool j
      const swapped = positions.map((p, idx) => {
        if (idx === i) return { toolId: p.toolId, x: positions[j].x, y: positions[j].y };
        if (idx === j) return { toolId: p.toolId, x: positions[i].x, y: positions[i].y };
        return p;
      });

      const swappedDistance = computeTotalDistance(swapped, workflow);
      const saved = baseline - swappedDistance;

      if (saved > 0) {
        suggestions.push({
          toolA: positions[i].toolId,
          toolB: positions[j].toolId,
          currentDistance: baseline,
          savedDistance: saved,
          percentImprovement: (saved / baseline) * 100,
        });
      }
    }
  }

  suggestions.sort((a, b) => b.savedDistance - a.savedDistance);
  return suggestions.slice(0, maxSuggestions);
}

/**
 * Compute an efficiency score (0–100) based on how compact the workflow paths are
 * relative to the worst possible layout.
 *
 * Score = 100 × (1 − actual / worstCase)
 * Worst case = all steps at max distance in the workshop.
 */
export function computeEfficiencyScore(positions: readonly ToolPosition[], workflow: readonly WorkflowStep[]): number {
  if (positions.length === 0 || workflow.length === 0) return 100;

  const matrix = buildDistanceMatrix(positions);
  let maxDist = 0;
  for (const [, row] of matrix) {
    for (const [, dist] of row) {
      if (dist > maxDist) maxDist = dist;
    }
  }

  if (maxDist === 0) return 100;

  const totalFrequency = workflow.reduce((sum, s) => sum + s.frequency, 0);
  const worstCase = maxDist * totalFrequency;
  const actual = computeTotalDistance(positions, workflow);

  const score = 100 * (1 - actual / worstCase);
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

/**
 * Full layout analysis: distance matrix + total distance + suggestions + score.
 */
export function analyzeLayout(
  positions: readonly ToolPosition[],
  workflow: readonly WorkflowStep[],
): LayoutAnalysisResult {
  if (positions.length === 0) {
    throw new RangeError('positions must not be empty');
  }
  if (workflow.length === 0) {
    throw new RangeError('workflow must not be empty');
  }

  const distanceMatrix = buildDistanceMatrix(positions);
  const totalDistance = computeTotalDistance(positions, workflow);
  const suggestions = suggestSwaps(positions, workflow);
  const efficiencyScore = computeEfficiencyScore(positions, workflow);

  return { totalDistance, distanceMatrix, suggestions, efficiencyScore };
}
