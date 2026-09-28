import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CrownMouldingPanel } from '../../src/components/configurator/CrownMouldingPanel';

describe('CrownMouldingPanel', () => {
  it('updates the bevel for the selected cutting method and reports invalid angles', async () => {
    const user = userEvent.setup();
    render(<CrownMouldingPanel />);

    const panel = screen.getByRole('region', { name: 'Crown Moulding Cut Calculator' });
    const cuttingMethod = screen.getByLabelText(/cutting method/i);
    expect(cuttingMethod).toHaveValue('flat');

    await user.selectOptions(cuttingMethod, 'in_position');
    expect(panel).toHaveTextContent(`0.0\u00b0`);
    expect(cuttingMethod).toHaveValue('in_position');

    const cornerAngle = screen.getByLabelText(/corner angle/i);
    await user.clear(cornerAngle);
    await user.type(cornerAngle, '180');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'cornerAngleDeg must be between 0\u00b0 and 180\u00b0 (exclusive)',
    );
  });
});
