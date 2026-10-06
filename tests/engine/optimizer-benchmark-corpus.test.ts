import { describe, expect, it } from 'vitest';
import {
  buildOptimizerBenchmarkCorpus,
  findOptimizerBenchmarkViolations,
  OPTIMIZER_BENCHMARK_CORPUS,
  scoreOptimizerBenchmarkScenario,
} from '../bench/optimizer-corpus';

describe('optimizer benchmark corpus', () => {
  it('rebuilds the same scenarios from their recorded seeds', () => {
    expect(buildOptimizerBenchmarkCorpus()).toEqual(OPTIMIZER_BENCHMARK_CORPUS);
  });

  it.each(OPTIMIZER_BENCHMARK_CORPUS)('$id has valid placements and a recorded baseline', (scenario) => {
    const score = scoreOptimizerBenchmarkScenario(scenario);

    expect(findOptimizerBenchmarkViolations(scenario)).toEqual([]);
    expect(score).toEqual(scenario.baseline);
  });

  it('covers all planned optimizer scenario categories', () => {
    const coverage = new Set(OPTIMIZER_BENCHMARK_CORPUS.flatMap((scenario) => scenario.coverage));

    expect(coverage).toEqual(
      new Set([
        'small-sheet',
        'large-sheet',
        'long-strips',
        'mixed-materials',
        'mixed-thickness',
        'rotation-locks',
        'defects',
        'offcuts',
      ]),
    );
  });
});
