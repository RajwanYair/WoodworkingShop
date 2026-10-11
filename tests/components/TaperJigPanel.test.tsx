import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TaperJigPanel } from '../../src/components/configurator/TaperJigPanel';

describe('TaperJigPanel', () => {
  it('updates the jig setting and per-face removal for a symmetric taper', async () => {
    const user = userEvent.setup();
    render(<TaperJigPanel />);

    const panel = screen.getByRole('region', { name: /taper jig calculator/i });
    expect(panel).toHaveTextContent('30 mm');
    expect(panel).not.toHaveTextContent('Flip workpiece after first pass for symmetric taper');

    await user.selectOptions(screen.getByRole('combobox', { name: /tapered faces/i }), '2');

    expect(panel).toHaveTextContent('15 mm');
    expect(panel).toHaveTextContent('Flip workpiece after first pass for symmetric taper');
  });
});
