import { render, screen } from '@testing-library/react';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { SnapshotPanel } from '../../src/components/layout/SnapshotPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';
import type { ProjectSnapshot } from '../../src/store/cabinet-store';

describe('SnapshotPanel', () => {
  beforeEach(() => {
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

  it('opens a snapshot comparison, displays the changed dimension, and closes it', async () => {
    const user = userEvent.setup();
    render(<SnapshotPanel />);

    await user.click(screen.getByRole('button', { name: 'Compare Snapshots' }));
    const dialog = screen.getByRole('dialog', { name: 'Compare Snapshots' });

    expect(dialog).toHaveTextContent('Before dimensions');
    expect(dialog).toHaveTextContent('After dimensions');
    expect(dialog).toHaveTextContent('777');
    expect(dialog).toHaveTextContent('888');

    await user.click(within(dialog).getAllByRole('button', { name: 'Close' })[0]);
    expect(screen.queryByRole('dialog', { name: 'Compare Snapshots' })).not.toBeInTheDocument();
  });
});
