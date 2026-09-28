import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MoistureShrinkagePanel } from '../../src/components/configurator/MoistureShrinkagePanel';

describe('MoistureShrinkagePanel', () => {
  it('recalculates for grain direction and reports an invalid dimension accessibly', async () => {
    const user = userEvent.setup();
    render(<MoistureShrinkagePanel />);

    const panel = screen.getByRole('region', { name: 'Moisture Content & Shrinkage' });
    expect(panel).toHaveTextContent('187.45 mm');

    await user.selectOptions(screen.getByLabelText(/^grain direction$/i), 'radial');
    expect(panel).toHaveTextContent('193.78 mm');

    const dimension = screen.getByLabelText(/dimension/i);
    await user.clear(dimension);
    await user.type(dimension, '0');
    expect(screen.getByRole('alert')).toHaveTextContent('dimensionMm must be greater than 0');
    expect(panel).not.toHaveTextContent('193.78 mm');
  });
});
