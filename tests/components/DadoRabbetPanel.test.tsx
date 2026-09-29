import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DadoRabbetPanel } from '../../src/components/configurator/DadoRabbetPanel';

describe('DadoRabbetPanel', () => {
  it('shows rabbet-only controls and reports invalid mating thickness', async () => {
    const user = userEvent.setup();
    render(<DadoRabbetPanel />);

    expect(screen.queryByRole('spinbutton', { name: /offset from edge/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Rabbet' }));

    const offsetInput = screen.getByRole('spinbutton', { name: /offset from edge/i });
    await user.clear(offsetInput);
    await user.type(offsetInput, '8');
    expect(screen.getByText('Rabbet bit with bearing or dado blade set')).toBeInTheDocument();

    const matingThickness = screen.getByRole('spinbutton', { name: /mating panel thickness/i });
    await user.clear(matingThickness);
    await user.type(matingThickness, '19');

    expect(screen.getByRole('alert')).toHaveTextContent('matingThicknessMm must be less than boardThicknessMm');
    expect(screen.queryByText('Cut Width')).not.toBeInTheDocument();
  });
});
