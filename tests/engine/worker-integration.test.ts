/**
 * Worker integration tests — v3.41.0
 *
 * In the vitest (jsdom) environment, `Worker` is not available, so the store's
 * `scheduleOptimization` automatically falls back to the synchronous path.
 * These tests exercise that fallback via the public store API, verifying that
 * cut-optimization results are always available (never `undefined`) even without
 * a real Web Worker.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

// ── Helpers ────────────────────────────────────────────────────────────────

function resetStore() {
  useCabinetStore.setState({
    cabinets: [{ name: 'Cabinet 1', config: { ...DEFAULT_CONFIG } }],
    activeCabinetIndex: 0,
    _past: [],
    _future: [],
    canUndo: false,
    canRedo: false,
  });
  useCabinetStore.getState().setConfig({});
  useCabinetStore.setState({ _past: [], canUndo: false });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('cut-optimizer sync fallback (Worker unavailable)', () => {
  beforeEach(resetStore);

  it('produces a non-empty optimization result synchronously on init', () => {
    const { optimization } = useCabinetStore.getState();
    expect(optimization).toBeDefined();
    expect(optimization.totalSheets).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(optimization.sheets)).toBe(true);
  });

  it('updates optimization after config change (sync path)', () => {
    // Start with a small cabinet
    useCabinetStore.getState().setConfig({ width: 500, height: 700, depth: 300, shelfCount: 0 });
    const small = useCabinetStore.getState().optimization;

    // Switch to a much larger cabinet (more parts)
    useCabinetStore.getState().setConfig({ width: 1200, height: 2400, depth: 600, shelfCount: 4 });
    const large = useCabinetStore.getState().optimization;

    // A larger cabinet should require at least as many sheets
    expect(large.totalSheets).toBeGreaterThanOrEqual(small.totalSheets);
  });

  it('combinedOptimization matches optimization for a single-cabinet project', () => {
    const { optimization, combinedOptimization } = useCabinetStore.getState();
    // For a single cabinet, combined and active should have identical totals
    expect(combinedOptimization.totalSheets).toBe(optimization.totalSheets);
    expect(combinedOptimization.overallYield).toBe(optimization.overallYield);
  });

  it('combinedOptimization grows when a second cabinet is added', () => {
    const before = useCabinetStore.getState().optimization.totalSheets;

    useCabinetStore.getState().addCabinet();
    // Switch back to first cab to trigger full recompute with both in project
    useCabinetStore.getState().setActiveCabinet(0);
    useCabinetStore.getState().setConfig({});

    const { combinedOptimization } = useCabinetStore.getState();
    // Two identical cabinets — combined should be >= single-cabinet sheets
    expect(combinedOptimization.totalSheets).toBeGreaterThanOrEqual(before);
  });

  it('optimization result is non-null even while a worker request may be in-flight', () => {
    useCabinetStore.getState().setConfig({ width: 900 });
    // Whether the sync fallback or the worker path is active, the optimization
    // object must always be defined and structurally valid.
    const { optimization } = useCabinetStore.getState();
    expect(optimization).toBeDefined();
    expect(typeof optimization.totalSheets).toBe('number');
    expect(Array.isArray(optimization.sheets)).toBe(true);
  });

  it('sheet kerf changes propagate to optimization result', () => {
    useCabinetStore.getState().setConfig({ shelfCount: 2 });
    useCabinetStore.getState().setSawKerf(0); // no kerf loss
    const noKerf = useCabinetStore.getState().optimization;

    useCabinetStore.getState().setSawKerf(10); // big kerf
    const bigKerf = useCabinetStore.getState().optimization;

    // Bigger kerf = more waste = same or more sheets
    expect(bigKerf.totalSheets).toBeGreaterThanOrEqual(noKerf.totalSheets);
  });

  it('all sheets in the result have valid placements', () => {
    useCabinetStore.getState().setConfig({ shelfCount: 3, width: 800 });
    const { optimization } = useCabinetStore.getState();

    for (const sheet of optimization.sheets) {
      expect(sheet.parts.length).toBeGreaterThan(0);
      expect(sheet.yieldPercent).toBeGreaterThanOrEqual(0);
      expect(sheet.yieldPercent).toBeLessThanOrEqual(100);
      // All placements should be within sheet bounds
      // Axes: y is along sheetLength (grain/long direction), x is across (sheetWidth)
      for (const p of sheet.parts) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x + p.width).toBeLessThanOrEqual(sheet.sheetWidth + 1); // +1 mm rounding
        expect(p.y + p.length).toBeLessThanOrEqual(sheet.sheetLength + 1);
      }
    }
  });
});

describe('createJsonMemo integration — engine memoisation', () => {
  it('memo-wrapped computeDimensions returns same reference on identical config', async () => {
    const { createJsonMemo } = await import('../../src/engine/memo');
    const { computeDimensions } = await import('../../src/engine/dimensions');
    const memoCompute = createJsonMemo(computeDimensions);

    const cfg = { ...DEFAULT_CONFIG };
    const r1 = memoCompute(cfg);
    const r2 = memoCompute(cfg);
    // Memoised — should be the exact same object reference
    expect(r1).toBe(r2);
  });

  it('cache miss produces a new result when config changes', async () => {
    const { createJsonMemo } = await import('../../src/engine/memo');
    const { computeDimensions } = await import('../../src/engine/dimensions');
    const memoCompute = createJsonMemo(computeDimensions);

    const r1 = memoCompute({ ...DEFAULT_CONFIG, width: 600 });
    const r2 = memoCompute({ ...DEFAULT_CONFIG, width: 900 });
    expect(r1).not.toBe(r2);
    expect(r2.internalWidth).toBeGreaterThan(r1.internalWidth);
  });
});
