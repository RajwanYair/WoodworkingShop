import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MATERIALS, DEFAULT_CONFIG } from '../../src/engine/materials';
import { BulkReplaceModal } from '../../src/components/optimizer/BulkReplaceModal';
import { useCabinetStore } from '../../src/store/cabinet-store';

describe('BulkReplaceModal', () => {
  it('replaces a material across all cabinets and reports completion', async () => {
    const user = userEvent.setup();
    const fromKey = DEFAULT_CONFIG.carcassMaterial;
    const toKey = MATERIALS.find((material) => material.key !== fromKey)?.key;
    if (!toKey) throw new Error('A replacement material is required for this test.');

    useCabinetStore.setState({
      cabinets: [
        { name: 'Base cabinet', config: { ...DEFAULT_CONFIG, carcassMaterial: fromKey } },
        { name: 'Wall cabinet', config: { ...DEFAULT_CONFIG, backPanelMaterial: fromKey } },
      ],
      activeCabinetIndex: 0,
    });
    render(<BulkReplaceModal onClose={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText('Replace'), fromKey);
    await user.selectOptions(screen.getByLabelText('With'), toKey);
    await user.click(screen.getByRole('button', { name: 'Apply to All' }));

    const cabinets = useCabinetStore.getState().cabinets;
    expect(cabinets[0].config.carcassMaterial).toBe(toKey);
    expect(cabinets[1].config.backPanelMaterial).toBe(toKey);
    expect(screen.getByText('Done! Use Ctrl+Z to undo.')).toBeInTheDocument();
  });
});
