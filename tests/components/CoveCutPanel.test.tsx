import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CoveCutPanel } from '../../src/components/configurator/CoveCutPanel';

describe('CoveCutPanel', () => {
  it('shows the calculated fence angle and reports invalid input accessibly', async () => {
    const user = userEvent.setup();
    render(<CoveCutPanel />);

    const panel = screen.getByRole('region', { name: 'Cove Cut (Table Saw)' });
    expect(panel).toHaveTextContent('56.1°');
    expect(panel).toHaveTextContent('10');

    const bladeKerf = screen.getByLabelText(/blade kerf/i);
    await user.clear(bladeKerf);
    await user.type(bladeKerf, '3.2');

    expect(panel).not.toHaveTextContent('56.1°');

    const copeWidth = screen.getByLabelText(/cove width/i);
    await user.clear(copeWidth);
    await user.type(copeWidth, '0');

    expect(screen.getByRole('alert')).toHaveTextContent('copeWidthMm must be greater than 0');
  });
});
