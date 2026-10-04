/**
 * Sprint 170 — Design Comparison Engine.
 *
 * Compare two cabinet/furniture design variants side-by-side with
 * quantitative scoring across multiple dimensions: material usage,
 * cost, complexity, cut efficiency, and structural strength.
 *
 * Features:
 *   - Multi-criteria comparison (cost, material, complexity, waste, strength)
 *   - Weighted scoring system
 *   - Radar-chart-compatible output
 *   - Comparison summaries with winner per criterion
 *   - Delta calculations (absolute and percentage)
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Comparison criterion name. */
export type CriterionName =
  | 'materialCost'
  | 'materialArea'
  | 'partCount'
  | 'cutComplexity'
  | 'wastePercent'
  | 'assemblySteps'
  | 'structuralScore';

/** A single criterion measurement for a design. */
export interface CriterionValue {
  /** Criterion name. */
  name: CriterionName;
  /** Raw value. */
  value: number;
  /** Unit label. */
  unit: string;
  /** Whether lower is better for this criterion. */
  lowerIsBetter: boolean;
}

/** A design snapshot to compare. */
export interface DesignSnapshot {
  /** Design ID. */
  id: string;
  /** Design name. */
  name: string;
  /** Criteria values. */
  criteria: CriterionValue[];
}

/** Weight configuration for scoring. */
export interface CriterionWeight {
  /** Criterion name. */
  name: CriterionName;
  /** Weight (0–1, all weights should sum to 1). */
  weight: number;
}

/** Comparison result for a single criterion. */
export interface CriterionComparison {
  /** Criterion name. */
  name: CriterionName;
  /** Value from design A. */
  valueA: number;
  /** Value from design B. */
  valueB: number;
  /** Unit. */
  unit: string;
  /** Absolute delta (B - A). */
  deltaAbsolute: number;
  /** Percentage change from A to B. */
  deltaPercent: number;
  /** Winner ('a', 'b', or 'tie'). */
  winner: 'a' | 'b' | 'tie';
}

/** Normalized score (0–1) for radar chart. */
export interface NormalizedScore {
  /** Criterion name. */
  name: CriterionName;
  /** Score for design A (0–1, higher = better). */
  scoreA: number;
  /** Score for design B (0–1, higher = better). */
  scoreB: number;
}

