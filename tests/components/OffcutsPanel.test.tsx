import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { OffcutEntry } from '../../src/engine/types';
import { OffcutsPanel } from '../../src/components/optimizer/optimizer-offcuts-panel';
import { computeOffcuts } from '../../src/components/optimizer/compute-offcuts';
import { makeCutSheet } from '../helpers';

const labels: Record<string, string> = {
  'optimizer.offcuts': 'Offcuts',
  'optimizer.offcutsDesc': 'Free material left on each sheet',
  'optimizer.saveToOffcutCatalog': 'Save to offcut catalog',
  'optimizer.offcutCatalog': 'Saved offcuts',
  'optimizer.deleteOffcut': 'Delete offcut',
};

const translate = (key: string) => labels[key] ?? key;

describe('OffcutsPanel', () => {
  it('saves computed offcuts to the catalog and deletes a saved entry', async () => {
    const user = userEvent.setup();
    const sheet = makeCutSheet();
    const onSaveOffcut = vi.fn<(entry: OffcutEntry) => void>();
    const onDeleteOffcut = vi.fn<(id: string) => void>();
    const expectedOffcut = computeOffcuts(sheet)[0];
    const savedOffcut: OffcutEntry = {
      id: 'offcut-1',
      material: sheet.material,
      thickness: sheet.thickness,
      width: 1700,
      length: 500,
      addedAt: 0,
    };

    const { rerender } = render(
      <OffcutsPanel
        sheets={[sheet]}
        offcutCatalog={[]}
        onSaveOffcut={onSaveOffcut}
        onDeleteOffcut={onDeleteOffcut}
        locale="en-US"
        t={translate}
      />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Save to offcut catalog' })[0]);
    expect(onSaveOffcut).toHaveBeenCalledWith(
      expect.objectContaining({
        material: sheet.material,
        thickness: sheet.thickness,
        width: Math.round(expectedOffcut.w),
        length: Math.round(expectedOffcut.h),
      }),
    );

    rerender(
      <OffcutsPanel
        sheets={[sheet]}
        offcutCatalog={[savedOffcut]}
        onSaveOffcut={onSaveOffcut}
        onDeleteOffcut={onDeleteOffcut}
        locale="en-US"
        t={translate}
      />,
    );
    expect(screen.getByText(/melamine-18 18mm — 1,700×500 mm/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete offcut' }));
    expect(onDeleteOffcut).toHaveBeenCalledWith('offcut-1');
  });
});
