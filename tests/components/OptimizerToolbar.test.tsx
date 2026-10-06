import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import i18n from '../../src/i18n';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { OptimizerToolbar } from '../../src/components/optimizer/OptimizerToolbar';
import type { OptimizerToolbarProps } from '../../src/components/optimizer/OptimizerToolbar';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { makeCutSheet } from '../helpers';

function createToolbarProps(): OptimizerToolbarProps {
  return {
    sheets: [makeCutSheet()],
    totalSheets: 1,
    overallYield: 95,
    totalWaste: 100_000,
    grainConflictCount: 0,
    partFilter: '',
    setPartFilter: vi.fn(),
    showPartNames: false,
    setShowPartNames: vi.fn(),
    showGrainHatch: false,
    setShowGrainHatch: vi.fn(),
    bomExporting: false,
    dxfExporting: false,
    handleBomExportWorker: vi.fn(),
    handleDxfExportWorker: vi.fn(),
    filePrefix: 'cabinet',
    lang: 'en',
    setShowBulkReplace: vi.fn(),
    t: i18n.t,
  };
}

function StatefulToolbar({ initialPartFilter = '' }: { initialPartFilter?: string } = {}) {
  const [partFilter, setPartFilter] = useState(initialPartFilter);
  const [showPartNames, setShowPartNames] = useState(false);
  const [showGrainHatch, setShowGrainHatch] = useState(false);
  return (
    <OptimizerToolbar
      {...createToolbarProps()}
      partFilter={partFilter}
      setPartFilter={setPartFilter}
      showPartNames={showPartNames}
      setShowPartNames={setShowPartNames}
      showGrainHatch={showGrainHatch}
      setShowGrainHatch={setShowGrainHatch}
    />
  );
}

describe('OptimizerToolbar', () => {
  it('formats summary counts and waste area with the active locale', () => {
    render(<OptimizerToolbar {...createToolbarProps()} totalSheets={1234} totalWaste={12_345_000} />);

    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('12.35 m²')).toBeInTheDocument();
  });

  it('clamps saw kerf and updates cutting settings from accessible controls', async () => {
    const user = userEvent.setup();
    useCabinetStore.setState({
      config: { ...DEFAULT_CONFIG, cutMode: 'freeform' },
      sawKerf: 3,
      autoCoNest: false,
    });
    render(<OptimizerToolbar {...createToolbarProps()} />);

    const sawKerf = screen.getByRole('spinbutton', { name: 'Saw kerf' });
    await user.clear(sawKerf);
    await user.type(sawKerf, '10');
    expect(useCabinetStore.getState().sawKerf).toBe(8);

    await user.click(screen.getByRole('checkbox', { name: 'Guillotine cuts (panel saw compatible)' }));
    await user.click(screen.getByRole('checkbox', { name: 'Auto co-nest materials' }));

    expect(useCabinetStore.getState().config.cutMode).toBe('guillotine');
    expect(useCabinetStore.getState().autoCoNest).toBe(true);
  });

  it('sends typed part-filter text to its parent', async () => {
    const user = userEvent.setup();
    render(<StatefulToolbar />);

    const filter = screen.getByRole('searchbox', { name: i18n.t('optimizer.filterParts') });
    await user.type(filter, 'shelf');

    expect(filter).toHaveValue('shelf');
  });

  it('clears the active part filter from the clear control', async () => {
    const user = userEvent.setup();
    render(<StatefulToolbar initialPartFilter="shelf" />);

    await user.click(screen.getByRole('button', { name: 'Clear filter' }));

    expect(screen.getByRole('searchbox', { name: i18n.t('optimizer.filterParts') })).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Clear filter' })).not.toBeInTheDocument();
  });

  it('toggles part labels and grain hatching through their pressed states', async () => {
    const user = userEvent.setup();
    render(<StatefulToolbar />);
    const labels = screen.getByRole('button', { name: new RegExp(i18n.t('optimizer.labels')) });
    const grain = screen.getByRole('button', { name: new RegExp(i18n.t('optimizer.grainHatch')) });

    expect(labels).toHaveAttribute('aria-pressed', 'false');
    expect(grain).toHaveAttribute('aria-pressed', 'false');
    await user.click(labels);
    await user.click(grain);
    expect(labels).toHaveAttribute('aria-pressed', 'true');
    expect(grain).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles the color-blind safe palette in the cabinet store', async () => {
    const user = userEvent.setup();
    useCabinetStore.setState({ colorBlindMode: false });
    render(<OptimizerToolbar {...createToolbarProps()} />);
    const toggle = screen.getByRole('button', { name: 'CB' });

    await user.click(toggle);
    expect(useCabinetStore.getState().colorBlindMode).toBe(true);
    await user.click(toggle);
    expect(useCabinetStore.getState().colorBlindMode).toBe(false);
  });

  it('invokes both worker export actions when their controls are activated', async () => {
    const user = userEvent.setup();
    const props = createToolbarProps();
    render(<OptimizerToolbar {...props} />);

    await user.click(screen.getByRole('button', { name: 'DXF' }));
    await user.click(screen.getByRole('button', { name: i18n.t('optimizer.exportBom') }));

    expect(props.handleDxfExportWorker).toHaveBeenCalledOnce();
    expect(props.handleBomExportWorker).toHaveBeenCalledOnce();
  });

  it('disables the worker export controls and announces their busy state', () => {
    render(<OptimizerToolbar {...createToolbarProps()} bomExporting dxfExporting />);

    const dxfButton = screen.getByRole('button', { name: 'DXF' });
    expect(dxfButton).toBeDisabled();
    expect(dxfButton).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: i18n.t('optimizer.exportBom') })).toBeDisabled();
  });
});
