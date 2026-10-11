import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GlueCoveragePanel } from '../../src/components/configurator/GlueCoveragePanel';

describe('GlueCoveragePanel', () => {
  it('recalculates volume for multiple joints and selected glue type', async () => {
    const user = userEvent.setup();
    render(<GlueCoveragePanel />);

    const panel = screen.getByRole('region', { name: /wood glue coverage calculator/i });
    expect(panel).toHaveTextContent('0.28 mL');
    expect(panel).toHaveTextContent('10 min');

    const jointCount = screen.getByRole('spinbutton', { name: /number of joints/i });
    await user.clear(jointCount);
    await user.type(jointCount, '2');
    await user.selectOptions(screen.getByRole('combobox', { name: /glue type/i }), 'polyurethane');

    expect(panel).toHaveTextContent('0.4 mL');
    expect(panel).toHaveTextContent('0.46 mL');
    expect(panel).toHaveTextContent('15 min');
    expect(panel).toHaveTextContent('60 min');
  });

  it('shows a validation error for an invalid area and recovers when corrected', async () => {
    const user = userEvent.setup();
    render(<GlueCoveragePanel />);

    const panel = screen.getByRole('region', { name: /wood glue coverage calculator/i });
    const surfaceArea = screen.getByRole('spinbutton', { name: /surface area/i });
    await user.clear(surfaceArea);
    await user.type(surfaceArea, '0');

    expect(screen.getByRole('alert')).toHaveTextContent('surfaceAreaMm2');
    expect(panel).not.toHaveTextContent('0.28 mL');

    await user.clear(surfaceArea);
    await user.type(surfaceArea, '50000');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(panel).toHaveTextContent('0.28 mL');
  });
});
