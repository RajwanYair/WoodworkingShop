/**
 * Phase 12 / Sprint 11 — Grain direction hatch toggle tests.
 *
 * Verifies that:
 *  - The "Grain hatch" toggle button renders in OptimizerView.
 *  - The button starts un-pressed (aria-pressed=false).
 *  - Clicking it sets aria-pressed=true and renders grain hatch overlay
 *    rects on parts belonging to a grain-sensitive material.
 *  - Clicking again toggles back to un-pressed.
 *  - Parts on non-grain materials (melamine) do NOT get hatch overlays.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/workers/bom-export.worker?worker', () => ({
  default: class MockWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    postMessage() {}
    terminate() {}
  },
}));
vi.mock('../../src/workers/dxf-export.worker?worker', () => ({
  default: class MockWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    postMessage() {}
    terminate() {}
  },
}));

vi.mock('zustand/middleware', async () => {
  const actual = await vi.importActual<typeof import('zustand/middleware')>('zustand/middleware');
  return { ...actual, persist: (fn: (...args: unknown[]) => unknown) => fn };
});

import { OptimizerView } from '../../src/components/optimizer/OptimizerView';
import { useCabinetStore } from '../../src/store/cabinet-store';
import type { OptimizationResult } from '../../src/engine/types';

const GRAIN_PART = {
  partId: 'G01',
  label: 'Side Panel',
  length: 720,
  width: 580,
  x: 0,
  y: 0,
  grainVertical: true,
};

const GRAIN_CONFLICT_PART = {
  partId: 'G02',
  label: 'Top Panel',
  length: 400,
  width: 300,
  x: 600,
  y: 0,
  grainVertical: false,
  grainConflict: true,
};

/** plywood-17 has hasGrain: true */
const MOCK_OPTIMIZATION: OptimizationResult = {
  sheets: [
    {
      sheetIndex: 0,
      material: 'plywood-17',
      thickness: 17,
      sheetLength: 2440,
      sheetWidth: 1220,
      parts: [GRAIN_PART, GRAIN_CONFLICT_PART],
      yieldPercent: 55,
    },
  ],
  totalSheets: 1,
  overallYield: 55,
  totalWaste: 600000,
  grainConflictCount: 1,
};

/** melamine-18 has hasGrain: false */
const NO_GRAIN_OPTIMIZATION: OptimizationResult = {
  sheets: [
    {
      sheetIndex: 0,
      material: 'melamine-18',
      thickness: 18,
      sheetLength: 2440,
      sheetWidth: 1220,
      parts: [{ ...GRAIN_PART, partId: 'M01', grainVertical: false }],
      yieldPercent: 72,
    },
  ],
  totalSheets: 1,
  overallYield: 72,
  totalWaste: 300000,
  grainConflictCount: 0,
};

function setOpt(opt: OptimizationResult) {
  useCabinetStore.setState({
    optimization: opt,
    combinedOptimization: opt,
    optimizationPending: false,
    cabinets: [{ name: 'C1', config: useCabinetStore.getState().config }],
    activeCabinetIndex: 0,
    colorBlindMode: false,
    sawKerf: 3,
    materialPriceOverrides: {},
    projectName: 'Test',
    sheetSizeOverrides: {},
  });
}

describe('OptimizerView grain direction hatching — Phase 12 / Sprint 11', () => {
  beforeEach(() => setOpt(MOCK_OPTIMIZATION));

  it('renders the Grain hatch toggle button', () => {
    render(<OptimizerView />);
    const btn = screen.getByTitle('Grain hatch');
    expect(btn).toBeInTheDocument();
  });

  it('toggle button starts un-pressed', () => {
    render(<OptimizerView />);
    const btn = screen.getByTitle('Grain hatch');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking toggle sets aria-pressed=true', () => {
    render(<OptimizerView />);
    const btn = screen.getByTitle('Grain hatch');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking toggle twice returns to un-pressed', () => {
    render(<OptimizerView />);
    const btn = screen.getByTitle('Grain hatch');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('grain hatch overlay rects appear after toggle on grain-sensitive material', () => {
    render(<OptimizerView />);
    // Before toggle: no grain hatch overlay rects
    expect(document.querySelectorAll('rect[fill^="url(#grain-"]').length).toBe(0);
    // Toggle on
    fireEvent.click(screen.getByTitle('Grain hatch'));
    // One overlay rect per part (2 parts on sheet 0)
    const overlays = document.querySelectorAll('rect[fill^="url(#grain-"]');
    expect(overlays.length).toBe(2);
  });

  it('aligned-grain part uses ok pattern', () => {
    render(<OptimizerView />);
    fireEvent.click(screen.getByTitle('Grain hatch'));
    const overlays = Array.from(document.querySelectorAll('rect[fill^="url(#grain-"]'));
    const okRects = overlays.filter((r) => r.getAttribute('fill')?.includes('-ok)'));
    expect(okRects.length).toBeGreaterThanOrEqual(1);
  });

  it('grain-conflict part uses conflict pattern', () => {
    render(<OptimizerView />);
    fireEvent.click(screen.getByTitle('Grain hatch'));
    const overlays = Array.from(document.querySelectorAll('rect[fill^="url(#grain-"]'));
    const conflictRects = overlays.filter((r) => r.getAttribute('fill')?.includes('-conflict)'));
    expect(conflictRects.length).toBe(1);
  });

  it('grain hatch patterns are present in SVG defs', () => {
    render(<OptimizerView />);
    // Patterns always in defs regardless of toggle state
    expect(document.querySelector('pattern[id^="grain-0-v-ok"]')).not.toBeNull();
    expect(document.querySelector('pattern[id^="grain-0-h-ok"]')).not.toBeNull();
    expect(document.querySelector('pattern[id^="grain-0-v-conflict"]')).not.toBeNull();
    expect(document.querySelector('pattern[id^="grain-0-h-conflict"]')).not.toBeNull();
  });

  it('no grain hatch overlays on non-grain material even when toggled', () => {
    setOpt(NO_GRAIN_OPTIMIZATION);
    render(<OptimizerView />);
    fireEvent.click(screen.getByTitle('Grain hatch'));
    // melamine has hasGrain=false so no overlays rendered
    expect(document.querySelectorAll('rect[fill^="url(#grain-"]').length).toBe(0);
  });
});
