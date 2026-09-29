import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { CostVariancePanel } from '../../src/components/configurator/CostVariancePanel';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { useCostVarianceStore } from '../../src/store/cost-variance-store';

describe('CostVariancePanel', () => {
  beforeEach(() => {
    useCostVarianceStore.getState().clearAll();
  });

  it('updates the actual material cost and shows the resulting variance', async () => {
    const user = userEvent.setup();
    const material = useCabinetStore.getState().cost.sheetCosts[0];
    render(<CostVariancePanel />);

    await user.click(screen.getByRole('button', { name: 'Cost Variance' }));
    await user.click(screen.getByRole('button', { name: `Enter actual cost for ${material.materialName.en}` }));
    const actualCost = screen.getByRole('spinbutton', {
      name: `Enter actual cost for ${material.materialName.en}`,
    });
    await user.clear(actualCost);
    await user.type(actualCost, '999');
    await user.keyboard('{Enter}');

    expect(useCostVarianceStore.getState().actualCosts[material.material]).toBe(999);
    expect(screen.getByRole('table', { name: 'Cost variance breakdown table' })).toHaveTextContent('+');
  });
});
