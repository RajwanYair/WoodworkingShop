import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { CostEstimatePanel } from '../../src/components/configurator/CostEstimatePanel';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { useCabinetStore } from '../../src/store/cabinet-store';

describe('CostEstimatePanel', () => {
  beforeEach(() => {
    const config = { ...DEFAULT_CONFIG };
    useCabinetStore.setState({
      config,
      cabinets: [{ name: 'Cabinet 1', config }],
      activeCabinetIndex: 0,
      finishCost: 0,
    });
  });

  it('updates the project finish cost from the estimate panel', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: 'Click to set finish/paint cost' }));
    const finishInput = screen.getByRole('spinbutton', { name: 'Finish/paint cost' });
    await user.clear(finishInput);
    await user.type(finishInput, '125');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().finishCost).toBe(125);
    expect(screen.getByRole('button', { name: 'Click to set finish/paint cost' })).toHaveTextContent('₪125');
  });
});
