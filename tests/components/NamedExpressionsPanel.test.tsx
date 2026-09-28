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
});
