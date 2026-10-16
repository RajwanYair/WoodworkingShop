export {
  createSnapshot,
  compareDesigns,
  validateWeights,
  getCommonCriteria,
  DEFAULT_WEIGHTS,
  DEFAULT_WEIGHTS as DEFAULT_DESIGN_COMPARISON_WEIGHTS,
  CRITERION_META,
} from './design';
export type {
  CriterionName,
  CriterionValue,
  DesignSnapshot,
  CriterionWeight,
  CriterionComparison,
  NormalizedScore,
  ComparisonResult as DesignComparisonResult,
} from './design';

export {
  compareProjects,
  bestForCriterion,
  percentDifference,
  DEFAULT_WEIGHTS as DEFAULT_PROJECT_COMPARISON_WEIGHTS,
} from './project';
export type {
  ProjectMetrics,
  ComparisonWeights,
  NormalisedScores,
  ProjectScore,
  ComparisonResult as ProjectComparisonResult,
} from './project';
