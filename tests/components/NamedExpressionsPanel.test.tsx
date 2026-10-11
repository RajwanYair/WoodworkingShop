import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NamedExpressionsPanel } from '../../src/components/configurator/NamedExpressionsPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';

function resetExpressions() {
  act(() => useCabinetStore.setState({ namedExpressions: [], expressionErrors: {} }));
  window.localStorage.removeItem('woodworkingshop:namedExpressions');
}

describe('NamedExpressionsPanel', () => {
  beforeEach(resetExpressions);
  afterEach(resetExpressions);

  it('rejects an invalid name, evaluates a valid expression, and removes it', async () => {
    const user = userEvent.setup();
    render(<NamedExpressionsPanel />);

    const name = screen.getByLabelText(/^name$/i);
    const expression = screen.getByLabelText(/^formula$/i);
    await user.type(name, '1invalid');
    await user.type(expression, '42');
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(useCabinetStore.getState().namedExpressions).toEqual([]);

    await user.clear(name);
    await user.type(name, 'shelf_gap');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    expect(screen.getByText(/42\.00/)).toBeInTheDocument();
    expect(useCabinetStore.getState().namedExpressions).toEqual([{ name: 'shelf_gap', expression: '42' }]);

    await user.click(screen.getByRole('button', { name: /remove.*shelf_gap/i }));
    expect(useCabinetStore.getState().namedExpressions).toEqual([]);
  });

  it('edits an expression and applies its evaluated value to the selected dimension', async () => {
    const user = userEvent.setup();
    render(<NamedExpressionsPanel />);
    await user.type(screen.getByLabelText(/^name$/i), 'target_width');
    await user.type(screen.getByLabelText(/^formula$/i), '720');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    await user.click(screen.getByRole('button', { name: 'Edit target_width' }));
    const formula = screen.getByLabelText(/^formula$/i);
    await user.clear(formula);
    await user.type(formula, '760');
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(useCabinetStore.getState().namedExpressions).toEqual([{ name: 'target_width', expression: '760' }]);

    await user.selectOptions(screen.getByLabelText(/dimension to update with target_width/i), 'width');
    await user.click(screen.getByRole('button', { name: 'Apply target_width' }));
    expect(useCabinetStore.getState().config.width).toBe(760);
  });

  it('does not apply an expression result outside hard dimension bounds', async () => {
    const user = userEvent.setup();
    const originalWidth = useCabinetStore.getState().config.width;
    render(<NamedExpressionsPanel />);
    await user.type(screen.getByLabelText(/^name$/i), 'too_wide');
    await user.type(screen.getByLabelText(/^formula$/i), '3001');
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    await user.click(screen.getByRole('button', { name: 'Apply too_wide' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/between 100 and 3000 mm/);
    expect(useCabinetStore.getState().config.width).toBe(originalWidth);
  });

  it('shows a global evaluation error for cyclic definitions', () => {
    act(() => {
      useCabinetStore.setState({
        namedExpressions: [
          { name: 'first_value', expression: 'second_value + 1' },
          { name: 'second_value', expression: 'first_value + 1' },
        ],
      });
    });
    render(<NamedExpressionsPanel />);

    expect(screen.getByRole('alert')).toHaveTextContent(/cyclic parameter dependencies/i);
  });
});
