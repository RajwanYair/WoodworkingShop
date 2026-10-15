import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PartLabelSheet } from '../../src/features/optimizer/PartLabelSheet';
import type { Part } from '../../src/engine/core/types';
import { useCabinetStore } from '../../src/store/cabinet-store';

let originalParts: Part[];
let originalActiveTab = useCabinetStore.getState().activeTab;

beforeEach(() => {
  originalParts = useCabinetStore.getState().allParts;
  originalActiveTab = useCabinetStore.getState().activeTab;
});

afterEach(() => {
  vi.restoreAllMocks();
  useCabinetStore.setState({ allParts: originalParts, activeTab: originalActiveTab });
});

describe('PartLabelSheet', () => {
  it('expands quantities into individual labels and prints the label sheet', async () => {
    const user = userEvent.setup();
    const part: Part = {
      id: 'P-side',
      name: { en: 'Side panel', he: 'צד' },
      qty: 2,
      material: 'plywood-18',
      thickness: 18,
      length: 600,
      width: 400,
      edgeBanding: { en: 'none', he: 'ללא' },
    };
    const write = vi.spyOn(document, 'write').mockImplementation(() => {});
    vi.spyOn(document, 'close').mockImplementation(() => {});
    vi.spyOn(window, 'open').mockReturnValue(window);
    vi.spyOn(window, 'focus').mockImplementation(() => {});
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    useCabinetStore.setState({ allParts: [part] });
    render(<PartLabelSheet />);

    await user.click(screen.getByRole('button', { name: /Part Label Sheet/ }));
    expect(screen.getByText('P-001')).toBeInTheDocument();
    expect(screen.getByText('×2')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Expand multi-qty parts (one label per piece)' }));
    expect(screen.getByText('P-001a')).toBeInTheDocument();
    expect(screen.getByText('P-001b')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Print Labels' }));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('P-001a'));
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
  });

  it('routes from the empty state to cabinet configuration', async () => {
    const user = userEvent.setup();
    useCabinetStore.setState({ allParts: [], activeTab: 'preview' });
    render(<PartLabelSheet />);

    await user.click(screen.getByRole('button', { name: /Part Label Sheet/ }));
    await user.click(screen.getByRole('button', { name: 'No parts — configure a cabinet first.' }));

    expect(useCabinetStore.getState().activeTab).toBe('configurator');
  });
});
