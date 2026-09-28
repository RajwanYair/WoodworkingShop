import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PlanerPassesPanel } from '../../src/components/configurator/PlanerPassesPanel';

describe('PlanerPassesPanel', () => {
  it('recalculates planer passes and reports an invalid target thickness accessibly', async () => {
    const user = userEvent.setup();
    render(<PlanerPassesPanel />);

    const panel = screen.getByRole('region', { name: /planer/i });
    const targetThickness = screen.getByLabelText(/target thickness/i);
    await user.clear(targetThickness);
    await user.type(targetThickness, '44');

    expect(panel).toHaveTextContent('4');
    expect(panel).toHaveTextContent('1.5 mm');

    await user.clear(targetThickness);
    await user.type(targetThickness, '50');
    expect(screen.getByRole('alert')).toHaveTextContent('targetThicknessMm must be less than initialThicknessMm');
  });
});
