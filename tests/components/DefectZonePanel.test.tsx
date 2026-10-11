import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DefectZonePanel } from '../../src/components/optimizer/optimizer-defect-zone-panel';

const labels: Record<string, string> = {
  'optimizer.defectZones': 'Defect zones',
  'optimizer.defectMaterial': 'Material',
  'optimizer.defectAdd': 'Add zone',
};

const translate = (key: string) => labels[key] ?? key;

describe('DefectZonePanel', () => {
  it('requires a material before adding a defect zone and emits the selected dimensions', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <DefectZonePanel
        materials={['plywood-18']}
        defectZones={{}}
        onAdd={onAdd}
        onUpdate={vi.fn()}
        onRemove={vi.fn()}
        t={translate}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Defect zones/ }));
    const addButton = screen.getByRole('button', { name: 'Add zone' });
    expect(addButton).toBeDisabled();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Material' }), 'plywood-18');
    expect(addButton).toBeEnabled();
    await user.clear(screen.getByRole('spinbutton', { name: 'x (mm)' }));
    await user.type(screen.getByRole('spinbutton', { name: 'x (mm)' }), '12');
    await user.click(addButton);

    expect(onAdd).toHaveBeenCalledWith('plywood-18', { x: 12, y: 0, width: 100, length: 100 });
  });
});
