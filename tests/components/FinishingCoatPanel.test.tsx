import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FinishingCoatPanel } from '../../src/components/configurator/FinishingCoatPanel';

describe('FinishingCoatPanel', () => {
  it('updates volume and drying schedule when the finish type changes', async () => {
    const user = userEvent.setup();
    render(<FinishingCoatPanel />);

    const panel = screen.getByRole('region', { name: /finishing coat calculator/i });
    expect(panel).toHaveTextContent('0.66 L');
    expect(panel).toHaveTextContent('240 min');
    expect(panel).toHaveTextContent('80 h');

    await user.click(screen.getByRole('button', { name: 'Lacquer' }));

    expect(panel).toHaveTextContent('0.56 L');
    expect(panel).toHaveTextContent('30 min');
    expect(panel).toHaveTextContent('25 h');
  });
});
