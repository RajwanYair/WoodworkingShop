import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BoxJointPanel } from '../../src/components/configurator/BoxJointPanel';

describe('BoxJointPanel', () => {
  it('shows calculated results and reports invalid input accessibly', async () => {
    const user = userEvent.setup();
    render(<BoxJointPanel />);

    const panel = screen.getByRole('region', { name: 'Box Joint Calculator' });
    expect(panel).toHaveTextContent('11');

    const fingerWidth = screen.getByLabelText(/desired finger width/i);
    await user.clear(fingerWidth);
    await user.type(fingerWidth, '0');

    expect(screen.getByRole('alert')).toHaveTextContent('fingerWidthMm must be positive');
  });
});
