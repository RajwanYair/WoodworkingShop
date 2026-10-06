import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from '../../src/components/layout/Sidebar';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { generateHardware } from '../../src/engine/hardware';
import { generateParts } from '../../src/engine/parts';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { makeOptimizationResult } from '../helpers';

let originalShowModal: PropertyDescriptor | undefined;
let showModalMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  showModalMock = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
    within(this).getAllByRole('button', { name: 'Close panel' })[1]?.focus();
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: showModalMock,
  });

  useCabinetStore.setState({
    parts: generateParts(DEFAULT_CONFIG).slice(0, 2),
    hardware: generateHardware(DEFAULT_CONFIG).slice(0, 1),
    optimization: makeOptimizationResult({ totalSheets: 4, overallYield: 82 }),
  });
});

afterEach(() => {
  if (originalShowModal) {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
  } else {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  }
});

describe('Sidebar', () => {
  it('opens a native mobile dialog and restores focus to its trigger when cancelled', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    const trigger = screen.getByRole('button', { name: 'Toggle summary panel' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Cabinet summary' });

    expect(dialog.tagName).toBe('DIALOG');
    expect(showModalMock).toHaveBeenCalledOnce();

    fireEvent(dialog, new Event('cancel', { cancelable: true }));

    expect(screen.queryByRole('dialog', { name: 'Cabinet summary' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('shows current parts, hardware, sheet, and yield totals in the mobile summary', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    await user.click(screen.getByRole('button', { name: 'Toggle summary panel' }));
    const dialog = screen.getByRole('dialog', { name: 'Cabinet summary' });

    expect(dialog).toHaveTextContent('Parts2');
    expect(dialog).toHaveTextContent('Hardware items1');
    expect(dialog).toHaveTextContent('Sheets needed4');
    expect(dialog).toHaveTextContent('Yield82%');
  });
});
