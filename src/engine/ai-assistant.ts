/**
 * AI Design Assistant engine — constraint-based layout suggestions.
 *
 * Pure TypeScript. No DOM, no React, no side effects.
 * All functions are deterministic given the same inputs.
 */

import type { CabinetConfig, FurnitureType } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConstraintKind =
  | 'min-height'
  | 'max-height'
  | 'min-width'
  | 'max-width'
  | 'min-depth'
  | 'max-depth'
  | 'min-shelves'
  | 'max-shelves'
  | 'has-drawers'
  | 'has-doors'
  | 'material-match'
  | 'furniture-type';

export type ConstraintPriority = 'required' | 'preferred' | 'optional';

export interface LayoutConstraint {
  kind: ConstraintKind;
  /** Numeric threshold (for dimensional constraints) or string (material/type). */
  value: number | string | boolean;
  priority: ConstraintPriority;
  description?: string;
}

export type SuggestionKind =
  | 'resize-width'
  | 'resize-height'
  | 'resize-depth'
  | 'add-drawers'
  | 'remove-drawers'
  | 'add-doors'
  | 'change-material'
  | 'adjust-shelves'
  | 'change-furniture-type';

export interface AiLayoutSuggestion {
  id: string;
  kind: SuggestionKind;
  title: string;
  rationale: string;
  configDelta: Partial<CabinetConfig>;
  constraintsSatisfied: ConstraintKind[];
  estimatedImprovementScore: number;
}

export interface SuggestionWeights {
  /** 0–1: weight for how many constraints are resolved */
  constraintCoverage: number;
  /** 0–1: weight for how well the result fits ergonomic norms */
  dimensionalFit: number;
  /** 0–1: weight for keeping existing material selection */
  materialConsistency: number;
  /** 0–1: weight for minimising estimated cost increase */
  costImpact: number;
}

export interface RankedSuggestion {
  suggestion: AiLayoutSuggestion;
  rank: number;
  score: number;
  components: {
    constraintCoverage: number;
    dimensionalFit: number;
    materialConsistency: number;
    costImpact: number;
  };
}

export interface ConstraintCheckResult {
  satisfied: LayoutConstraint[];
  violated: LayoutConstraint[];
  partial: LayoutConstraint[];
}

export interface DesignBrief {
  cabinetType: FurnitureType;
  currentDimensions: { width: number; height: number; depth: number };
  materialNote: string;
  featureHighlights: string[];
  constraintsSatisfied: number;
  constraintsViolated: number;
  suggestions: AiLayoutSuggestion[];
  overallScore: number;
}

// ─── Default weights ──────────────────────────────────────────────────────────

export const DEFAULT_SUGGESTION_WEIGHTS: SuggestionWeights = {
  constraintCoverage: 0.4,
  dimensionalFit: 0.3,
  materialConsistency: 0.2,
  costImpact: 0.1,
};

// ─── Ergonomic norms (mm) ─────────────────────────────────────────────────────

