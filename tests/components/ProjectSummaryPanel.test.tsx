/**
 * Sprint 53 — ProjectSummaryPanel tests.
 *
 * Verifies:
 *  - Panel is hidden when only one cabinet exists.
 *  - Panel renders with correct stats when two cabinets exist.
 *  - Cabinet names appear in the subtitle.
 *  - Grain-conflict count is shown (with amber styling handled by role).
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProjectSummaryPanel } from '../../src/components/optimizer/ProjectSummaryPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import type { OptimizationResult } from '../../src/engine/types';

const emptyOpt: OptimizationResult = {
  sheets: [],
  totalSheets: 3,
  overallYield: 82.5,
  totalWaste: 500_000,
  grainConflictCount: 0,
};

function seedSingle() {
  useCabinetStore.setState({
    cabinets: [{ name: 'Cabinet 1', config: DEFAULT_CONFIG }],
    activeCabinetIndex: 0,
    allParts: [],
    combinedOptimization: emptyOpt,
  });
}

function seedMulti() {
  useCabinetStore.setState({
    cabinets: [
      { name: 'Kitchen Base', config: DEFAULT_CONFIG },
      { name: 'Wall Cabinet', config: { ...DEFAULT_CONFIG, height: 600 } },
    ],
    activeCabinetIndex: 0,
    allParts: new Array(12).fill(null).map((_, i) => ({
      id: `P${i}`,
      name: { en: `Part ${i}`, he: `חלק ${i}` },
      qty: 1,
      material: 'plywood-18',
      thickness: 18,
      length: 400,
      width: 300,
      edgeBanding: { en: '', he: '' },
    })),
    combinedOptimization: { ...emptyOpt, totalSheets: 5, overallYield: 78.3, grainConflictCount: 7 },
  });
}

describe('ProjectSummaryPanel (Sprint 53)', () => {
  it('returns null for single-cabinet project', () => {
    seedSingle();
    const { container } = render(<ProjectSummaryPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders summary section for multi-cabinet project', () => {
    seedMulti();
    render(<ProjectSummaryPanel />);
    expect(screen.getByRole('region', { name: /multi-cabinet project summary/i })).toBeInTheDocument();
  });

  it('shows cabinet names in the subtitle', () => {
    seedMulti();
    render(<ProjectSummaryPanel />);
    expect(screen.getByText(/Kitchen Base/)).toBeInTheDocument();
    expect(screen.getByText(/Wall Cabinet/)).toBeInTheDocument();
  });

  it('displays total parts count', () => {
    seedMulti();
    render(<ProjectSummaryPanel />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('displays total sheets count', () => {
    seedMulti();
    render(<ProjectSummaryPanel />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays overall yield', () => {
    seedMulti();
    render(<ProjectSummaryPanel />);
    expect(screen.getByText('78.3 %')).toBeInTheDocument();
  });

  it('shows grain conflicts count', () => {
    seedMulti();
    render(<ProjectSummaryPanel />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});

// ── Sprint 79 — avg sheet yield stat ─────────────────────────────────────────
describe('ProjectSummaryPanel — avg sheet yield (Sprint 79)', () => {
  it('shows avg sheet yield label', () => {
    useCabinetStore.setState({
      cabinets: [
        { name: 'A', config: DEFAULT_CONFIG },
        { name: 'B', config: DEFAULT_CONFIG },
      ],
      activeCabinetIndex: 0,
      allParts: [],
      combinedOptimization: {
        sheets: [
          {
            sheetIndex: 0,
            material: 'plywood-17',
            thickness: 17,
            sheetLength: 2440,
            sheetWidth: 1220,
            parts: [],
            yieldPercent: 80,
          },
          {
            sheetIndex: 1,
            material: 'plywood-17',
            thickness: 17,
            sheetLength: 2440,
            sheetWidth: 1220,
            parts: [],
            yieldPercent: 60,
          },
        ],
        totalSheets: 2,
        overallYield: 70,
        totalWaste: 0,
        grainConflictCount: 0,
      } as OptimizationResult,
    });
    render(<ProjectSummaryPanel />);
    expect(screen.getByText(/avg sheet yield/i)).toBeInTheDocument();
  });

  it('displays computed avg yield value', () => {
    useCabinetStore.setState({
      cabinets: [
        { name: 'A', config: DEFAULT_CONFIG },
        { name: 'B', config: DEFAULT_CONFIG },
      ],
      activeCabinetIndex: 0,
      allParts: [],
      combinedOptimization: {
        sheets: [
          {
            sheetIndex: 0,
            material: 'plywood-17',
            thickness: 17,
            sheetLength: 2440,
            sheetWidth: 1220,
            parts: [],
            yieldPercent: 80,
          },
          {
            sheetIndex: 1,
            material: 'plywood-17',
            thickness: 17,
            sheetLength: 2440,
            sheetWidth: 1220,
            parts: [],
            yieldPercent: 60,
          },
        ],
        totalSheets: 2,
        overallYield: 70,
        totalWaste: 0,
        grainConflictCount: 0,
      } as OptimizationResult,
    });
    render(<ProjectSummaryPanel />);
    // avg of 80 + 60 = 70 → "70 %"
    expect(screen.getByText('70 %')).toBeInTheDocument();
  });

  it('shows 0 % avg yield when no sheets', () => {
    useCabinetStore.setState({
      cabinets: [
        { name: 'A', config: DEFAULT_CONFIG },
        { name: 'B', config: DEFAULT_CONFIG },
      ],
      activeCabinetIndex: 0,
      allParts: [],
      combinedOptimization: {
        sheets: [],
        totalSheets: 0,
        overallYield: 0,
        totalWaste: 0,
        grainConflictCount: 0,
      } as OptimizationResult,
    });
    render(<ProjectSummaryPanel />);
    expect(screen.getByText('0 %')).toBeInTheDocument();
  });
});
