import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { WoodTurningPanel } from '../../src/components/configurator/WoodTurningPanel';

describe('WoodTurningPanel', () => {
  it('recalculates advisory RPM by operation and blank diameter', async () => {
    const user = userEvent.setup();
    render(<WoodTurningPanel />);

    expect(screen.getByText(/^1,270\s*RPM$/)).toBeInTheDocument();
    expect(screen.getByText('Min RPM (advisory)')).toBeInTheDocument();
    expect(screen.getByText('Max RPM (advisory)')).toBeInTheDocument();
    expect(
      screen.getByText(/Advisory estimate only.*Unbalanced blanks may need much lower speeds/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Roughing' }));
    expect(screen.getByText(/^914\s*RPM$/)).toBeInTheDocument();

    const diameter = screen.getByRole('spinbutton', { name: 'Blank Diameter (mm)' });
    await user.clear(diameter);
    await user.type(diameter, '200');
    expect(screen.getByText(/^457\s*RPM$/)).toBeInTheDocument();

    await user.clear(diameter);
    expect(screen.getByRole('alert')).toHaveTextContent('blankDiameterMm must be positive');
  });
});
