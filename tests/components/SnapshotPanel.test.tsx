import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { SnapshotPanel } from '../../src/components/layout/SnapshotPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';
import type { ProjectSnapshot } from '../../src/store/cabinet-store';

const showModalDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');

describe('SnapshotPanel', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    });
    const cabinets = [{ name: 'Cabinet 1', config: { ...DEFAULT_CONFIG } }];
    const snapshots: ProjectSnapshot[] = [
      {
        id: 'before',
        name: 'Before dimensions',
        cabinets: [{ name: 'Cabinet 1', config: { ...DEFAULT_CONFIG, width: 777 } }],
        timestamp: '2026-09-29T10:00:00.000Z',
      },
      {
        id: 'after',
        name: 'After dimensions',
        cabinets: [{ name: 'Cabinet 1', config: { ...DEFAULT_CONFIG, width: 888 } }],
        timestamp: '2026-09-29T11:00:00.000Z',
      },
    ];
    useCabinetStore.setState({ cabinets, config: cabinets[0].config, activeCabinetIndex: 0, snapshots });
  });

  afterEach(() => {
    if (showModalDescriptor) {
      Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModalDescriptor);
    } else {
      Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    }
  });

  it('opens a snapshot comparison, displays the changed dimension, and closes it', async () => {
    const user = userEvent.setup();
    render(<SnapshotPanel />);

    await user.click(screen.getByRole('button', { name: 'Compare Snapshots' }));
    const dialog = screen.getByRole('dialog', { name: 'Compare Snapshots' });

    expect(dialog).toHaveTextContent('Before dimensions');
    expect(dialog).toHaveTextContent('After dimensions');
    expect(dialog).toHaveTextContent('777');
    expect(dialog).toHaveTextContent('888');
    expect(dialog).toHaveAttribute('open');

    await user.click(within(dialog).getAllByRole('button', { name: 'Close' })[0]);
    expect(screen.queryByRole('dialog', { name: 'Compare Snapshots' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compare Snapshots' })).toHaveFocus();
  });

  it('closes the native dialog when a cancel event is dispatched', async () => {
    const user = userEvent.setup();
    render(<SnapshotPanel />);

    await user.click(screen.getByRole('button', { name: 'Compare Snapshots' }));
    const dialog = screen.getByRole('dialog', { name: 'Compare Snapshots' });
    const cancelEvent = new Event('cancel', { cancelable: true });

    let wasCancelled = true;
    act(() => {
      wasCancelled = dialog.dispatchEvent(cancelEvent);
    });

    expect(wasCancelled).toBe(false);
    expect(screen.queryByRole('dialog', { name: 'Compare Snapshots' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compare Snapshots' })).toHaveFocus();
  });

  it('saves a named snapshot, restores its configuration, and deletes a snapshot', async () => {
    const user = userEvent.setup();
    render(<SnapshotPanel />);

    await user.click(screen.getByRole('button', { name: /Project Snapshots/ }));
    await user.type(screen.getByRole('textbox', { name: 'Snapshot name…' }), 'Current layout');
    await user.click(screen.getByRole('button', { name: 'Save Snapshot' }));

    expect(useCabinetStore.getState().snapshots).toHaveLength(3);
    expect(screen.getByText('Current layout')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Restore: Before dimensions' }));
    expect(useCabinetStore.getState().config.width).toBe(777);

    await user.click(screen.getByRole('button', { name: 'Delete snapshot: After dimensions' }));
    expect(useCabinetStore.getState().snapshots.map((snapshot) => snapshot.name)).toEqual([
      'Before dimensions',
      'Current layout',
    ]);
  });

  it('shows the empty state and hides comparison when no snapshots exist', async () => {
    useCabinetStore.setState({ snapshots: [] });
    const user = userEvent.setup();
    render(<SnapshotPanel />);

    await user.click(screen.getByRole('button', { name: 'Project Snapshots' }));

    expect(screen.getByText('No snapshots saved yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Compare Snapshots' })).not.toBeInTheDocument();
  });
});
