/**
 * Sprint 52 — Assembly step checklist feature tests.
 *
 * Verifies that:
 *  - Each step in "all" view renders a "Mark as done" checkbox.
 *  - Checking a step marks it done (label changes, card visually changes).
 *  - Progress counter appears after the first step is completed.
 *  - "Reset progress" button clears all completions.
 *  - "All steps complete" message appears when every step is checked.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AssemblyGuide } from '../../src/components/assembly/AssemblyGuide';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { generateAssemblySteps } from '../../src/engine/assembly';
import { generateParts } from '../../src/engine/parts';
import { generateHardware } from '../../src/engine/hardware';
import { computeDimensions } from '../../src/engine/dimensions';

function seedStore() {
  const config = { ...DEFAULT_CONFIG };
  const dims = computeDimensions(config);
  const parts = generateParts(config, dims);
  const hardware = generateHardware(config);
  const assemblySteps = generateAssemblySteps(config);
  useCabinetStore.setState({
    config,
    cabinets: [{ name: 'Test Cabinet', config }],
    activeCabinetIndex: 0,
    parts,
    hardware,
    assemblySteps,
  });
}

describe('AssemblyGuide — step checklist (Sprint 52)', () => {
  beforeEach(() => {
    seedStore();
  });

  it('renders "Mark as done" checkboxes for each step in all-steps view', () => {
    render(<AssemblyGuide />);
    // The default view is "all" which shows step cards with checkboxes.
    const checkboxes = screen.getAllByRole('checkbox', { name: /mark as done/i });
    const { assemblySteps } = useCabinetStore.getState();
    expect(checkboxes.length).toBe(assemblySteps.length);
  });

  it('checking a step changes the label to "Done"', () => {
    render(<AssemblyGuide />);
    const checkboxes = screen.getAllByRole('checkbox', { name: /mark as done/i });
    fireEvent.click(checkboxes[0]);
    // After checking, the first checkbox label should say "Done"
    expect(screen.getAllByLabelText(/done/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows progress counter after completing at least one step', () => {
    render(<AssemblyGuide />);
    const checkboxes = screen.getAllByRole('checkbox', { name: /mark as done/i });
    fireEvent.click(checkboxes[0]);
    // "1/N steps completed" text should appear
    expect(screen.getByText(/steps completed/i)).toBeInTheDocument();
  });

  it('"Reset progress" button clears all completed steps', () => {
    render(<AssemblyGuide />);
    const checkboxes = screen.getAllByRole('checkbox', { name: /mark as done/i });
    fireEvent.click(checkboxes[0]);
    // Reset button should appear
    const resetBtn = screen.getByRole('button', { name: /reset progress/i });
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);
    // Progress counter should be gone
    expect(screen.queryByText(/steps completed/i)).not.toBeInTheDocument();
  });

  it('shows completion banner when all steps are checked', () => {
    render(<AssemblyGuide />);
    const checkboxes = screen.getAllByRole('checkbox', { name: /mark as done/i });
    checkboxes.forEach((cb) => fireEvent.click(cb));
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/all steps complete/i)).toBeInTheDocument();
  });
});
