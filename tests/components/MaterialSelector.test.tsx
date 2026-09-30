import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import type { Material } from '../../src/engine/types';
import { MaterialSelector } from '../../src/components/configurator/MaterialSelector';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { useCustomMaterialsStore } from '../../src/store/custom-materials-store';
import { useToastStore } from '../../src/store/toast-store';

const customPanel: Material = {
  key: 'custom-oak-panel',
  name: { en: 'Custom Oak Panel', he: 'Custom Oak Panel' },
  thickness: 18,
  sheetWidth: 1220,
  sheetLength: 2440,
  pricePerSheet: 210,
  currencyCode: 'ILS',
  category: 'panel',
  color: '#b88a56',
  hasGrain: true,
  densityKgM3: 650,
};

const customBack: Material = {
  ...customPanel,
  key: 'custom-mdf-back',
  name: { en: 'Custom MDF Back', he: 'Custom MDF Back' },
  thickness: 6,
  category: 'back',
};

describe('MaterialSelector', () => {
  beforeEach(() => {
    const config = { ...DEFAULT_CONFIG };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Cabinet 1', config }], activeCabinetIndex: 0 });
    useCustomMaterialsStore.setState({ materials: [] });
    useToastStore.setState({ toasts: [] });
  });

  it('disables the back-material choice when the back panel is excluded', async () => {
    const user = userEvent.setup();
    render(<MaterialSelector />);

    const backMaterial = screen.getByRole('combobox', { name: /back panel material/i });
    const includeBack = screen.getByRole('checkbox', { name: /include back panel/i });
    expect(backMaterial).toBeEnabled();

    await user.click(includeBack);

    expect(includeBack).not.toBeChecked();
    expect(backMaterial).toBeDisabled();
    expect(useCabinetStore.getState().config.hasBack).toBe(false);
    expect(useCabinetStore.getState().parts.some((part) => part.name.en === 'Back Panel')).toBe(false);
  });

  it('updates the carcass material and generated parts from the material selector', async () => {
    const user = userEvent.setup();
    render(<MaterialSelector />);

    await user.selectOptions(screen.getByRole('combobox', { name: /carcass/i }), 'melamine-18');

    expect(useCabinetStore.getState().config.carcassMaterial).toBe('melamine-18');
    expect(useCabinetStore.getState().parts.some((part) => part.material === 'melamine-18')).toBe(true);
  });

  it('updates the back-panel material and generated back part', async () => {
    const user = userEvent.setup();
    render(<MaterialSelector />);

    await user.selectOptions(screen.getByRole('combobox', { name: /back panel material/i }), 'mdf-3');

    expect(useCabinetStore.getState().config.backPanelMaterial).toBe('mdf-3');
    expect(
      useCabinetStore.getState().parts.some((part) => part.name.en === 'Back Panel' && part.material === 'mdf-3'),
    ).toBe(true);
  });

  it('restores the back-material selector and back part when inclusion is re-enabled', async () => {
    const user = userEvent.setup();
    const config = { ...DEFAULT_CONFIG, hasBack: false };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Cabinet 1', config }], activeCabinetIndex: 0 });
    render(<MaterialSelector />);
    const backMaterial = screen.getByRole('combobox', { name: /back panel material/i });

    expect(backMaterial).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /include back panel/i }));

    expect(backMaterial).toBeEnabled();
    expect(useCabinetStore.getState().config.hasBack).toBe(true);
    expect(useCabinetStore.getState().parts.some((part) => part.name.en === 'Back Panel')).toBe(true);
  });

  it('lists custom panel materials only in the carcass selector', () => {
    useCustomMaterialsStore.setState({ materials: [customPanel] });
    render(<MaterialSelector />);

    expect(screen.getByRole('option', { name: /Custom Oak Panel/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Custom MDF Back/ })).not.toBeInTheDocument();
  });

  it('lists custom back materials only in the back-material selector', () => {
    useCustomMaterialsStore.setState({ materials: [customBack] });
    render(<MaterialSelector />);

    expect(screen.getByRole('option', { name: /Custom MDF Back/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Custom Oak Panel/ })).not.toBeInTheDocument();
  });

  it('shows the selected custom panel and its material swatch', () => {
    useCustomMaterialsStore.setState({ materials: [customPanel] });
    const config = { ...DEFAULT_CONFIG, carcassMaterial: customPanel.key };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Custom panel cabinet', config }] });
    render(<MaterialSelector />);

    expect(screen.getByRole('combobox', { name: /carcass/i })).toHaveValue(customPanel.key);
    expect(screen.getByTitle(customPanel.color)).toHaveStyle({ backgroundColor: customPanel.color });
  });

  it('shows the selected custom back material and its material swatch', () => {
    useCustomMaterialsStore.setState({ materials: [customBack] });
    const config = { ...DEFAULT_CONFIG, backPanelMaterial: customBack.key };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Custom back cabinet', config }] });
    render(<MaterialSelector />);

    expect(screen.getByRole('combobox', { name: /back panel material/i })).toHaveValue(customBack.key);
    expect(screen.getByTitle(customBack.color)).toHaveStyle({ backgroundColor: customBack.color });
  });

  it('shows a deflection recommendation for wide cabinets using chipboard', () => {
    const config = { ...DEFAULT_CONFIG, width: 1000, carcassMaterial: 'chipboard-18' };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Wide cabinet', config }] });

    render(<MaterialSelector />);

    expect(screen.getByRole('note')).toHaveTextContent('Deflection');
    expect(screen.getByRole('button', { name: /Switch to Birch Plywood 18 mm/ })).toBeInTheDocument();
  });

  it('switches to the suggested stiffer material from a deflection note', async () => {
    const user = userEvent.setup();
    const config = { ...DEFAULT_CONFIG, width: 1000, carcassMaterial: 'chipboard-18' };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Wide cabinet', config }] });
    render(<MaterialSelector />);

    await user.click(screen.getByRole('button', { name: /Switch to Birch Plywood 18 mm/ }));

    expect(useCabinetStore.getState().config.carcassMaterial).toBe('plywood-18');
  });

  it('shows weight guidance for heavy material on a large cabinet', () => {
    const config = { ...DEFAULT_CONFIG, width: 1200, height: 2000, carcassMaterial: 'mdf-18' };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Large cabinet', config }] });

    render(<MaterialSelector />);

    expect(screen.getAllByRole('note').some((note) => note.textContent?.includes('Weight'))).toBe(true);
    const weightNote = screen.getAllByRole('note').find((note) => note.textContent?.includes('Weight'));
    expect(weightNote).toBeDefined();
    expect(within(weightNote!).getByRole('button')).toBeInTheDocument();
  });

  it('switches to a lighter material from a weight recommendation', async () => {
    const user = userEvent.setup();
    const config = { ...DEFAULT_CONFIG, width: 1200, height: 2000, carcassMaterial: 'mdf-18' };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Large cabinet', config }] });
    render(<MaterialSelector />);
    const weightNote = screen.getAllByRole('note').find((note) => note.textContent?.includes('Weight'));
    expect(weightNote).toBeDefined();

    await user.click(within(weightNote!).getByRole('button'));

    expect(useCabinetStore.getState().config.carcassMaterial).not.toBe('mdf-18');
  });

  it('shows cost guidance for an expensive panel on a narrow cabinet', () => {
    const config = { ...DEFAULT_CONFIG, width: 600, carcassMaterial: 'plywood-18' };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Narrow cabinet', config }] });

    render(<MaterialSelector />);

    expect(screen.getByRole('note')).toHaveTextContent('Cost');
    expect(screen.getByRole('button', { name: /Switch to/ })).toBeInTheDocument();
  });

  it('switches to the suggested cheaper panel from a cost note', async () => {
    const user = userEvent.setup();
    const config = { ...DEFAULT_CONFIG, width: 600, carcassMaterial: 'plywood-18' };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Narrow cabinet', config }] });
    render(<MaterialSelector />);
    await user.click(screen.getByRole('button', { name: /Switch to OSB 18 mm/ }));

    expect(useCabinetStore.getState().config.carcassMaterial).toBe('osb-18');
  });

  it('offers a cheaper OSB alternative for narrow plywood cabinets', () => {
    const config = { ...DEFAULT_CONFIG, width: 600, carcassMaterial: 'plywood-18' };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Narrow cabinet', config }] });

    render(<MaterialSelector />);

    expect(screen.getByRole('note')).toHaveTextContent('Cost');
    expect(screen.getByRole('button', { name: /Switch to OSB 18 mm/ })).toBeInTheDocument();
  });

  it('omits substitution notes for an unknown material key without crashing', () => {
    const config = { ...DEFAULT_CONFIG, carcassMaterial: 'unknown-panel-key' };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Cabinet 1', config }] });

    render(<MaterialSelector />);

    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /carcass/i })).toBeInTheDocument();
  });

  it('shows the apply-to-all action for multi-cabinet projects', () => {
    const first = { ...DEFAULT_CONFIG, carcassMaterial: 'plywood-17' };
    const second = { ...DEFAULT_CONFIG, carcassMaterial: 'melamine-18' };
    useCabinetStore.setState({
      cabinets: [
        { name: 'First', config: first },
        { name: 'Second', config: second },
      ],
    });

    render(<MaterialSelector />);

    expect(screen.getAllByRole('button', { name: 'Apply to all cabinets' })).toHaveLength(2);
  });

  it('applies the selected carcass material across every cabinet', async () => {
    const user = userEvent.setup();
    const first = { ...DEFAULT_CONFIG, carcassMaterial: 'plywood-17' };
    const second = { ...DEFAULT_CONFIG, carcassMaterial: 'melamine-18' };
    useCabinetStore.setState({
      config: first,
      activeCabinetIndex: 0,
      cabinets: [
        { name: 'First', config: first },
        { name: 'Second', config: second },
      ],
    });
    render(<MaterialSelector />);

    await user.selectOptions(screen.getByRole('combobox', { name: /carcass/i }), 'mdf-18');
    await user.click(screen.getAllByRole('button', { name: 'Apply to all cabinets' })[0]!);

    expect(useCabinetStore.getState().cabinets.map((cabinet) => cabinet.config.carcassMaterial)).toEqual([
      'mdf-18',
      'mdf-18',
    ]);
    expect(useToastStore.getState().toasts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'Material applied to all cabinets', type: 'success' }),
      ]),
    );
  });

  it('reports when all carcass materials already match the selected material', async () => {
    const user = userEvent.setup();
    const config = { ...DEFAULT_CONFIG, carcassMaterial: 'plywood-17' };
    useCabinetStore.setState({
      config,
      cabinets: [
        { name: 'First', config },
        { name: 'Second', config },
      ],
    });
    render(<MaterialSelector />);

    await user.click(screen.getAllByRole('button', { name: 'Apply to all cabinets' })[0]!);

    expect(useToastStore.getState().toasts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'All cabinets already use this material', type: 'info' }),
      ]),
    );
  });

  it('applies the selected back material across cabinets with different backs', async () => {
    const user = userEvent.setup();
    const first = { ...DEFAULT_CONFIG, backPanelMaterial: 'mdf-6' };
    const second = { ...DEFAULT_CONFIG, backPanelMaterial: 'plywood-4' };
    useCabinetStore.setState({
      config: first,
      activeCabinetIndex: 0,
      cabinets: [
        { name: 'First', config: first },
        { name: 'Second', config: second },
      ],
    });
    render(<MaterialSelector />);

    await user.selectOptions(screen.getByRole('combobox', { name: /back panel material/i }), 'plywood-4');
    await user.click(screen.getAllByRole('button', { name: 'Apply to all cabinets' })[1]!);

    expect(useCabinetStore.getState().cabinets.map((cabinet) => cabinet.config.backPanelMaterial)).toEqual([
      'plywood-4',
      'plywood-4',
    ]);
  });

  it('reports when all back materials already match the selected material', async () => {
    const user = userEvent.setup();
    const config = { ...DEFAULT_CONFIG, backPanelMaterial: 'plywood-4' };
    useCabinetStore.setState({
      config,
      cabinets: [
        { name: 'First', config },
        { name: 'Second', config },
      ],
    });
    render(<MaterialSelector />);

    await user.click(screen.getAllByRole('button', { name: 'Apply to all cabinets' })[1]!);

    expect(useToastStore.getState().toasts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'All cabinets already use this material', type: 'info' }),
      ]),
    );
  });

  it('hides the back-material bulk action when the back panel is excluded', () => {
    const config = { ...DEFAULT_CONFIG, hasBack: false };
    useCabinetStore.setState({
      config,
      cabinets: [
        { name: 'First', config },
        { name: 'Second', config },
      ],
    });

    render(<MaterialSelector />);

    expect(screen.getAllByRole('button', { name: 'Apply to all cabinets' })).toHaveLength(1);
  });

  it('hides bulk replacement controls for a single-cabinet project', () => {
    render(<MaterialSelector />);

    expect(screen.queryByRole('button', { name: 'Apply to all cabinets' })).not.toBeInTheDocument();
  });

  it('does not offer cost-saving substitutions that are unsafe for a wide span', () => {
    const config = { ...DEFAULT_CONFIG, width: 1000, carcassMaterial: 'chipboard-18' };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Wide cabinet', config }] });

    render(<MaterialSelector />);

    expect(screen.getAllByRole('note').every((note) => !note.textContent?.includes('Cost'))).toBe(true);
  });

  it('includes cheaper custom panels in cost recommendations', () => {
    const budgetPanel = {
      ...customPanel,
      key: 'custom-budget-panel',
      name: { en: 'Custom Budget Panel', he: 'Custom Budget Panel' },
      pricePerSheet: 1,
    };
    const config = { ...DEFAULT_CONFIG, width: 600, carcassMaterial: 'plywood-18' };
    useCustomMaterialsStore.setState({ materials: [budgetPanel] });
    useCabinetStore.setState({ config, cabinets: [{ name: 'Narrow cabinet', config }] });
    render(<MaterialSelector />);

    expect(screen.getByRole('note')).toHaveTextContent('Custom Budget Panel saves');
  });

  it('preserves unrelated cabinet settings during bulk carcass replacement', async () => {
    const user = userEvent.setup();
    const first = { ...DEFAULT_CONFIG, carcassMaterial: 'plywood-17', backPanelMaterial: 'mdf-3', width: 720 };
    const second = { ...DEFAULT_CONFIG, carcassMaterial: 'melamine-18', backPanelMaterial: 'plywood-4', width: 840 };
    useCabinetStore.setState({
      config: first,
      activeCabinetIndex: 0,
      cabinets: [
        { name: 'First', config: first },
        { name: 'Second', config: second },
      ],
    });
    render(<MaterialSelector />);

    await user.selectOptions(screen.getByRole('combobox', { name: /carcass/i }), 'mdf-18');
    await user.click(screen.getAllByRole('button', { name: 'Apply to all cabinets' })[0]!);

    expect(
      useCabinetStore
        .getState()
        .cabinets.map(({ config: cabinetConfig }) => [
          cabinetConfig.carcassMaterial,
          cabinetConfig.backPanelMaterial,
          cabinetConfig.width,
        ]),
    ).toEqual([
      ['mdf-18', 'mdf-3', 720],
      ['mdf-18', 'plywood-4', 840],
    ]);
  });
});
