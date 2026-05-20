/**
 * Sprint 65 — PartsTable material filter dropdown tests.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PartsTable } from '../../src/components/optimizer/Tables';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { generateParts } from '../../src/engine/parts';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

// Seed store with parts from default config (has plywood-17 and plywood-4)
function seedParts() {
  const parts = generateParts(DEFAULT_CONFIG);
  useCabinetStore.setState({ parts });
}

describe('PartsTable material filter — Sprint 65', () => {
  beforeEach(() => {
    seedParts();
  });

  it('renders the PartsTable without throwing', () => {
    render(<PartsTable />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('shows a filter select when there are multiple materials', () => {
    render(<PartsTable />);
    const select = screen.queryByRole('combobox');
    // Default config has plywood-17 + plywood-4 → 2 materials → select is shown
    expect(select).toBeInTheDocument();
  });

  it('filtering by a specific material reduces the displayed rows', () => {
    render(<PartsTable />);
    const select = screen.queryByRole('combobox');
    if (!select) return; // only 1 material in this config

    const parts = useCabinetStore.getState().parts;
    const uniqueMats = [...new Set(parts.map((p) => p.material))];
    if (uniqueMats.length < 2) return;

    const rowsBefore = screen.getAllByRole('row').length; // includes header

    // Select the first non-empty material option
    fireEvent.change(select, { target: { value: uniqueMats[0] } });

    const rowsAfter = screen.getAllByRole('row').length;
    expect(rowsAfter).toBeLessThan(rowsBefore);
  });

  it('selecting "All materials" restores all rows', () => {
    render(<PartsTable />);
    const select = screen.queryByRole('combobox');
    if (!select) return;

    const parts = useCabinetStore.getState().parts;
    const uniqueMats = [...new Set(parts.map((p) => p.material))];
    if (uniqueMats.length < 2) return;

    const allRows = screen.getAllByRole('row').length;

    // Filter to first material
    fireEvent.change(select, { target: { value: uniqueMats[0] } });
    // Reset to all
    fireEvent.change(select, { target: { value: '' } });

    expect(screen.getAllByRole('row').length).toBe(allRows);
  });

  it('filter select has an accessible aria-label', () => {
    render(<PartsTable />);
    const select = screen.queryByRole('combobox');
    if (select) {
      expect(select).toHaveAttribute('aria-label');
    }
  });
});
