/**
 * Engine benchmark suite — measures hot-path performance for every public
 * engine function and sets a regression gate via config/bench-budget.json.
 *
 * Run:  npm run bench
 * Check: npm run bench:check
 */
import { bench, describe } from 'vitest';
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
  bench('computeDimensions — base cabinet', () => {
    computeDimensions(base);
  }, FAST);

  bench('computeDimensions — wardrobe', () => {
    computeDimensions(wardrobe);
  }, FAST);

  bench('computeDimensions — desk', () => {
    computeDimensions(desk);
  }, FAST);
});

describe('parts', () => {
  bench('generateParts — base cabinet', () => {
    generateParts(base);
  }, FAST);

  bench('generateParts — wardrobe 4-shelf 2-drawer', () => {
    generateParts(wardrobe);
  }, FAST);

  bench('generateParts — desk 2-drawer', () => {
    generateParts(desk);
  }, FAST);

  bench('computeEdgeBandingTotal — base cabinet', () => {
    computeEdgeBandingTotal(baseParts);
  }, FAST);
});

describe('cut optimizer', () => {
  bench(`optimizeCutSheets — base cabinet (${baseParts.length} part types)`, () => {
    optimizeCutSheets(baseParts);
  }, SLOW);

  bench(`optimizeCutSheets — wardrobe (${wardrobeParts.length} part types)`, () => {
    optimizeCutSheets(wardrobeParts);
  }, SLOW);
});

describe('hardware', () => {
  bench('generateHardware — base cabinet', () => {
    generateHardware(base);
  }, FAST);

  bench('generateHardware — wardrobe', () => {
    generateHardware(wardrobe);
  }, FAST);
});

describe('cost estimator', () => {
  bench('estimateCost — base cabinet', () => {
    estimateCost(baseOpt, baseHardware, baseEdge);
  }, FAST);

  bench('estimateCost — wardrobe', () => {
    estimateCost(wardrobeOpt, generateHardware(wardrobe), computeEdgeBandingTotal(wardrobeParts));
  }, FAST);
});

describe('smart optimizer', () => {
  bench('findOptimizations — base cabinet (default strategies)', () => {
    findOptimizations(base);
  }, CRAWL);
});

describe('validation', () => {
  bench('validateConfig — valid base cabinet', () => {
    validateConfig(base);
  }, FAST);

  bench('validateConfig — valid wardrobe', () => {
    validateConfig(wardrobe);
  }, FAST);
});