const ERGONOMIC_NORM = {
  baseHeight: { min: 700, ideal: 870, max: 950 },
  wallHeight: { min: 550, ideal: 720, max: 900 },
  depth: { min: 300, ideal: 580, max: 650 },
  width: { min: 300, ideal: 600, max: 1200 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function dimensionalFitScore(config: CabinetConfig): number {
  const norm = config.furnitureType === 'bookshelf' ? ERGONOMIC_NORM.wallHeight : ERGONOMIC_NORM.baseHeight;
  const hScore = 1 - Math.abs(config.height - norm.ideal) / (norm.max - norm.min);
  const dScore =
    1 - Math.abs(config.depth - ERGONOMIC_NORM.depth.ideal) / (ERGONOMIC_NORM.depth.max - ERGONOMIC_NORM.depth.min);
  const wScore =
    1 - Math.abs(config.width - ERGONOMIC_NORM.width.ideal) / (ERGONOMIC_NORM.width.max - ERGONOMIC_NORM.width.min);
  return clamp((hScore + dScore + wScore) / 3, 0, 1);
}

function checkConstraint(config: CabinetConfig, constraint: LayoutConstraint): 'satisfied' | 'violated' | 'partial' {
  const { kind, value } = constraint;
  switch (kind) {
    case 'min-height':
      return config.height >= (value as number) ? 'satisfied' : 'violated';
    case 'max-height':
      return config.height <= (value as number) ? 'satisfied' : 'violated';
    case 'min-width':
      return config.width >= (value as number) ? 'satisfied' : 'violated';
    case 'max-width':
      return config.width <= (value as number) ? 'satisfied' : 'violated';
    case 'min-depth':
      return config.depth >= (value as number) ? 'satisfied' : 'violated';
    case 'max-depth':
      return config.depth <= (value as number) ? 'satisfied' : 'violated';
    case 'min-shelves':
      return config.shelfCount >= (value as number) ? 'satisfied' : 'violated';
    case 'max-shelves':
      return config.shelfCount <= (value as number) ? 'satisfied' : 'violated';
    case 'has-drawers':
      return config.drawerCount > 0 === (value as boolean) ? 'satisfied' : 'violated';
    case 'has-doors':
      return config.doorCount > 0 === (value as boolean) ? 'satisfied' : 'violated';
    case 'material-match':
      return config.carcassMaterial === (value as string) ? 'satisfied' : 'partial';
    case 'furniture-type':
      return config.furnitureType === (value as string) ? 'satisfied' : 'violated';
    default:
      return 'partial';
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validate a config against a list of constraints.
 * Returns three arrays: satisfied, violated, and partial (ambiguous/soft).
 */
export function validateLayoutConstraints(
  config: CabinetConfig,
  constraints: LayoutConstraint[],
): ConstraintCheckResult {
  const result: ConstraintCheckResult = { satisfied: [], violated: [], partial: [] };
  for (const c of constraints) {
    const status = checkConstraint(config, c);
    result[status].push(c);
  }
  return result;
}

/**
 * Generate layout suggestions that address violated constraints
 * and improve the overall design score.
 */
export function suggestLayouts(config: CabinetConfig, constraints: LayoutConstraint[]): AiLayoutSuggestion[] {
  const { violated } = validateLayoutConstraints(config, constraints);
  const suggestions: AiLayoutSuggestion[] = [];
  let counter = 0;

  const makeId = (kind: SuggestionKind) => `suggestion-${++counter}-${kind}`;

  for (const c of violated) {
    switch (c.kind) {
      case 'min-height': {
        const target = c.value as number;
        suggestions.push({
          id: makeId('resize-height'),
          kind: 'resize-height',
          title: `Increase height to ${target} mm`,
          rationale: `Current height (${config.height} mm) is below the required minimum of ${target} mm.`,
          configDelta: { height: target },
          constraintsSatisfied: ['min-height'],
          estimatedImprovementScore: 0.8,
        });
        break;
      }
      case 'max-height': {
        const target = c.value as number;
        suggestions.push({
          id: makeId('resize-height'),
          kind: 'resize-height',
          title: `Reduce height to ${target} mm`,
          rationale: `Current height (${config.height} mm) exceeds the maximum of ${target} mm.`,
          configDelta: { height: target },
          constraintsSatisfied: ['max-height'],
          estimatedImprovementScore: 0.8,
        });
        break;
      }
      case 'min-width': {
        const target = c.value as number;
        suggestions.push({
          id: makeId('resize-width'),
          kind: 'resize-width',
          title: `Increase width to ${target} mm`,
          rationale: `Current width (${config.width} mm) is below the required minimum of ${target} mm.`,
          configDelta: { width: target },
          constraintsSatisfied: ['min-width'],
          estimatedImprovementScore: 0.75,
        });
        break;
      }
      case 'max-width': {
        const target = c.value as number;
        suggestions.push({
          id: makeId('resize-width'),
          kind: 'resize-width',
          title: `Reduce width to ${target} mm`,
          rationale: `Current width (${config.width} mm) exceeds the maximum of ${target} mm.`,
          configDelta: { width: target },
          constraintsSatisfied: ['max-width'],
          estimatedImprovementScore: 0.75,
        });
        break;
      }
      case 'min-depth': {
        const target = c.value as number;
        suggestions.push({
          id: makeId('resize-depth'),
          kind: 'resize-depth',
          title: `Increase depth to ${target} mm`,
          rationale: `Current depth (${config.depth} mm) is below the required minimum of ${target} mm.`,
          configDelta: { depth: target },
          constraintsSatisfied: ['min-depth'],
          estimatedImprovementScore: 0.7,
        });
        break;
      }
      case 'max-depth': {
        const target = c.value as number;
        suggestions.push({
          id: makeId('resize-depth'),
          kind: 'resize-depth',
          title: `Reduce depth to ${target} mm`,
          rationale: `Current depth (${config.depth} mm) exceeds the maximum of ${target} mm.`,
          configDelta: { depth: target },
          constraintsSatisfied: ['max-depth'],
          estimatedImprovementScore: 0.7,
        });
        break;
      }
      case 'min-shelves': {
        const target = c.value as number;
        suggestions.push({
          id: makeId('adjust-shelves'),
          kind: 'adjust-shelves',
          title: `Add shelves to reach ${target}`,
          rationale: `Only ${config.shelfCount} shelf/shelves present; minimum is ${target}.`,
          configDelta: { shelfCount: target },
          constraintsSatisfied: ['min-shelves'],
          estimatedImprovementScore: 0.65,
        });
        break;
      }
      case 'max-shelves': {
        const target = c.value as number;
        suggestions.push({
          id: makeId('adjust-shelves'),
          kind: 'adjust-shelves',
          title: `Reduce shelves to ${target}`,
          rationale: `${config.shelfCount} shelves present; maximum is ${target}.`,
          configDelta: { shelfCount: target },
          constraintsSatisfied: ['max-shelves'],
          estimatedImprovementScore: 0.6,
        });
        break;
      }
      case 'has-drawers': {
        const want = c.value as boolean;
        suggestions.push({
          id: makeId(want ? 'add-drawers' : 'remove-drawers'),
          kind: want ? 'add-drawers' : 'remove-drawers',
          title: want ? 'Add drawers' : 'Remove drawers',
          rationale: want
            ? 'Drawers are required by the design brief but none are configured.'
            : 'Drawers are not permitted in this design but are currently configured.',
          configDelta: { drawerCount: want ? 1 : 0 },
          constraintsSatisfied: ['has-drawers'],
          estimatedImprovementScore: 0.7,
        });
        break;
      }
      case 'has-doors': {
        const want = c.value as boolean;
        if (want) {
          // doorCount is always 1|2, so has-doors:true is never violated;
          // guard handles edge cases from future type changes.
          suggestions.push({
            id: makeId('add-doors'),
            kind: 'add-doors',
            title: 'Configure doors',
            rationale: 'Doors are required by the design brief.',
            configDelta: { doorCount: 1 },
            constraintsSatisfied: ['has-doors'],
            estimatedImprovementScore: 0.65,
          });
        }
        // has-doors:false cannot be satisfied (doorCount is 1|2) — skip suggestion
        break;
      }
      case 'material-match': {
        const mat = c.value as string;
        suggestions.push({
          id: makeId('change-material'),
          kind: 'change-material',
          title: `Switch material to ${mat}`,
          rationale: `Preferred material "${mat}" differs from current "${config.carcassMaterial}".`,
          configDelta: { carcassMaterial: mat },
          constraintsSatisfied: ['material-match'],
          estimatedImprovementScore: 0.55,
        });
        break;
      }
      case 'furniture-type': {
        const type = c.value as FurnitureType;
        suggestions.push({
          id: makeId('change-furniture-type'),
          kind: 'change-furniture-type',
          title: `Change furniture type to ${type}`,
          rationale: `Design brief specifies "${type}" but config is set to "${config.furnitureType}".`,
          configDelta: { furnitureType: type },
          constraintsSatisfied: ['furniture-type'],
          estimatedImprovementScore: 0.5,
        });
        break;
      }
    }
  }

  return suggestions;
}

/**
 * Rank suggestions by a weighted scoring model.
 * Higher score = better suggestion.
 */
export function rankSuggestions(
  config: CabinetConfig,
  suggestions: AiLayoutSuggestion[],
  weights: SuggestionWeights = DEFAULT_SUGGESTION_WEIGHTS,
): RankedSuggestion[] {
  const baseDimFit = dimensionalFitScore(config);

  const scored = suggestions.map((s) => {
    const constraintCoverage = s.constraintsSatisfied.length > 0 ? s.estimatedImprovementScore : 0;

    const applied = applyLayoutSuggestion(config, s);
    const newDimFit = dimensionalFitScore(applied);
    const dimensionalFit = clamp(newDimFit - baseDimFit + 0.5, 0, 1);

    const materialConsistency = s.kind === 'change-material' ? 0.3 : 0.9;
    const costImpact = s.kind === 'resize-width' || s.kind === 'resize-height' || s.kind === 'resize-depth' ? 0.5 : 0.8;

    const score =
      weights.constraintCoverage * constraintCoverage +
      weights.dimensionalFit * dimensionalFit +
      weights.materialConsistency * materialConsistency +
      weights.costImpact * costImpact;

    return {
      suggestion: s,
      rank: 0,
      score: Math.round(score * 1000) / 1000,
      components: { constraintCoverage, dimensionalFit, materialConsistency, costImpact },
    };
  });

  scored.sort((a, b) => b.score - a.score);
  scored.forEach((r, i) => {
    r.rank = i + 1;
  });

  return scored;
}

/**
 * Apply a suggestion's configDelta to a config and return the merged result.
 * The original config is not mutated.
 */
export function applyLayoutSuggestion(config: CabinetConfig, suggestion: AiLayoutSuggestion): CabinetConfig {
  return { ...config, ...suggestion.configDelta };
}

/**
 * Build a human-readable design brief summarising the current config,
 * constraint results, and top suggestions.
 */
export function createDesignBrief(config: CabinetConfig, constraints: LayoutConstraint[]): DesignBrief {
  const checkResult = validateLayoutConstraints(config, constraints);
  const suggestions = suggestLayouts(config, constraints);
  const ranked = rankSuggestions(config, suggestions);

  const featureHighlights: string[] = [];
  if (config.drawerCount > 0) featureHighlights.push(`${config.drawerCount} drawer(s)`);
  if (config.doorCount > 0) featureHighlights.push(`${config.doorCount} door(s)`);
  if (config.shelfCount > 0) featureHighlights.push(`${config.shelfCount} shelf/shelves`);

  const dimFit = dimensionalFitScore(config);

  return {
    cabinetType: config.furnitureType,
    currentDimensions: {
      width: config.width,
      height: config.height,
      depth: config.depth,
    },
    materialNote: `Material: ${config.carcassMaterial}`,
    featureHighlights,
    constraintsSatisfied: checkResult.satisfied.length,
    constraintsViolated: checkResult.violated.length,
    suggestions: ranked.slice(0, 3).map((r) => r.suggestion),
    overallScore: Math.round(dimFit * 100),
  };
}

/**
 * Format a ConstraintCheckResult as a human-readable text report.
 */
export function formatConstraintReport(result: ConstraintCheckResult): string {
  const lines: string[] = ['=== Constraint Check Report ==='];
  lines.push(`Satisfied : ${result.satisfied.length}`);
  lines.push(`Violated  : ${result.violated.length}`);
  lines.push(`Partial   : ${result.partial.length}`);

  if (result.violated.length > 0) {
    lines.push('');
    lines.push('Violations:');
    for (const c of result.violated) {
      lines.push(`  [!] ${c.kind} = ${String(c.value)} (${c.priority})`);
    }
  }

  if (result.partial.length > 0) {
    lines.push('');
    lines.push('Partial:');
    for (const c of result.partial) {
      lines.push(`  [~] ${c.kind} = ${String(c.value)} (${c.priority})`);
    }
  }

  return lines.join('\n');
}
