import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CalculatorsPanel } from '../../src/components/configurator/CalculatorsPanel';

describe('roadmap calculator panels', () => {
  it('mounts the pocket-hole calculator and recalculates screw spacing', async () => {
    const user = userEvent.setup();
    render(<CalculatorsPanel />);

    await user.click(screen.getByRole('button', { name: 'Pocket Hole Calculator' }));
    const panel = await screen.findByRole('region', { name: 'Pocket Hole Calculator' });
    expect(panel).toHaveTextContent('137.5 mm');
    await user.clear(screen.getByLabelText(/workpiece thickness/i));
    await user.type(screen.getByLabelText(/workpiece thickness/i), '15');
    await user.clear(screen.getByLabelText(/workpiece thickness/i));
    await user.type(screen.getByLabelText(/workpiece thickness/i), '18');
    await user.clear(screen.getByLabelText(/mating piece thickness/i));
    await user.type(screen.getByLabelText(/mating piece thickness/i), '18');
    await user.clear(screen.getByLabelText(/joint length/i));
    await user.type(screen.getByLabelText(/joint length/i), '200');
    expect(panel).toHaveTextContent('150 mm');
  });

  it('recalculates shelf deflection, mortise dimensions, and dovetail layout from input changes', async () => {
    const user = userEvent.setup();
    render(<CalculatorsPanel />);

    await user.click(screen.getByRole('button', { name: 'Shelf Sag Calculator' }));
    const shelfPanel = await screen.findByRole('region', { name: 'Shelf Sag Calculator' });
    const initialDeflection = shelfPanel.textContent;
    await user.clear(screen.getByLabelText(/shelf span/i));
    await user.type(screen.getByLabelText(/shelf span/i), '1000');
    expect(shelfPanel.textContent).not.toBe(initialDeflection);

    await user.click(screen.getByRole('button', { name: 'Mortise & Tenon Calculator' }));
    const mortisePanel = await screen.findByRole('region', { name: 'Mortise & Tenon Calculator' });
    await user.clear(screen.getByLabelText(/stock thickness/i));
    await user.type(screen.getByLabelText(/stock thickness/i), '30');
    expect(mortisePanel).toHaveTextContent('10 mm');

    await user.click(screen.getByRole('button', { name: 'Dovetail Layout Calculator' }));
    const dovetailPanel = await screen.findByRole('region', { name: 'Dovetail Layout Calculator' });
    const initialLayout = dovetailPanel.textContent;
    await user.clear(screen.getByLabelText(/number of tails/i));
    await user.type(screen.getByLabelText(/number of tails/i), '3');
    expect(dovetailPanel.textContent).not.toBe(initialLayout);
  });
});
