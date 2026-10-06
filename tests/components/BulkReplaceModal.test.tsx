import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MATERIALS, DEFAULT_CONFIG } from '../../src/engine/materials';
import { BulkReplaceModal } from '../../src/components/optimizer/BulkReplaceModal';
import { useCabinetStore } from '../../src/store/cabinet-store';

let originalShowModal: PropertyDescriptor | undefined;
let showModalMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  showModalMock = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: showModalMock,
  });
});

afterEach(() => {
  if (originalShowModal) {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
  } else {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  }
});

describe('BulkReplaceModal', () => {
  it('opens a native dialog and restores focus to its trigger when closed', async () => {
    const user = userEvent.setup();

    function ModalHarness() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <button onClick={() => setIsOpen(true)}>Open bulk replace</button>
          {isOpen && <BulkReplaceModal onClose={() => setIsOpen(false)} />}
        </>
      );
    }

    render(<ModalHarness />);
    const trigger = screen.getByRole('button', { name: 'Open bulk replace' });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Bulk Material Replace' });
    expect(dialog.tagName).toBe('DIALOG');
    expect(showModalMock).toHaveBeenCalledOnce();

    await user.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes when the native dialog receives a cancel event', () => {
    const onClose = vi.fn();
    render(<BulkReplaceModal onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'Bulk Material Replace' });
    const cancelEvent = new Event('cancel', { cancelable: true });

    fireEvent(dialog, cancelEvent);

    expect(onClose).toHaveBeenCalledOnce();
    expect(cancelEvent.defaultPrevented).toBe(true);
  });

  it('closes when the native dialog backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<BulkReplaceModal onClose={onClose} />);
    const backdrop = screen.getAllByRole('button', { name: 'Close' })[0];

    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledOnce();
  });

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
