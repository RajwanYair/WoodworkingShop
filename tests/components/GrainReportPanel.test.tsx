import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GrainReportPanel } from '../../src/features/optimizer/GrainReportPanel';
import type { Part } from '../../src/engine/core/types';
import { useCabinetStore } from '../../src/store/cabinet-store';

let originalParts: Part[];
let originalActiveTab = useCabinetStore.getState().activeTab;

beforeEach(() => {
  originalParts = useCabinetStore.getState().allParts;
  originalActiveTab = useCabinetStore.getState().activeTab;
});

afterEach(() => {
  act(() => useCabinetStore.setState({ allParts: originalParts, activeTab: originalActiveTab }));
});

describe('GrainReportPanel', () => {
  it('shows grain constraints and expands grouped part details', async () => {
    const user = userEvent.setup();
    const part: Part = {
      id: 'P-grain',
      name: { en: 'Side panel', he: 'צד' },
      qty: 2,
      material: 'plywood-18',
      thickness: 18,
      length: 600,
      width: 400,
      edgeBanding: { en: 'none', he: 'ללא' },
      rotationLocked: true,
    };
    useCabinetStore.setState({ allParts: [part] });
    render(<GrainReportPanel />);

    const toggle = screen.getByRole('button', { name: /Grain Direction Report/ });
    expect(toggle).toHaveTextContent('2');
    await user.click(toggle);

    expect(screen.getByText('2 of 2 part instances have grain direction constraints.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '100%' })).toBeInTheDocument();
    const groupToggle = screen.getByRole('button', { name: /2\/2 grain-locked/ });
    await user.click(groupToggle);
    expect(screen.getByText('Side panel')).toBeInTheDocument();
    expect(screen.getByText('grain')).toBeInTheDocument();
  });

  it('routes from the empty state to cabinet configuration', async () => {
    const user = userEvent.setup();
    useCabinetStore.setState({ allParts: [], activeTab: 'preview' });
    render(<GrainReportPanel />);

    await user.click(screen.getByRole('button', { name: /Grain Direction Report/ }));
    await user.click(screen.getByRole('button', { name: 'No parts — configure a cabinet first.' }));

    expect(useCabinetStore.getState().activeTab).toBe('configurator');
  });
});
