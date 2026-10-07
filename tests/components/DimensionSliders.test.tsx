import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { DimensionSliders } from '../../src/components/configurator/DimensionSliders';
import { useCabinetStore } from '../../src/store/cabinet-store';

describe('DimensionSliders', () => {
  beforeEach(() => {
    const config = { ...DEFAULT_CONFIG };
    useCabinetStore.setState({
      config,
      cabinets: [{ name: 'Cabinet 1', config }],
      activeCabinetIndex: 0,
      units: 'metric',
    });
  });

  it('converts display units without changing geometry and rejects hard-limit edits', async () => {
    const user = userEvent.setup();
    render(<DimensionSliders />);

    const width = screen.getByRole('spinbutton', { name: 'Width' });
    expect(width).toHaveValue(DEFAULT_CONFIG.width);
    await user.click(screen.getByRole('button', { name: 'mm → in' }));

    expect(useCabinetStore.getState().units).toBe('imperial');
    expect(useCabinetStore.getState().config.width).toBe(DEFAULT_CONFIG.width);
    expect(width).toHaveValue(Number((DEFAULT_CONFIG.width / 25.4).toFixed(2)));

    await user.clear(width);
    await user.type(width, '99999');
    expect(width).toHaveAttribute('aria-invalid', 'true');
    await user.tab();

    expect(useCabinetStore.getState().config.width).toBe(DEFAULT_CONFIG.width);
    expect(width).toHaveValue(Number((DEFAULT_CONFIG.width / 25.4).toFixed(2)));
  });

  it.each(['mouse', 'touch'])('keeps the standard slider step for %s input', (pointerType) => {
    render(<DimensionSliders />);
    const slider = screen.getByRole('slider', { name: 'Width (mm)' });

    fireEvent.pointerDown(slider, { pointerType: 'pen' });
    fireEvent.pointerDown(slider, { pointerType });

    expect(slider).toHaveAttribute('step', '10');
  });

  it('uses 1mm slider steps for pen input and retains the precise value', () => {
    render(<DimensionSliders />);
    const slider = screen.getByRole('slider', { name: 'Width (mm)' });

    fireEvent.pointerDown(slider, { pointerType: 'pen' });
    fireEvent.change(slider, { target: { value: '601' } });

    expect(slider).toHaveAttribute('step', '1');
    expect(useCabinetStore.getState().config.width).toBe(601);
  });
});