/** Full comparison result. */
export interface ComparisonResult {
  /** Design A info. */
  designA: { id: string; name: string };
  /** Design B info. */
  designB: { id: string; name: string };
  /** Per-criterion comparisons. */
  criteria: CriterionComparison[];
  /** Normalized scores (for radar chart). */
  normalizedScores: NormalizedScore[];
  /** Weighted total score for A (0–100). */
  totalScoreA: number;
  /** Weighted total score for B (0–100). */
  totalScoreB: number;
  /** Overall winner. */
  overallWinner: 'a' | 'b' | 'tie';
  /** Summary text. */
  summary: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default criterion weights (equal weighting). */
export const DEFAULT_WEIGHTS: CriterionWeight[] = [
  { name: 'materialCost', weight: 0.2 },
  { name: 'materialArea', weight: 0.15 },
  { name: 'partCount', weight: 0.1 },
  { name: 'cutComplexity', weight: 0.15 },
  { name: 'wastePercent', weight: 0.15 },
  { name: 'assemblySteps', weight: 0.1 },
  { name: 'structuralScore', weight: 0.15 },
];

/** Criterion metadata. */
export const CRITERION_META: Record<CriterionName, { unit: string; lowerIsBetter: boolean }> = {
  materialCost: { unit: 'USD', lowerIsBetter: true },
  materialArea: { unit: 'm²', lowerIsBetter: true },
  partCount: { unit: 'parts', lowerIsBetter: true },
  cutComplexity: { unit: 'cuts', lowerIsBetter: true },
  wastePercent: { unit: '%', lowerIsBetter: true },
  assemblySteps: { unit: 'steps', lowerIsBetter: true },
  structuralScore: { unit: 'score', lowerIsBetter: false },
};

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Create a design snapshot from criteria values.
 *
 * @param id       Design ID.
 * @param name     Design name.
 * @param values   Record of criterion name → value.
 * @returns Design snapshot.
 */
export function createSnapshot(
  id: string,
  name: string,
  values: Partial<Record<CriterionName, number>>,
): DesignSnapshot {
  if (!name.trim()) {
    throw new RangeError('createSnapshot: name must not be empty');
  }

  const criteria: CriterionValue[] = Object.entries(values).map(([key, value]) => {
    const criterionName = key as CriterionName;
    const meta = CRITERION_META[criterionName];
    if (!meta) {
      throw new RangeError(`createSnapshot: unknown criterion "${key}"`);
    }
    return {
      name: criterionName,
      value: value!,
      unit: meta.unit,
      lowerIsBetter: meta.lowerIsBetter,
    };
  });

  return { id, name: name.trim(), criteria };
}

/**
 * Compare two design snapshots.
 *
 * @param designA  First design.
 * @param designB  Second design.
 * @param weights  Custom weights (defaults to equal weighting).
 * @returns Comparison result.
 */
export function compareDesigns(
  designA: DesignSnapshot,
  designB: DesignSnapshot,
  weights: CriterionWeight[] = DEFAULT_WEIGHTS,
): ComparisonResult {
  validateWeights(weights);

  // Get all criteria present in both designs
  const criteriaNames = getCommonCriteria(designA, designB);

  // Per-criterion comparison
  const criteriaComparisons: CriterionComparison[] = criteriaNames.map((name) => {
    const valueA = getCriterionValue(designA, name);
    const valueB = getCriterionValue(designB, name);
    const meta = CRITERION_META[name];
    const deltaAbsolute = Math.round((valueB - valueA) * 100) / 100;
    const deltaPercent = valueA !== 0 ? Math.round(((valueB - valueA) / valueA) * 10000) / 100 : 0;

    let winner: 'a' | 'b' | 'tie';
    if (valueA === valueB) {
      winner = 'tie';
    } else if (meta.lowerIsBetter) {
      winner = valueA < valueB ? 'a' : 'b';
    } else {
      winner = valueA > valueB ? 'a' : 'b';
    }

    return { name, valueA, valueB, unit: meta.unit, deltaAbsolute, deltaPercent, winner };
  });

  // Normalized scores (0–1, higher = better)
  const normalizedScores: NormalizedScore[] = criteriaNames.map((name) => {
    const valueA = getCriterionValue(designA, name);
    const valueB = getCriterionValue(designB, name);
    const meta = CRITERION_META[name];
    const maxVal = Math.max(valueA, valueB, 1); // avoid division by zero

    let scoreA: number;
    let scoreB: number;

    if (meta.lowerIsBetter) {
      scoreA = maxVal > 0 ? 1 - valueA / (maxVal * 1.2) : 1;
      scoreB = maxVal > 0 ? 1 - valueB / (maxVal * 1.2) : 1;
    } else {
      scoreA = maxVal > 0 ? valueA / (maxVal * 1.2) : 0;
      scoreB = maxVal > 0 ? valueB / (maxVal * 1.2) : 0;
    }

    return {
      name,
      scoreA: Math.round(Math.max(0, Math.min(1, scoreA)) * 1000) / 1000,
      scoreB: Math.round(Math.max(0, Math.min(1, scoreB)) * 1000) / 1000,
    };
  });

  // Weighted total scores
  const totalScoreA = computeWeightedScore(normalizedScores, 'a', weights);
  const totalScoreB = computeWeightedScore(normalizedScores, 'b', weights);

  const overallWinner: 'a' | 'b' | 'tie' = totalScoreA > totalScoreB ? 'a' : totalScoreB > totalScoreA ? 'b' : 'tie';

  const summary = generateSummary(designA, designB, criteriaComparisons, overallWinner);

  return {
    designA: { id: designA.id, name: designA.name },
    designB: { id: designB.id, name: designB.name },
    criteria: criteriaComparisons,
    normalizedScores,
    totalScoreA,
    totalScoreB,
    overallWinner,
    summary,
  };
}

/**
 * Validate that weights sum to approximately 1.
 *
 * @param weights Weight array.
 */
export function validateWeights(weights: CriterionWeight[]): void {
  const sum = weights.reduce((s, w) => s + w.weight, 0);
  if (Math.abs(sum - 1.0) > 0.01) {
    throw new RangeError(`validateWeights: weights must sum to 1.0, got ${sum.toFixed(3)}`);
  }
  for (const w of weights) {
    if (w.weight < 0 || w.weight > 1) {
      throw new RangeError(`validateWeights: weight for "${w.name}" must be 0–1`);
    }
  }
}

/**
 * Get the criterion names present in both designs.
 *
 * @param a Design A.
 * @param b Design B.
 * @returns Common criterion names.
 */
export function getCommonCriteria(a: DesignSnapshot, b: DesignSnapshot): CriterionName[] {
  const namesA = new Set(a.criteria.map((c) => c.name));
  return b.criteria.filter((c) => namesA.has(c.name)).map((c) => c.name);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getCriterionValue(design: DesignSnapshot, name: CriterionName): number {
  const criterion = design.criteria.find((c) => c.name === name);
  return criterion?.value ?? 0;
}

function computeWeightedScore(scores: NormalizedScore[], design: 'a' | 'b', weights: CriterionWeight[]): number {
  let total = 0;
  for (const score of scores) {
    const weight = weights.find((w) => w.name === score.name)?.weight ?? 0;
    const value = design === 'a' ? score.scoreA : score.scoreB;
    total += value * weight;
  }
  return Math.round(total * 100);
}

function generateSummary(
  a: DesignSnapshot,
  b: DesignSnapshot,
  comparisons: CriterionComparison[],
  winner: 'a' | 'b' | 'tie',
): string {
  const aWins = comparisons.filter((c) => c.winner === 'a').length;
  const bWins = comparisons.filter((c) => c.winner === 'b').length;
  const ties = comparisons.filter((c) => c.winner === 'tie').length;

  const winnerName = winner === 'a' ? a.name : winner === 'b' ? b.name : 'Neither';
  const prefix = winner === 'tie' ? 'Tie' : `Winner: ${winnerName}`;

  return `${prefix}. "${a.name}" wins ${aWins} criteria, "${b.name}" wins ${bWins}, ${ties} tied.`;
}
