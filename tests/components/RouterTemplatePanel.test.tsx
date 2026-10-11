import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RouterTemplatePanel } from '../../src/components/configurator/RouterTemplatePanel';

describe('RouterTemplatePanel', () => {
  it('reverses template adjustment for outside cuts and applies it to nominal size', async () => {
    const user = userEvent.setup();
    render(<RouterTemplatePanel />);

    const panel = screen.getByRole('region', { name: /router template/i });
    const nominalDimension = screen.getByLabelText(/nominal feature dimension/i);
    await user.type(nominalDimension, '100');
    expect(panel).toHaveTextContent('108.000 mm');

    await user.selectOptions(screen.getByLabelText(/cut type/i), 'outside');
    expect(panel).toHaveTextContent('-8.000 mm');
    expect(panel).toHaveTextContent('92.000 mm');
  });
});
