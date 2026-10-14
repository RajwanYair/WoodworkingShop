import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials/materials';
import { DoorConfig } from '../../src/components/configurator/DoorConfig';
import { useCabinetStore } from '../../src/store/cabinet-store';

describe('DoorConfig', () => {
  beforeEach(() => {
    const config = { ...DEFAULT_CONFIG };
    useCabinetStore.setState({
      config,
      cabinets: [{ name: 'Cabinet 1', config }],
      activeCabinetIndex: 0,
      _past: [],
      _future: [],
      canUndo: false,
      canRedo: false,
    });
  });

  it('applies door style and handle choices to configuration and generated hardware', async () => {
    const user = userEvent.setup();
    render(<DoorConfig />);

    const handleStyle = screen.getByRole('combobox', { name: /handles/i });
    await user.selectOptions(handleStyle, 'cup');
    expect(useCabinetStore.getState().config.handleStyle).toBe('cup');

    await user.selectOptions(screen.getByRole('combobox', { name: /door style/i }), 'none');

    expect(useCabinetStore.getState().config.doorStyle).toBe('none');
    expect(useCabinetStore.getState().parts.some((part) => part.name.en === 'Door')).toBe(false);
    expect(useCabinetStore.getState().hardware.some((item) => item.id === 'H01')).toBe(false);
  });

  it('groups repeated range updates into one undo step', () => {
    render(<DoorConfig />);
    const slider = screen.getByRole('slider', { name: /door reveal/i });

    fireEvent.pointerDown(slider, { pointerType: 'mouse' });
    fireEvent.change(slider, { target: { value: '3' } });
    fireEvent.change(slider, { target: { value: '4' } });
    fireEvent.pointerUp(slider, { pointerType: 'mouse' });

    expect(useCabinetStore.getState().config.doorReveal).toBe(4);
    expect(useCabinetStore.getState()._past).toHaveLength(1);
    useCabinetStore.getState().undo();
    expect(useCabinetStore.getState().config.doorReveal).toBe(DEFAULT_CONFIG.doorReveal);
  });
});
