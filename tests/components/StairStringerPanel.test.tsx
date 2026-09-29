import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { StairStringerPanel } from '../../src/components/configurator/StairStringerPanel';

describe('StairStringerPanel', () => {
  it('shows the default stair geometry and warns when tread depth is below IRC guidance', async () => {
    const user = userEvent.setup();
    render(<StairStringerPanel />);

    const panel = screen.getByRole('region', { name: /stair stringer calculator/i });
    expect(panel).toHaveTextContent('16');
    expect(panel).toHaveTextContent('4200 mm');
    expect(panel).toHaveTextContent('Passes IRC 2021 riser and tread limits');

    const treadDepth = screen.getByRole('spinbutton', { name: /tread depth/i });
    await user.clear(treadDepth);
    await user.type(treadDepth, '200');

    expect(screen.getByRole('alert')).toHaveTextContent('Tread depth below IRC minimum 10" (254 mm)');
    expect(panel).not.toHaveTextContent('Passes IRC 2021 riser and tread limits');
  });
});
