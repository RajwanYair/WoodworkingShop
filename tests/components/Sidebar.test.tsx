import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { Sidebar } from '../../src/components/layout/Sidebar';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { generateHardware } from '../../src/engine/hardware';
import { generateParts } from '../../src/engine/parts';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { makeOptimizationResult } from '../helpers';

beforeEach(() => {
  useCabinetStore.setState({
    parts: generateParts(DEFAULT_CONFIG).slice(0, 2),
    hardware: generateHardware(DEFAULT_CONFIG).slice(0, 1),
    optimization: makeOptimizationResult({ totalSheets: 4, overallYield: 82 }),
  });
});

describe('Sidebar', () => {
  it('opens the mobile summary dialog and closes it with Escape', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    await user.click(screen.getByRole('button', { name: 'Toggle summary panel' }));
    const dialog = screen.getByRole('dialog', { name: 'Cabinet summary' });
    expect(
      await within(dialog).findByRole('heading', { name: 'Cost Estimate' }, { timeout: 5000 }),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Cabinet summary' })).not.toBeInTheDocument();
  });

  it('shows current parts, hardware, sheet, and yield totals in the mobile summary', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    await user.click(screen.getByRole('button', { name: 'Toggle summary panel' }));
    const dialog = screen.getByRole('dialog', { name: 'Cabinet summary' });
    await within(dialog).findByRole('heading', { name: 'Cost Estimate' }, { timeout: 5000 });

    expect(dialog).toHaveTextContent('Parts2');
    expect(dialog).toHaveTextContent('Hardware items1');
    expect(dialog).toHaveTextContent('Sheets needed4');
    expect(dialog).toHaveTextContent('Yield82%');
  });
});
