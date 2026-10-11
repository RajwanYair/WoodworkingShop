// @vitest-environment node
/**
 * Engine benchmark suite — measures hot-path performance for every public
 * engine function and sets a regression gate via config/bench-budget.json.
 *
 * Run:  npm run bench
 * Check: npm run bench:check
 */
import { describe, test, type BenchRunOptions } from 'vitest';
import { cfg } from '../helpers';
import { computeDimensions } from '../../src/engine/dimensions';
import { generateParts, computeEdgeBandingTotal } from '../../src/engine/parts';
import { optimizeCutSheets } from '../../src/engine/cut-optimizer';
import { estimateCost } from '../../src/engine/cost-estimator';
import { findOptimizations } from '../../src/engine/smart-optimizer';
import { validateConfig } from '../../src/engine/validation';
import { generateHardware } from '../../src/engine/hardware';

// ─── Deterministic configs used across all benchmarks ───────────────────────
// Keep wardrobe within standard sheet dimensions (2440×1220 mm) so the
// back panel (width-2t × height-t) always fits and stderr stays clean.
const base = cfg();

const wardrobe = cfg({
  furnitureType: 'wardrobe',
  width: 1200,
  height: 2100,
  depth: 600,
  shelfCount: 4,
  drawerCount: 2,
  doorCount: 2,
});

const desk = cfg({
  furnitureType: 'desk',
  width: 1500,
  height: 750,
  depth: 700,
  drawerCount: 2,
});

/** Bench time cap in ms — keeps each benchmark under this wall-clock budget. */
const FAST = { time: 200, warmupIterations: 3 };
const SLOW = { time: 200, warmupIterations: 2 };
/** Minimum-iteration cap for very slow functions (< 5 ops/s). */
const CRAWL = { iterations: 10, warmupIterations: 2 };

function registerBenchmark(name: string, fn: () => void, options: BenchRunOptions): void {
  test(name, async ({ bench }) => {
    await bench(name, fn).run(options);
  });
}

// ─── Pre-built artefacts reused inside bench loops ──────────────────────────
// (computed once here so each bench iteration isolates the function under test)

const baseParts = generateParts(base);
const wardrobeParts = generateParts(wardrobe);

const baseOpt = optimizeCutSheets(baseParts);
const wardrobeOpt = optimizeCutSheets(wardrobeParts);

const baseHardware = generateHardware(base);
const baseEdge = computeEdgeBandingTotal(baseParts);

// ─── Benchmarks ─────────────────────────────────────────────────────────────

describe('dimensions', () => {
  registerBenchmark(
    'computeDimensions — base cabinet',
    () => {
      computeDimensions(base);
    },
    FAST,
  );

  registerBenchmark(
    'computeDimensions — wardrobe',
    () => {
      computeDimensions(wardrobe);
    },
    FAST,
  );

  registerBenchmark(
    'computeDimensions — desk',
    () => {
      computeDimensions(desk);
    },
    FAST,
  );
});

describe('parts', () => {
  registerBenchmark(
    'generateParts — base cabinet',
    () => {
      generateParts(base);
    },
    FAST,
  );

  registerBenchmark(
    'generateParts — wardrobe 4-shelf 2-drawer',
    () => {
      generateParts(wardrobe);
    },
    FAST,
  );

  registerBenchmark(
    'generateParts — desk 2-drawer',
    () => {
      generateParts(desk);
    },
    FAST,
  );

  registerBenchmark(
    'computeEdgeBandingTotal — base cabinet',
    () => {
      computeEdgeBandingTotal(baseParts);
    },
    FAST,
  );
});

describe('cut optimizer', () => {
  registerBenchmark(
    `optimizeCutSheets — base cabinet (${baseParts.length} part types)`,
    () => {
      optimizeCutSheets(baseParts);
    },
    SLOW,
  );

  registerBenchmark(
    `optimizeCutSheets — wardrobe (${wardrobeParts.length} part types)`,
    () => {
      optimizeCutSheets(wardrobeParts);
    },
    SLOW,
  );
});

describe('hardware', () => {
  registerBenchmark(
    'generateHardware — base cabinet',
    () => {
      generateHardware(base);
    },
    FAST,
  );

  registerBenchmark(
    'generateHardware — wardrobe',
    () => {
      generateHardware(wardrobe);
    },
    FAST,
  );
});

describe('cost estimator', () => {
  registerBenchmark(
    'estimateCost — base cabinet',
    () => {
      estimateCost(baseOpt, baseHardware, baseEdge);
    },
    FAST,
  );

  registerBenchmark(
    'estimateCost — wardrobe',
    () => {
      estimateCost(wardrobeOpt, generateHardware(wardrobe), computeEdgeBandingTotal(wardrobeParts));
    },
    FAST,
  );
});

describe('smart optimizer', () => {
  registerBenchmark(
    'findOptimizations — base cabinet (default strategies)',
    () => {
      findOptimizations(base);
    },
    CRAWL,
  );
});

describe('validation', () => {
  registerBenchmark(
    'validateConfig — valid base cabinet',
    () => {
      validateConfig(base);
    },
    FAST,
  );

  registerBenchmark(
    'validateConfig — valid wardrobe',
    () => {
      validateConfig(wardrobe);
    },
    FAST,
  );
});
