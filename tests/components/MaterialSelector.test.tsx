import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { MaterialSelector } from '../../src/components/configurator/MaterialSelector';
import { useCabinetStore } from '../../src/store/cabinet-store';

describe('MaterialSelector', () => {
  beforeEach(() => {
    const config = { ...DEFAULT_CONFIG };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Cabinet 1', config }], activeCabinetIndex: 0 });
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
});
