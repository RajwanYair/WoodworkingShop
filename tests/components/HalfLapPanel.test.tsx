import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HalfLapPanel } from '../../src/components/configurator/HalfLapPanel';

describe('HalfLapPanel', () => {
  it('updates notch depth and finished thickness and reports invalid input accessibly', async () => {
    const user = userEvent.setup();
    render(<HalfLapPanel />);

    const panel = screen.getByRole('region', { name: 'Half-Lap Joint' });
    const board1Thickness = screen.getByLabelText(/board 1 thickness/i);
    await user.clear(board1Thickness);
    await user.type(board1Thickness, '20');

    expect(panel).toHaveTextContent('10.0 mm');
    expect(panel).toHaveTextContent('20.0 mm');

    await user.clear(board1Thickness);
    await user.type(board1Thickness, '0');
    expect(screen.getByRole('alert')).toHaveTextContent('board1ThicknessMm must be greater than 0');
  });
});
