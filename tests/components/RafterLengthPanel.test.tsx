import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RafterLengthPanel } from '../../src/components/configurator/RafterLengthPanel';

describe('RafterLengthPanel', () => {
  it('recalculates run and total length when switching to a shed roof', async () => {
    const user = userEvent.setup();
    render(<RafterLengthPanel />);

    const panel = screen.getByRole('region', { name: /rafter/i });
    expect(panel).toHaveTextContent('3000 mm');

    await user.click(screen.getByRole('checkbox', { name: /shed roof/i }));

    expect(panel).toHaveTextContent('6000 mm');
    expect(panel).toHaveTextContent('7211.3 mm');
  });
});
