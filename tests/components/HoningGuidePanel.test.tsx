import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HoningGuidePanel } from '../../src/components/configurator/HoningGuidePanel';

describe('HoningGuidePanel', () => {
  it('updates the microbevel projection and reports invalid values accessibly', async () => {
    const user = userEvent.setup();
    render(<HoningGuidePanel />);

    const panel = screen.getByRole('region', { name: 'Honing Guide Calculator' });
    expect(panel).toHaveTextContent('53.6 mm');

    const microbevel = screen.getByLabelText(/micro-bevel angle/i);
    await user.clear(microbevel);
    await user.type(microbevel, '3');

    expect(panel).toHaveTextContent('47.0 mm');

    await user.clear(microbevel);
    await user.type(microbevel, '45');
    expect(screen.getByRole('alert')).toHaveTextContent('microbevelDeg must be less than 45°');
    expect(panel).not.toHaveTextContent('53.6 mm');
  });
});
