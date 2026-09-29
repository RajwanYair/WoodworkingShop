import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CabinetDoorPanel } from '../../src/components/configurator/CabinetDoorPanel';

describe('CabinetDoorPanel', () => {
  it('recalculates door leaves and hinges and reports an invalid opening', async () => {
    const user = userEvent.setup();
    render(<CabinetDoorPanel />);

    expect(screen.getByText('565.0 mm')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '2 doors' }));
    expect(screen.getByText('281.5 mm')).toBeInTheDocument();
    expect(screen.getByText('4', { exact: true })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Inset' }));
    expect(screen.getByText('272.8 mm')).toBeInTheDocument();
    expect(screen.getByText('697.0 mm')).toBeInTheDocument();

    await user.clear(screen.getByRole('spinbutton', { name: 'Opening Width (mm)' }));
    expect(screen.getByRole('alert')).toHaveTextContent('openingWidthMm must be > 0');
  });
});
