/**
 * Sprint 77 — OptimizerView part-count badge per sheet.
 *
 * Mocks the two ?worker imports and sets the Zustand store with a
 * pre-built OptimizationResult containing a sheet with known parts.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Vite ?worker imports before any other imports
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

const MOCK_PART = {
  partId: 'P01',
  label: 'Side Panel',
  length: 720,
  width: 580,
  x: 0,
  y: 0,
  grainVertical: false,
};

const MOCK_OPTIMIZATION: OptimizationResult = {
  sheets: [
    {
      sheetIndex: 0,
      material: 'melamine-18',
      thickness: 18,
      sheetLength: 2440,
      sheetWidth: 1220,
      parts: [MOCK_PART, { ...MOCK_PART, partId: 'P02', x: 600 }, { ...MOCK_PART, partId: 'P03', x: 1200 }],
      yieldPercent: 72,
    },
  ],
  totalSheets: 1,
  overallYield: 72,
  totalWaste: 500000,
  grainConflictCount: 0,
};

describe('OptimizerView part-count badge per sheet — Sprint 77', () => {
  beforeEach(() => {
    useCabinetStore.setState({
      optimization: MOCK_OPTIMIZATION,
      combinedOptimization: MOCK_OPTIMIZATION,
      optimizationPending: false,
      cabinets: [{ name: 'C1', config: useCabinetStore.getState().config }],
      activeCabinetIndex: 0,
      colorBlindMode: false,
      sawKerf: 3,
      materialPriceOverrides: {},
      projectName: 'Test',
      sheetSizeOverrides: {},
    });
  });

  it('shows the part count badge on the sheet header', () => {
    render(<OptimizerView />);
    // Badge has aria-label "3 parts"
    const badge = screen.getByLabelText('3 parts');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('3');
  });

  it('badge number matches the sheet parts array length', () => {
    render(<OptimizerView />);
    const badge = screen.getByLabelText('3 parts');
    expect(badge.textContent).toBe('3');
  });

  it('badge shows 0 when sheet has no parts', () => {
    const emptyOpt: OptimizationResult = {
      ...MOCK_OPTIMIZATION,
      sheets: [{ ...MOCK_OPTIMIZATION.sheets[0], parts: [] }],
    };
    useCabinetStore.setState({ optimization: emptyOpt, combinedOptimization: emptyOpt });
    render(<OptimizerView />);
    const badge = screen.getByLabelText('0 parts');
    expect(badge.textContent).toBe('0');
  });

  it('each sheet has its own badge for multiple sheets', () => {
    const twoSheetOpt: OptimizationResult = {
      ...MOCK_OPTIMIZATION,
      sheets: [
        { ...MOCK_OPTIMIZATION.sheets[0], sheetIndex: 0, parts: [MOCK_PART] },
        {
          ...MOCK_OPTIMIZATION.sheets[0],
          sheetIndex: 1,
          parts: [MOCK_PART, { ...MOCK_PART, partId: 'P02' }],
        },
      ],
      totalSheets: 2,
    };
    useCabinetStore.setState({ optimization: twoSheetOpt, combinedOptimization: twoSheetOpt });
    render(<OptimizerView />);
    expect(screen.getByLabelText('1 parts')).toBeInTheDocument();
    expect(screen.getByLabelText('2 parts')).toBeInTheDocument();
  });
});

// ── Sprint 81 — per-sheet waste area label ────────────────────────────────────
describe('OptimizerView per-sheet waste label — Sprint 81', () => {
  beforeEach(() => {
    useCabinetStore.setState({
      optimization: MOCK_OPTIMIZATION,
      combinedOptimization: MOCK_OPTIMIZATION,
      optimizationPending: false,
      cabinets: [{ name: 'C1', config: useCabinetStore.getState().config }],
      activeCabinetIndex: 0,
      colorBlindMode: false,
      sawKerf: 3,
      materialPriceOverrides: {},
      projectName: 'Test',
      sheetSizeOverrides: {},
    });
  });

  it('renders a "Waste:" label in the sheet header', () => {
    render(<OptimizerView />);
    // The waste label text should be present somewhere in the sheet header
    expect(screen.getAllByText(/waste/i).length).toBeGreaterThan(0);
  });

  it('waste value is a number followed by m²', () => {
    render(<OptimizerView />);
    // Expect something like "Waste: 1.234 m²" — use getAllByText since the
    // global waste stat also shows m²
    expect(screen.getAllByText(/\d+\.\d+ m²/).length).toBeGreaterThan(0);
  });

  it('waste value reflects sheet area minus placed parts area', () => {
    // Sheet: 1220 × 2440 = 2976800 mm²
    // Each MOCK_PART: 580 × 720 = 417600 mm², 3 parts = 1252800 mm²
    // waste = 2976800 - 1252800 = 1724000 mm² = 1.724000 m²
    render(<OptimizerView />);
    // span text is "· Waste: 1.724 m²"
    const wasteSpans = screen.getAllByText(/1\.724 m²/);
    expect(wasteSpans.length).toBeGreaterThan(0);
  });

  it('shows waste: 0.000 m² when sheet is fully packed', () => {
    const fullPart = { ...MOCK_PART, width: 1220, length: 2440, x: 0, y: 0 };
    const fullOpt: OptimizationResult = {
      ...MOCK_OPTIMIZATION,
      sheets: [{ ...MOCK_OPTIMIZATION.sheets[0], parts: [fullPart] }],
    };
    useCabinetStore.setState({ optimization: fullOpt, combinedOptimization: fullOpt });
    render(<OptimizerView />);
    expect(screen.getByText(/0\.000 m²/)).toBeInTheDocument();
  });
});
