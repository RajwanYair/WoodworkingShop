import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ScrewPulloutPanel } from '../../src/components/configurator/ScrewPulloutPanel';

describe('ScrewPulloutPanel', () => {
  it('updates pull-out strength by wood density and validates screw diameter', async () => {
    const user = userEvent.setup();
    render(<ScrewPulloutPanel />);

    const mediumForce = Number(screen.getByText(/^\d+\.\d+ N$/).textContent?.replace(' N', ''));
    expect(screen.getByText(/USDA equation 8-10a estimates short-term ultimate load/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'High Density (Hickory, Teak)' }));
    const highForce = Number(screen.getByText(/^\d+\.\d+ N$/).textContent?.replace(' N', ''));
    expect(highForce).toBeGreaterThan(mediumForce);
    expect(screen.getByText('Adequate')).toBeInTheDocument();

    const diameter = screen.getByRole('spinbutton', { name: 'Screw Diameter (mm)' });
    await user.clear(diameter);
    expect(screen.getByRole('alert')).toHaveTextContent('screwDiameterMm must be >= 1 and <= 12, got 0');
  });
});
