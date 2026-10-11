import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { CustomMaterialEditor } from '../../src/components/configurator/CustomMaterialEditor';
import { useCustomMaterialsStore } from '../../src/store/custom-materials-store';

describe('CustomMaterialEditor', () => {
  beforeEach(() => {
    useCustomMaterialsStore.setState({ materials: [] });
  });

  it('adds, edits, and removes a custom sheet material', async () => {
    const user = userEvent.setup();
    render(<CustomMaterialEditor />);

    await user.click(screen.getByRole('button', { name: /add custom material/i }));
    await user.type(screen.getByLabelText('Name'), 'Oak Veneer Core');
    const thickness = screen.getByRole('spinbutton', { name: 'Thickness (mm)' });
    await user.clear(thickness);
    await user.type(thickness, '18');
    await user.click(screen.getByRole('button', { name: 'Add Material' }));

    const added = useCustomMaterialsStore.getState().materials[0];
    expect(added).toMatchObject({ name: { en: 'Oak Veneer Core' }, thickness: 18, category: 'panel' });
    expect(screen.getByText('Oak Veneer Core (18 mm, ₪100)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add custom material/i }));
    await user.click(screen.getByRole('button', { name: 'Edit Oak Veneer Core' }));
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Oak Plywood');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(useCustomMaterialsStore.getState().materials[0].name.en).toBe('Oak Plywood');
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(useCustomMaterialsStore.getState().materials).toHaveLength(0);
    expect(screen.queryByText('Oak Plywood (18 mm, ₪100)')).not.toBeInTheDocument();
  });
});
