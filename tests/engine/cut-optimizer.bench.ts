import { bench, describe } from 'vitest';
import { optimizeCutSheets } from '../../src/engine/cut-optimizer';
import { MULTI_SHEET_PARTS, GRAIN_FREE_PARTS, GRAIN_LOCKED_PARTS } from './fixtures';
import type { Part } from '../../src/engine/types';

// Large fixture: 100 cabinets
const LARGE_PROJECT_PARTS: Part[] = Array.from({ length: 100 }).flatMap((_, cabIndex) =>
  MULTI_SHEET_PARTS.map((p) => ({
    ...p,
    id: `C${cabIndex}-${p.id}`,
    // scale up quantities arbitrarily
    qty: p.qty * 2,
  })),
);

describe('Cut Optimizer Performance (Regression Benchmarks)', () => {
  bench('Grain locked parts (small)', () => {
    optimizeCutSheets(GRAIN_LOCKED_PARTS, 4, {});
  });

  bench('Grain free parts (small)', () => {
    optimizeCutSheets(GRAIN_FREE_PARTS, 4, {});
  });

  bench('Multi-sheet optimization (medium)', () => {
    optimizeCutSheets(MULTI_SHEET_PARTS, 4, {});
  });

  bench('Large multi-cabinet project (stress test)', () => {
    optimizeCutSheets(LARGE_PROJECT_PARTS, 4, {});
  });
});
