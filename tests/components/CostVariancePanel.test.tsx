import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CostVariancePanel } from '../../src/features/configurator/CostVariancePanel';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { useCostVarianceStore } from '../../src/store/cost-variance-store';

describe('CostVariancePanel', () => {
  let originalCost = useCabinetStore.getState().cost;
  let originalActiveTab = useCabinetStore.getState().activeTab;

  beforeEach(() => {
    useCostVarianceStore.getState().clearAll();
    originalCost = useCabinetStore.getState().cost;
    originalActiveTab = useCabinetStore.getState().activeTab;
  });

  afterEach(() => {
    useCabinetStore.setState({ cost: originalCost, activeTab: originalActiveTab });
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

  it('offers cabinet configuration when there are no sheet costs', async () => {
    const user = userEvent.setup();
    const cost = useCabinetStore.getState().cost;
    useCabinetStore.setState({ cost: { ...cost, sheetCosts: [] } });
    render(<CostVariancePanel />);

    await user.click(screen.getByRole('button', { name: 'Cost Variance' }));
    expect(screen.getByRole('button', { name: 'Configure' })).toBeInTheDocument();
  });

  it('routes from the empty state to cabinet configuration', async () => {
    const user = userEvent.setup();
    const cost = useCabinetStore.getState().cost;
    useCabinetStore.setState({ cost: { ...cost, sheetCosts: [] }, activeTab: 'preview' });
    render(<CostVariancePanel />);

    await user.click(screen.getByRole('button', { name: 'Cost Variance' }));
    await user.click(screen.getByRole('button', { name: 'Configure' }));

    expect(useCabinetStore.getState().activeTab).toBe('configurator');
  });
});
