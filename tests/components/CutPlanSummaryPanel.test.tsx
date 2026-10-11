import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CutPlanSummaryPanel } from '../../src/components/optimizer/CutPlanSummaryPanel';
import { makeCutSheet, makeOptimizationResult } from '../helpers';
import { useCabinetStore } from '../../src/store/cabinet-store';

describe('CutPlanSummaryPanel', () => {
  it('groups sheets by material and reveals usage totals when expanded', async () => {
    const user = userEvent.setup();
    useCabinetStore.setState({
      optimization: makeOptimizationResult({
        sheets: [makeCutSheet(), makeCutSheet({ sheetIndex: 1 })],
      }),
    });
    render(<CutPlanSummaryPanel />);

    const toggle = screen.getByRole('button', { name: 'Cut Plan Summary' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const table = screen.getByRole('table');
    expect(table).toHaveTextContent('melamine-18');
    expect(table).toHaveTextContent('2');
    expect(screen.getByText('Total sheets')).toBeInTheDocument();
    expect(screen.getAllByText('0.360')).toHaveLength(2);
  });
});
