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

describe('OptimizerToolbar', () => {
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
});
