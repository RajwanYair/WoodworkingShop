import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RouterCirclePanel } from '../../src/components/configurator/RouterCirclePanel';

describe('RouterCirclePanel', () => {
  it('updates arm length by cut mode and reports a bit wider than the target', async () => {
    const user = userEvent.setup();
    render(<RouterCirclePanel />);

    const panel = screen.getByRole('region', { name: /router circle/i });
    expect(panel).toHaveTextContent('144.0 mm');

    await user.selectOptions(screen.getByLabelText(/cut mode/i), 'hole');
    expect(panel).toHaveTextContent('156.0 mm');

    const bitDiameter = screen.getByLabelText(/bit diameter/i);
    await user.clear(bitDiameter);
    await user.type(bitDiameter, '300');
    expect(screen.getByRole('alert')).toHaveTextContent('bitDiameterMm must be less than targetDiameterMm');
  });
});
