import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FramePanelCalcPanel } from '../../src/components/configurator/FramePanelCalcPanel';

describe('FramePanelCalcPanel', () => {
  it('recalculates panel dimensions and reports an invalid frame opening accessibly', async () => {
    const user = userEvent.setup();
    render(<FramePanelCalcPanel />);

    const panel = screen.getByRole('region', { name: 'Frame and Panel Calculator' });
    expect(panel).toHaveTextContent('493.0 mm');
    expect(panel).toHaveTextContent('773.0 mm');

    const panelFloat = screen.getByLabelText(/panel float/i);
    await user.clear(panelFloat);
    await user.type(panelFloat, '5');
    expect(panel).toHaveTextContent('489.0 mm');

    const frameWidth = screen.getByLabelText(/frame width/i);
    await user.clear(frameWidth);
    await user.type(frameWidth, '100');
    expect(screen.getByRole('alert')).toHaveTextContent('stiles are wider than the frame allows');
  });
});
