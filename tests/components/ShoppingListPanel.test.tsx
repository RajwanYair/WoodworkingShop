import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ShoppingListPanel } from '../../src/components/optimizer/optimizer-shopping-list-panel';
import { makeCutSheet } from '../helpers';

const labels: Record<string, string> = {
  'optimizer.shoppingList': 'Shopping List',
  'optimizer.sheets': 'Sheets',
  'optimizer.shoppingListDesc': 'Sheets required grouped by material — use for supplier orders',
  'cost.total': 'Estimated Total',
};

const translate = (key: string) => labels[key] ?? key;

describe('ShoppingListPanel', () => {
  it('groups same-material sheets and supports collapsing the list', async () => {
    const user = userEvent.setup();
    render(
      <ShoppingListPanel
        sheets={[makeCutSheet(), makeCutSheet({ sheetIndex: 1 })]}
        materialPriceOverrides={{ 'melamine-18': 200 }}
        t={translate}
        lang="en"
      />,
    );

    const toggle = screen.getByRole('button', { name: /Shopping List/ });
    expect(toggle).toHaveTextContent('2 sheets · ₪400');
    expect(screen.getByText(/Melamine 18 mm/)).toBeInTheDocument();
    expect(screen.getByText(/×\s*2/)).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.queryByText('Sheets required grouped by material — use for supplier orders')).not.toBeInTheDocument();
    await user.click(toggle);
    expect(screen.getByText('Sheets required grouped by material — use for supplier orders')).toBeInTheDocument();
  });
});
