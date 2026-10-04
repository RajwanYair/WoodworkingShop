/**
 * Project Comparison Dashboard — Sprint 189
 *
 * Compare multiple cabinet designs by cost, waste, time, material usage,
 * part count, and complexity with configurable weighted scoring.
 */

/** Metrics for a single project/design. */
export interface ProjectMetrics {
  readonly projectId: string;
  readonly name: string;
  /** Total material cost. */
  readonly cost: number;
  /** Waste percentage (0-100). */
  readonly wastePercent: number;
  /** Estimated build time in minutes. */
  readonly buildTimeMinutes: number;
  /** Number of distinct materials used. */
  readonly materialCount: number;
  /** Total number of parts. */
  readonly partCount: number;
  /** Number of sheets required. */
  readonly sheetCount: number;
}

/** Weight configuration for scoring (each 0-100, sum doesn't need to equal 100). */
export interface ComparisonWeights {
  readonly cost: number;
  readonly waste: number;
  readonly buildTime: number;
  readonly materialCount: number;
  readonly partCount: number;
  readonly sheetCount: number;
}

/** Per-criterion normalised scores (0-100, higher is better). */
export interface NormalisedScores {
  readonly cost: number;
  readonly waste: number;
  readonly buildTime: number;
  readonly materialCount: number;
  readonly partCount: number;
  readonly sheetCount: number;
}

/** Comparison result for a single project. */
export interface ProjectScore {
  readonly projectId: string;
  readonly name: string;
  readonly metrics: ProjectMetrics;
  readonly scores: NormalisedScores;
  /** Weighted total score (0-100). */
  readonly totalScore: number;
  /** Rank among compared projects (1-based). */
  readonly rank: number;
}

/** Full comparison result. */
export interface ComparisonResult {
  readonly projects: readonly ProjectScore[];
  readonly weights: ComparisonWeights;
  readonly bestProjectId: string;
  readonly worstProjectId: string;
}

/** Default weights (equal weighting). */
export const DEFAULT_WEIGHTS: ComparisonWeights = {
  cost: 25,
  waste: 20,
  buildTime: 20,
  materialCount: 10,
  partCount: 15,
  sheetCount: 10,
} as const;

/**
 * Normalise a value where lower is better (0 = worst, 100 = best).
 */
function normaliseLowerBetter(value: number, min: number, max: number): number {
  if (max === min) return 100;
  return Math.round(((max - value) / (max - min)) * 100);
}

/**
 * Compare multiple projects and produce weighted scores.
 *
 * @param projects - Array of project metrics to compare (minimum 2).
 * @param weights - Optional weight configuration (defaults to equal).
 * @throws {RangeError} If fewer than 2 projects provided.
 * @throws {RangeError} If any weight is negative.
 */
export function compareProjects(
  projects: readonly ProjectMetrics[],
  weights: ComparisonWeights = DEFAULT_WEIGHTS,
): ComparisonResult {
  if (projects.length < 2) {
    throw new RangeError('at least 2 projects required for comparison');
  }

  const weightValues = [
    weights.cost,
    weights.waste,
    weights.buildTime,
    weights.materialCount,
    weights.partCount,
    weights.sheetCount,
  ];
  if (weightValues.some((w) => w < 0)) {
    throw new RangeError('weights must be >= 0');
  }

  const totalWeight = weightValues.reduce((s, w) => s + w, 0);
  if (totalWeight === 0) {
    throw new RangeError('total weight must be > 0');
  }

  const fields = ['cost', 'wastePercent', 'buildTimeMinutes', 'materialCount', 'partCount', 'sheetCount'] as const;
  const mins = fields.map((f) => Math.min(...projects.map((p) => p[f])));
  const maxs = fields.map((f) => Math.max(...projects.map((p) => p[f])));

  const scored: ProjectScore[] = projects.map((p) => {
    const scores: NormalisedScores = {
      cost: normaliseLowerBetter(p.cost, mins[0], maxs[0]),
      waste: normaliseLowerBetter(p.wastePercent, mins[1], maxs[1]),
      buildTime: normaliseLowerBetter(p.buildTimeMinutes, mins[2], maxs[2]),
      materialCount: normaliseLowerBetter(p.materialCount, mins[3], maxs[3]),
      partCount: normaliseLowerBetter(p.partCount, mins[4], maxs[4]),
      sheetCount: normaliseLowerBetter(p.sheetCount, mins[5], maxs[5]),
    };

    const weightedSum =
      scores.cost * weights.cost +
      scores.waste * weights.waste +
      scores.buildTime * weights.buildTime +
      scores.materialCount * weights.materialCount +
      scores.partCount * weights.partCount +
      scores.sheetCount * weights.sheetCount;

    const totalScore = Math.round(weightedSum / totalWeight);

    return { projectId: p.projectId, name: p.name, metrics: p, scores, totalScore, rank: 0 };
  });

  scored.sort((a, b) => b.totalScore - a.totalScore);

  const ranked = scored.map((s, i) => ({ ...s, rank: i + 1 }));

  return {
    projects: ranked,
    weights,
    bestProjectId: ranked[0].projectId,
    worstProjectId: ranked[ranked.length - 1].projectId,
  };
}

/**
 * Get the winner for a specific criterion.
 */
export function bestForCriterion(
  projects: readonly ProjectMetrics[],
  criterion: keyof NormalisedScores,
): ProjectMetrics | undefined {
  if (projects.length === 0) return undefined;

  const field = {
    cost: 'cost',
    waste: 'wastePercent',
    buildTime: 'buildTimeMinutes',
    materialCount: 'materialCount',
    partCount: 'partCount',
    sheetCount: 'sheetCount',
  } as const;

  const key = field[criterion] as keyof ProjectMetrics;
  return projects.reduce((best, p) => ((p[key] as number) < (best[key] as number) ? p : best));
}

/**
 * Compute percentage difference between two projects for a metric.
 */
export function percentDifference(a: number, b: number): number {
  if (b === 0) return a === 0 ? 0 : 100;
  return Math.round(Math.abs(((a - b) / b) * 100) * 100) / 100;
}
