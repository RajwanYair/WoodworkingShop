import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { generateParts } from '../../src/engine/parts';
import { CutChecklistPanel } from '../../src/components/optimizer/CutChecklistPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';

describe('CutChecklistPanel', () => {
  it('tracks a cut part in progress and resets the checklist', async () => {
    const user = userEvent.setup();
    const parts = generateParts(DEFAULT_CONFIG);
    const firstPart = parts[0];
    useCabinetStore.setState({ allParts: parts, checkedPartIds: [] });
    render(<CutChecklistPanel />);

    await user.click(screen.getByRole('button', { name: /Part Cutting Checklist/ }));
    const partCheckbox = screen.getByRole('checkbox', {
      name: `${firstPart.name.en} — ${firstPart.width}×${firstPart.length} mm`,
    });
    await user.click(partCheckbox);

    expect(useCabinetStore.getState().checkedPartIds).toContain(firstPart.id);
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      String(Math.round((1 / parts.length) * 100)),
    );

    await user.click(screen.getByRole('button', { name: 'Reset checklist' }));
    expect(useCabinetStore.getState().checkedPartIds).toEqual([]);
  });
});
