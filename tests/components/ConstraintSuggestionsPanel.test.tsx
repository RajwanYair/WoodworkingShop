import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConstraintSuggestionsPanel } from '../../src/components/configurator/ConstraintSuggestionsPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { cfg } from '../helpers';

describe('ConstraintSuggestionsPanel', () => {
  beforeEach(() => {
    const config = cfg({ width: 100 });
    useCabinetStore.setState({ config, cabinets: [{ name: 'Cabinet 1', config }], activeCabinetIndex: 0 });
  });

  it('applies a suggested dimension repair and removes the violation', async () => {
    const user = userEvent.setup();
    render(<ConstraintSuggestionsPanel />);

    await user.click(screen.getByRole('button', { name: /Constraint Check/ }));
    const fixWidth = screen.getByRole('button', { name: /Fix Width:/i });
    await user.click(fixWidth);

    expect(useCabinetStore.getState().config.width).toBeGreaterThanOrEqual(200);
    expect(screen.getByText('All dimensions are within manufacturing limits.')).toBeInTheDocument();
  });
});
