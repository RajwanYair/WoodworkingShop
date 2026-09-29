import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { KerfBendingPanel } from '../../src/components/configurator/KerfBendingPanel';

describe('KerfBendingPanel', () => {
  it('recalculates material-dependent kerfs and warns when the panel is too thin', async () => {
    const user = userEvent.setup();
    render(<KerfBendingPanel />);

    expect(screen.getByText('8', { exact: true })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hardwood' }));
    expect(screen.getByText('7', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('4.0 mm')).toBeInTheDocument();

    const thickness = screen.getByRole('spinbutton', { name: 'Panel Thickness (mm)' });
    await user.clear(thickness);
    await user.type(thickness, '3');
    expect(screen.getByRole('alert')).toHaveTextContent('Bend radius too tight');
    expect(screen.queryByText('Number of Kerfs')).not.toBeInTheDocument();
  });
});
