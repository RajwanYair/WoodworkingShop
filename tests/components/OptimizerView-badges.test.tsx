/**
 * Sprint 77 — OptimizerView part-count badge per sheet.
 *
 * Mocks the two ?worker imports and sets the Zustand store with a
 * pre-built OptimizationResult containing a sheet with known parts.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import i18n from '../../src/i18n';

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

function setOptimizerResults(
  optimization: OptimizationResult,
  combinedOptimization: OptimizationResult = optimization,
  cabinetCount = 1,
) {
  useCabinetStore.setState({
    optimization,
    combinedOptimization,
    optimizationPending: false,
    cabinets: Array.from({ length: cabinetCount }, (_, index) => ({
      name: `C${index + 1}`,
      config: useCabinetStore.getState().config,
    })),
    activeCabinetIndex: 0,
    colorBlindMode: false,
    sawKerf: 3,
    materialPriceOverrides: {},
    projectName: 'Test',
    sheetSizeOverrides: {},
  });
}

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

  it('shows low-yield and same-thickness material recommendations', () => {
    const recommendationOpt: OptimizationResult = {
      ...MOCK_OPTIMIZATION,
      sheets: [
        { ...MOCK_OPTIMIZATION.sheets[0], yieldPercent: 15 },
        {
          ...MOCK_OPTIMIZATION.sheets[0],
          sheetIndex: 1,
          material: 'plywood-18',
          parts: [MOCK_PART],
          yieldPercent: 30,
        },
      ],
      totalSheets: 2,
    };
    useCabinetStore.setState({ optimization: recommendationOpt, combinedOptimization: recommendationOpt });

    render(<OptimizerView />);

    expect(screen.getByText(/Sheet #1 is only 15% used/)).toBeInTheDocument();
    expect(
      screen.getByText(/Materials Melamine 18 mm and Birch Plywood 18 mm share thickness 18 mm/),
    ).toBeInTheDocument();
  });
});

describe('OptimizerView parent behavior', () => {
  beforeEach(() => {
    setOptimizerResults(MOCK_OPTIMIZATION);
  });

  it.each([
    {
      pending: true,
      result: MOCK_OPTIMIZATION,
      expected: 'Computing cut sheets…',
    },
    {
      pending: false,
      result: MOCK_OPTIMIZATION,
      expected: 'Optimization complete — 1 sheet(s) required',
    },
    {
      pending: false,
      result: { ...MOCK_OPTIMIZATION, sheets: [] },
      expected: '',
    },
    {
      pending: false,
      result: {
        ...MOCK_OPTIMIZATION,
        sheets: [MOCK_OPTIMIZATION.sheets[0], { ...MOCK_OPTIMIZATION.sheets[0], sheetIndex: 1 }],
      },
      expected: 'Optimization complete — 2 sheet(s) required',
    },
  ])('announces "$expected" for the current optimizer state', ({ pending, result, expected }) => {
    useCabinetStore.setState({ optimizationPending: pending, optimization: result, combinedOptimization: result });

    render(<OptimizerView />);

    expect(screen.getByRole('status')).toHaveTextContent(expected);
  });

  it.each([
    { cabinetCount: 1, selectedPart: 'LOCAL', hiddenPart: 'COMBINED' },
    { cabinetCount: 2, selectedPart: 'COMBINED', hiddenPart: 'LOCAL' },
    { cabinetCount: 3, selectedPart: 'COMBINED', hiddenPart: 'LOCAL' },
  ])('uses the $cabinetCount-cabinet result when rendering sheets', ({ cabinetCount, selectedPart, hiddenPart }) => {
    const localResult: OptimizationResult = {
      ...MOCK_OPTIMIZATION,
      sheets: [{ ...MOCK_OPTIMIZATION.sheets[0], parts: [{ ...MOCK_PART, partId: 'LOCAL' }] }],
    };
    const combinedResult: OptimizationResult = {
      ...MOCK_OPTIMIZATION,
      sheets: [{ ...MOCK_OPTIMIZATION.sheets[0], parts: [{ ...MOCK_PART, partId: 'COMBINED' }] }],
    };
    setOptimizerResults(localResult, combinedResult, cabinetCount);

    render(<OptimizerView />);

    expect(screen.getByText(selectedPart, { selector: 'text' })).toBeInTheDocument();
    expect(screen.queryByText(hiddenPart, { selector: 'text' })).not.toBeInTheDocument();
  });

  it.each([
    {
      name: 'ignores a sheet at the 25% threshold',
      yields: [25],
      expected: null,
    },
    {
      name: 'ignores a zero-yield sheet',
      yields: [0],
      expected: null,
    },
    {
      name: 'reports the first positive low-yield sheet',
      yields: [0, 15, 5],
      expected: /Sheet #2 is only 15% used/,
    },
    {
      name: 'reports the displayed one-based sheet number',
      yields: [10],
      sheetIndex: 4,
      expected: /Sheet #5 is only 10% used/,
    },
  ])('$name', ({ yields, sheetIndex = 0, expected }) => {
    const sheets = yields.map((yieldPercent, index) => ({
      ...MOCK_OPTIMIZATION.sheets[0],
      sheetIndex: index === 0 ? sheetIndex : index,
      yieldPercent,
    }));
    const result = { ...MOCK_OPTIMIZATION, sheets };
    setOptimizerResults(result);

    render(<OptimizerView />);

    if (expected) {
      expect(screen.getByText(expected)).toBeInTheDocument();
    } else {
      expect(screen.queryByText(/Sheet #\d+ is only/)).not.toBeInTheDocument();
    }
  });

  it.each([
    {
      name: 'recommends materials with matching thickness',
      sheets: [
        { material: 'melamine-18', thickness: 18 },
        { material: 'plywood-18', thickness: 18 },
      ],
      expected: /Materials Melamine 18 mm and Birch Plywood 18 mm share thickness 18 mm/,
    },
    {
      name: 'does not recommend materials with different thicknesses',
      sheets: [
        { material: 'melamine-18', thickness: 18 },
        { material: 'plywood-17', thickness: 17 },
      ],
      expected: null,
    },
    {
      name: 'does not recommend duplicate material keys',
      sheets: [
        { material: 'melamine-18', thickness: 18 },
        { material: 'melamine-18', thickness: 18 },
      ],
      expected: null,
    },
    {
      name: 'uses the first two distinct materials at a shared thickness',
      sheets: [
        { material: 'plywood-18', thickness: 18 },
        { material: 'melamine-18', thickness: 18 },
        { material: 'plywood-18', thickness: 18 },
      ],
      expected: /Materials Birch Plywood 18 mm and Melamine 18 mm share thickness 18 mm/,
    },
    {
      name: 'does not recommend consolidation for a single sheet',
      sheets: [{ material: 'melamine-18', thickness: 18 }],
      expected: null,
    },
    {
      name: 'finds a matching pair after an unrelated thickness group',
      sheets: [
        { material: 'plywood-17', thickness: 17 },
        { material: 'melamine-18', thickness: 18 },
        { material: 'plywood-18', thickness: 18 },
      ],
      expected: /Materials Melamine 18 mm and Birch Plywood 18 mm share thickness 18 mm/,
    },
    {
      name: 'uses the first shared thickness encountered',
      sheets: [
        { material: 'plywood-17', thickness: 17 },
        { material: 'melamine-18', thickness: 17 },
        { material: 'plywood-18', thickness: 18 },
        { material: 'melamine-18', thickness: 18 },
      ],
      expected: /Materials Sandwich Plywood 17 mm and Melamine 18 mm share thickness 17 mm/,
    },
    {
      name: 'does not combine materials from separate thickness groups',
      sheets: [
        { material: 'melamine-18', thickness: 18 },
        { material: 'plywood-17', thickness: 17 },
      ],
      expected: null,
    },
    {
      name: 'does not show a hint when all sheets have the same material',
      sheets: [
        { material: 'plywood-18', thickness: 18 },
        { material: 'plywood-18', thickness: 18 },
        { material: 'plywood-18', thickness: 18 },
      ],
      expected: null,
    },
  ])('$name', ({ sheets: sheetInputs, expected }) => {
    const sheets = sheetInputs.map(({ material, thickness }, sheetIndex) => ({
      ...MOCK_OPTIMIZATION.sheets[0],
      material,
      thickness,
      sheetIndex,
      yieldPercent: 50,
    }));
    const result = { ...MOCK_OPTIMIZATION, sheets };
    setOptimizerResults(result);

    render(<OptimizerView />);

    if (expected) {
      expect(screen.getByText(expected)).toBeInTheDocument();
    } else {
      expect(screen.queryByText(/share thickness/)).not.toBeInTheDocument();
    }
  });

  it.each([
    { name: 'starts with part labels hidden', partLabels: [], show: false, clicks: 0 },
    {
      name: 'shows the selected part label after activation',
      partLabels: ['Side Panel'],
      show: true,
      clicks: 1,
      singlePart: true,
    },
    { name: 'shows every eligible part label', partLabels: ['Side Panel', 'Top Rail'], show: true, clicks: 1 },
    { name: 'hides labels after toggling off again', partLabels: [], show: false, clicks: 2 },
    {
      name: 'keeps labels hidden for parts too small to label',
      partLabels: [],
      show: true,
      clicks: 1,
      smallPart: true,
    },
  ])('$name', async ({ partLabels, show, clicks, smallPart = false, singlePart = false }) => {
    const user = userEvent.setup();
    const firstPart = {
      ...MOCK_PART,
      partId: 'P01',
      label: 'Side Panel',
      width: smallPart ? 10 : MOCK_PART.width,
      length: smallPart ? 10 : MOCK_PART.length,
    };
    const parts =
      smallPart || singlePart ? [firstPart] : [firstPart, { ...MOCK_PART, partId: 'P02', label: 'Top Rail', x: 600 }];
    const result = {
      ...MOCK_OPTIMIZATION,
      sheets: [{ ...MOCK_OPTIMIZATION.sheets[0], parts }],
    };
    setOptimizerResults(result);
    render(<OptimizerView />);

    const labelsToggle = screen.getByRole('button', { name: new RegExp(i18n.t('optimizer.labels')) });
    for (let index = 0; index < clicks; index += 1) await user.click(labelsToggle);

    expect(labelsToggle).toHaveAttribute('aria-pressed', String(show));
    for (const partLabel of partLabels) {
      expect(screen.getByText(partLabel, { selector: 'text' })).toBeInTheDocument();
    }
    expect(screen.queryAllByText(/Side Panel|Top Rail/, { selector: 'text' })).toHaveLength(partLabels.length);
  });
});
