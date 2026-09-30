import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { CostEstimatePanel } from '../../src/components/configurator/CostEstimatePanel';
import type { CostBreakdown } from '../../src/engine/cost-estimator';
import { DEFAULT_CONFIG, getMaterial } from '../../src/engine/materials';
import { useCabinetStore } from '../../src/store/cabinet-store';

const material = getMaterial('mdf-3');
const fixtureCost: CostBreakdown = {
  sheetCosts: [
    {
      material: material.key,
      materialName: material.name,
      thickness: material.thickness,
      qty: 2,
      pricePerSheet: 100,
      subtotal: 200,
    },
  ],
  hardwareItems: [{ id: 'H01', name: { en: 'Euro hinge', he: 'ציר' }, qty: 2, unitPrice: 12, subtotal: 24 }],
  edgeBandingCost: 15,
  hardwareCost: 24,
  wasteCost: 10,
  labourHours: 2,
  labourCost: 150,
  finishCost: 0,
  totalMaterialCost: 200,
  totalCost: 389,
};

describe('CostEstimatePanel', () => {
  beforeEach(() => {
    const config = { ...DEFAULT_CONFIG };
    useCabinetStore.setState({
      config,
      cabinets: [{ name: 'Cabinet 1', config }],
      activeCabinetIndex: 0,
      cost: fixtureCost,
      materialPriceOverrides: {},
      edgeBandingRate: 3,
      hardwarePriceOverrides: {},
      labourRate: 75,
      labourHours: 2,
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

  it('cancels a finish-cost edit with Escape', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: 'Click to set finish/paint cost' }));
    const input = screen.getByRole('spinbutton', { name: 'Finish/paint cost' });
    await user.type(input, '125');
    await user.keyboard('{Escape}');

    expect(useCabinetStore.getState().finishCost).toBe(0);
    expect(screen.getByRole('button', { name: 'Click to set finish/paint cost' })).toHaveTextContent('—');
  });

  it('clamps a negative finish cost to zero on blur', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: 'Click to set finish/paint cost' }));
    const input = screen.getByRole('spinbutton', { name: 'Finish/paint cost' });
    await user.type(input, '-25');
    await user.tab();

    expect(useCabinetStore.getState().finishCost).toBe(0);
  });

  it('commits labour hours with Enter and updates the visible estimate', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: /2h → ₪150/ }));
    const input = screen.getByRole('spinbutton', { name: 'Labour hours' });
    await user.clear(input);
    await user.type(input, '4');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().labourHours).toBe(4);
    expect(screen.getByRole('button', { name: /4h →/ })).toBeInTheDocument();
  });

  it('commits labour hours when focus leaves the input', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: /2h → ₪150/ }));
    const input = screen.getByRole('spinbutton', { name: 'Labour hours' });
    await user.clear(input);
    await user.type(input, '3.5');
    await user.tab();

    expect(useCabinetStore.getState().labourHours).toBe(3.5);
  });

  it('clamps negative labour hours to zero', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: /2h → ₪150/ }));
    const input = screen.getByRole('spinbutton', { name: 'Labour hours' });
    await user.clear(input);
    await user.type(input, '-2');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().labourHours).toBe(0);
  });

  it('cancels a labour-hours edit with Escape', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: /2h → ₪150/ }));
    const input = screen.getByRole('spinbutton', { name: 'Labour hours' });
    await user.clear(input);
    await user.type(input, '8');
    await user.keyboard('{Escape}');

    expect(useCabinetStore.getState().labourHours).toBe(2);
    expect(screen.getByRole('button', { name: /2h → ₪150/ })).toBeInTheDocument();
  });

  it('commits a labour-rate edit with Enter', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: '₪75/h' }));
    const input = screen.getByRole('spinbutton', { name: 'Labour rate per hour' });
    await user.clear(input);
    await user.type(input, '90');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().labourRate).toBe(90);
    expect(screen.getByRole('button', { name: /₪90\/h/ })).toBeInTheDocument();
  });

  it('commits a labour-rate edit on blur', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: '₪75/h' }));
    const input = screen.getByRole('spinbutton', { name: 'Labour rate per hour' });
    await user.clear(input);
    await user.type(input, '110');
    await user.tab();

    expect(useCabinetStore.getState().labourRate).toBe(110);
  });

  it('restores the default labour rate when zero is entered', async () => {
    const user = userEvent.setup();
    useCabinetStore.setState({ labourRate: 90 });
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: /₪90\/h/ }));
    const input = screen.getByRole('spinbutton', { name: 'Labour rate per hour' });
    await user.clear(input);
    await user.type(input, '0');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().labourRate).toBe(75);
  });

  it('cancels a labour-rate edit with Escape', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: '₪75/h' }));
    const input = screen.getByRole('spinbutton', { name: 'Labour rate per hour' });
    await user.clear(input);
    await user.type(input, '100');
    await user.keyboard('{Escape}');

    expect(useCabinetStore.getState().labourRate).toBe(75);
    expect(screen.getByRole('button', { name: '₪75/h' })).toBeInTheDocument();
  });

  it('commits an edge-banding rate edit with Enter', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: '₪15' }));
    const input = screen.getByRole('spinbutton', { name: 'Edge banding rate per meter' });
    await user.clear(input);
    await user.type(input, '5.5');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().edgeBandingRate).toBe(5.5);
  });

  it('accepts a zero edge-banding rate', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: '₪15' }));
    const input = screen.getByRole('spinbutton', { name: 'Edge banding rate per meter' });
    await user.clear(input);
    await user.type(input, '0');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().edgeBandingRate).toBe(0);
  });

  it('ignores a negative edge-banding rate', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: '₪15' }));
    const input = screen.getByRole('spinbutton', { name: 'Edge banding rate per meter' });
    await user.clear(input);
    await user.type(input, '-4');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().edgeBandingRate).toBe(3);
  });

  it('commits a material sheet-price override with Enter', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: '₪200' }));
    const input = screen.getByRole('spinbutton', { name: `Price per sheet for ${material.name.en}` });
    await user.clear(input);
    await user.type(input, '175');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().materialPriceOverrides[material.key]).toBe(175);
  });

  it('removes a material sheet-price override when zero is entered', async () => {
    const user = userEvent.setup();
    useCabinetStore.setState({ materialPriceOverrides: { [material.key]: 175 } });
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: /₪200/ }));
    const input = screen.getByRole('spinbutton', { name: `Price per sheet for ${material.name.en}` });
    await user.clear(input);
    await user.type(input, '0');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().materialPriceOverrides).not.toHaveProperty(material.key);
  });

  it('removes a material sheet-price override for a negative value', async () => {
    const user = userEvent.setup();
    useCabinetStore.setState({ materialPriceOverrides: { [material.key]: 175 } });
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: /₪200/ }));
    const input = screen.getByRole('spinbutton', { name: `Price per sheet for ${material.name.en}` });
    await user.clear(input);
    await user.type(input, '-1');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().materialPriceOverrides).not.toHaveProperty(material.key);
  });

  it('cancels a material sheet-price edit with Escape', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: '₪200' }));
    const input = screen.getByRole('spinbutton', { name: `Price per sheet for ${material.name.en}` });
    await user.clear(input);
    await user.type(input, '175');
    await user.keyboard('{Escape}');

    expect(useCabinetStore.getState().materialPriceOverrides).not.toHaveProperty(material.key);
    expect(screen.getByRole('button', { name: '₪200' })).toBeInTheDocument();
  });

  it('resets an existing material sheet-price override', async () => {
    const user = userEvent.setup();
    useCabinetStore.setState({ materialPriceOverrides: { [material.key]: 175 } });
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: /₪200/ }));
    await user.click(screen.getByRole('button', { name: 'Reset to default price' }));

    expect(useCabinetStore.getState().materialPriceOverrides).not.toHaveProperty(material.key);
  });

  it('commits a hardware unit-price override with Enter', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: '₪24' }));
    const input = screen.getByRole('spinbutton', { name: 'Price per unit for Euro hinge' });
    await user.clear(input);
    await user.type(input, '16');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().hardwarePriceOverrides.H01).toBe(16);
  });

  it('accepts a zero hardware unit price', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: '₪24' }));
    const input = screen.getByRole('spinbutton', { name: 'Price per unit for Euro hinge' });
    await user.clear(input);
    await user.type(input, '0');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().hardwarePriceOverrides.H01).toBe(0);
  });

  it('removes a hardware unit-price override for a negative value', async () => {
    const user = userEvent.setup();
    useCabinetStore.setState({ hardwarePriceOverrides: { H01: 16 } });
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: /₪24/ }));
    const input = screen.getByRole('spinbutton', { name: 'Price per unit for Euro hinge' });
    await user.clear(input);
    await user.type(input, '-1');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().hardwarePriceOverrides).not.toHaveProperty('H01');
  });

  it('cancels a hardware unit-price edit with Escape', async () => {
    const user = userEvent.setup();
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: '₪24' }));
    const input = screen.getByRole('spinbutton', { name: 'Price per unit for Euro hinge' });
    await user.clear(input);
    await user.type(input, '16');
    await user.keyboard('{Escape}');

    expect(useCabinetStore.getState().hardwarePriceOverrides).not.toHaveProperty('H01');
    expect(screen.getByRole('button', { name: '₪24' })).toBeInTheDocument();
  });

  it('resets an existing hardware unit-price override', async () => {
    const user = userEvent.setup();
    useCabinetStore.setState({ hardwarePriceOverrides: { H01: 16 } });
    render(<CostEstimatePanel />);

    await user.click(screen.getByRole('button', { name: /₪24/ }));
    await user.click(screen.getByRole('button', { name: 'Reset to default price' }));

    expect(useCabinetStore.getState().hardwarePriceOverrides).not.toHaveProperty('H01');
  });

  it('shows the rounded per-cabinet cost for multi-cabinet projects', () => {
    const config = { ...DEFAULT_CONFIG };
    useCabinetStore.setState({
      cabinets: [
        { name: 'Cabinet 1', config },
        { name: 'Cabinet 2', config },
      ],
    });

    render(<CostEstimatePanel />);

    expect(screen.getByText('~₪195')).toBeInTheDocument();
  });

  it('hides the cost breakdown and per-cabinet estimate when the total is zero', () => {
    const config = { ...DEFAULT_CONFIG };
    useCabinetStore.setState({
      cost: { ...fixtureCost, totalCost: 0 },
      cabinets: [
        { name: 'Cabinet 1', config },
        { name: 'Cabinet 2', config },
      ],
    });

    render(<CostEstimatePanel />);

    expect(screen.queryByText('~₪195')).not.toBeInTheDocument();
    expect(screen.queryByText(material.name.en)).not.toBeInTheDocument();
    expect(screen.getByText('₪0')).toBeInTheDocument();
  });
});
