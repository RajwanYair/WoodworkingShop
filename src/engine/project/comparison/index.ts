export {
  compareProjects,
  bestForCriterion,
  percentDifference,
  DEFAULT_PROJECT_COMPARISON_WEIGHTS,
} from '../../workshop/inventory/comparison/index';
export type {
  ProjectMetrics,
  ComparisonWeights,
  NormalisedScores,
  ProjectScore,
  ProjectComparisonResult,
} from '../../workshop/inventory/comparison/index';

export {
  createSnapshot,
  compareDesigns,
  validateWeights,
  getCommonCriteria,
  DEFAULT_WEIGHTS,
  DEFAULT_DESIGN_COMPARISON_WEIGHTS,
  CRITERION_META,
} from '../../workshop/inventory/comparison/index';
export type {
  CriterionName,
  CriterionValue,
  DesignSnapshot,
  CriterionWeight,
  CriterionComparison,
  NormalizedScore,
  DesignComparisonResult as ComparisonResult,
} from '../../workshop/inventory/comparison/index';

export { diffSnapshots } from './snapshot-diff';
export type { FieldDelta, CabinetDiff, SnapshotDiff, SnapshotLike } from './snapshot-diff';
