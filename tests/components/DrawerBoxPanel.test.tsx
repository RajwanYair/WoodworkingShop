import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DrawerBoxPanel } from '../../src/components/configurator/DrawerBoxPanel';

describe('DrawerBoxPanel', () => {
  it('updates slide clearance and warns when drawer depth is short', async () => {
    const user = userEvent.setup();
    render(<DrawerBoxPanel />);

    expect(screen.getByText('474.6 mm')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bottom Mount' }));
    expect(screen.getByText('498.0 mm')).toBeInTheDocument();

    const cabinetDepth = screen.getByRole('spinbutton', { name: 'Cabinet Depth (mm)' });
    await user.clear(cabinetDepth);
    await user.type(cabinetDepth, '300');
    expect(screen.getByText('281.0 mm')).toBeInTheDocument();
    expect(screen.getByText(/Box depth is short — verify slide length/)).toBeInTheDocument();
  });
});
