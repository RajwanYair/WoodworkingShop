import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { StockTrackerPanel } from '../../src/components/optimizer/StockTrackerPanel';
import { useStockTrackerStore } from '../../src/store/stock-tracker-store';

describe('StockTrackerPanel', () => {
  beforeEach(() => {
    useStockTrackerStore.getState().clearAll();
  });

  it('adds a stock item through labeled fields', async () => {
    const user = userEvent.setup();
    render(<StockTrackerPanel />);

    await user.click(screen.getByRole('button', { name: /Stock Tracker/ }));
    await user.click(screen.getByText('+ Add stock item'));
    await user.type(screen.getByRole('textbox', { name: 'Material key' }), 'plywood-18');
    await user.type(screen.getByRole('spinbutton', { name: 'On Hand' }), '4');
    await user.type(screen.getByRole('spinbutton', { name: 'Reorder at' }), '1');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(useStockTrackerStore.getState().stockStore.items).toEqual([
      expect.objectContaining({ materialKey: 'plywood-18', onHandQty: 4, reorderLevel: 1 }),
    ]);
  });
});
