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
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssemblyGuide } from '../../src/components/assembly/AssemblyGuide';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { generateAssemblySteps } from '../../src/engine/assembly';
import { generateParts } from '../../src/engine/parts';
import { generateHardware } from '../../src/engine/hardware';

function seedStore() {
  const config = { ...DEFAULT_CONFIG };
  const parts = generateParts(config);
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

// ── Sprint 78 — Download checklist button ────────────────────────────────────
describe('AssemblyGuide — download checklist (Sprint 78)', () => {
  beforeEach(() => {
    seedStore();
  });

  it('renders the "Download checklist" button', () => {
    render(<AssemblyGuide />);
    expect(screen.getByRole('button', { name: /download checklist/i })).toBeInTheDocument();
  });

  it('clicking Download checklist calls triggerDownload with .txt content', () => {
    const mockAnchor = document.createElement('a');
    vi.spyOn(mockAnchor, 'click').mockImplementation(() => {});
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor;
      return origCreate(tag as 'a');
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<AssemblyGuide />);
    fireEvent.click(screen.getByRole('button', { name: /download checklist/i }));

    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockAnchor.download).toMatch(/\.txt$/);
    vi.restoreAllMocks();
  });

  it('download filename is assembly-checklist.txt', () => {
    const mockAnchor = document.createElement('a');
    vi.spyOn(mockAnchor, 'click').mockImplementation(() => {});
    const origCreate2 = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor;
      return origCreate2(tag as 'a');
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<AssemblyGuide />);
    fireEvent.click(screen.getByRole('button', { name: /download checklist/i }));

    expect(mockAnchor.download).toBe('assembly-checklist.txt');
    vi.restoreAllMocks();
  });
});

// ── Sprint 84 — Show / hide tips toggle ──────────────────────────────────────
describe('AssemblyGuide — show/hide tips toggle (Sprint 84)', () => {
  beforeEach(() => {
    seedStore();
  });

  it('renders the "Hide tips" button in all-steps view by default', () => {
    render(<AssemblyGuide />);
    expect(screen.getByRole('button', { name: /hide tips/i })).toBeInTheDocument();
  });

  it('tips are visible before toggling', () => {
    render(<AssemblyGuide />);
    // The default config generates steps, some of which have tips rendered in amber blocks.
    // At least one step should contain a tip in the seeded DEFAULT_CONFIG.
    const { assemblySteps } = useCabinetStore.getState();
    const stepsWithTip = assemblySteps.filter((s) => s.tip);
    if (stepsWithTip.length === 0) return; // no tips in this config — skip
    // Amber tip containers use the lightbulb icon aria-hidden, so check text
    const tipText = stepsWithTip[0].tip!['en'];
    expect(screen.getByText(tipText)).toBeInTheDocument();
  });

  it('clicking the toggle button hides all tips', () => {
    render(<AssemblyGuide />);
    const { assemblySteps } = useCabinetStore.getState();
    const stepsWithTip = assemblySteps.filter((s) => s.tip);
    if (stepsWithTip.length === 0) return;
    const tipText = stepsWithTip[0].tip!['en'];
    const toggleBtn = screen.getByRole('button', { name: /hide tips/i });
    fireEvent.click(toggleBtn);
    expect(screen.queryByText(tipText)).not.toBeInTheDocument();
  });

  it('button label toggles to "Show tips" after hiding', () => {
    render(<AssemblyGuide />);
    const toggleBtn = screen.getByRole('button', { name: /hide tips/i });
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('button', { name: /show tips/i })).toBeInTheDocument();
  });
});
