/**
 * Sprint 63 — ValidationPanel one-click Fix button tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationPanel } from '../../src/components/configurator/ValidationPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { validateConfig } from '../../src/engine/validation';
import { cfg } from '../helpers';
import type { CabinetConfig, ValidationIssue } from '../../src/engine/types';

// Fixture — issue that has a field + suggestedValue (Fix button should appear)
const FIXABLE_ISSUE: ValidationIssue = {
  code: 'DEPTH_EXCEEDS_WIDTH',
  severity: 'warning',
  message: { en: 'Depth exceeds width', he: 'העומק גדול מהרוחב' },
  field: 'depth',
  suggestedValue: 600,
};

// Fixture — issue with no field (no Fix button)
const NON_FIXABLE_ISSUE: ValidationIssue = {
  code: 'GENERIC_WARNING',
  severity: 'info',
  message: { en: 'Check your settings', he: 'בדוק הגדרות' },
};

const REMAINING_ISSUE: ValidationIssue = {
  code: 'REMAINING_WARNING',
  severity: 'warning',
  message: { en: 'Another check remains', he: 'בדיקה נוספת נותרה' },
};

const REPAIRS: {
  label: string;
  issueCode: string;
  initial: Partial<CabinetConfig>;
}[] = [
  {
    label: 'Add centre support',
    issueCode: 'SPAN_TOO_WIDE',
    initial: { width: 1300 },
  },
  { label: 'Add back panel', issueCode: 'NO_BACK_TALL_CABINET', initial: { hasBack: false, height: 1800 } },
  {
    label: 'Use plywood 18 mm',
    issueCode: 'DADO_DEPTH_TOO_SHALLOW',
    initial: { carcassMaterial: 'plywood-4', shelfCount: 1 },
  },
  { label: 'Merge to 1 door', issueCode: 'DOOR_TOO_NARROW', initial: { width: 350, doorCount: 2 } },
  { label: 'Remove doors', issueCode: 'DOOR_TOO_NARROW', initial: { width: 150, doorCount: 1 } },
  { label: 'Split to 2 doors', issueCode: 'DOOR_ASPECT_RATIO', initial: { width: 300, height: 2000, doorCount: 1 } },
  {
    label: 'Use wide-angle hinge',
    issueCode: 'DOOR_EXCEEDS_STANDARD_HINGE_RATING',
    initial: { height: 2400, doorCount: 1 },
  },
  { label: 'Reduce shelves', issueCode: 'HINGE_SHELF_INTERFERENCE', initial: { height: 1000, shelfCount: 3 } },
  { label: 'Remove shelves', issueCode: 'DRAWERS_TOO_MANY', initial: { height: 500, shelfCount: 2, drawerCount: 3 } },
  {
    label: 'Switch to screws',
    issueCode: 'JOINERY_DADO_TOO_THIN',
    initial: { carcassMaterial: 'plywood-4', joineryType: 'dado' },
  },
  {
    label: 'Remove hinge profile',
    issueCode: 'VENDOR_HINGE_PROFILE_UNKNOWN',
    initial: { hingeProfile: 'unknown-profile' },
  },
];

describe('ValidationPanel Fix button — Sprint 63', () => {
  beforeEach(() => {
    useCabinetStore.getState().resetConfig();
  });

  it('shows a Fix button when issue has field and suggestedValue', () => {
    render(<ValidationPanel issues={[FIXABLE_ISSUE]} />);
    expect(screen.getByRole('button', { name: /fix/i })).toBeInTheDocument();
  }, 15_000);

  it('does NOT show a Fix button when issue has no field', () => {
    render(<ValidationPanel issues={[NON_FIXABLE_ISSUE]} />);
    expect(screen.queryByRole('button', { name: /fix/i })).not.toBeInTheDocument();
  });

  it('clicking Fix updates the store config with the suggested value', () => {
    // Set depth to something different so we can verify it changes
    useCabinetStore.getState().setConfig({ depth: 900 });
    render(<ValidationPanel issues={[FIXABLE_ISSUE]} />);
    fireEvent.click(screen.getByRole('button', { name: /fix/i }));
    expect(useCabinetStore.getState().config.depth).toBe(600);
  });

  it('clicking Fix dismisses the issue so it disappears from the panel', () => {
    render(<ValidationPanel issues={[FIXABLE_ISSUE]} />);
    fireEvent.click(screen.getByRole('button', { name: /fix/i }));
    // After fix+dismiss, the issue message should no longer be visible
    expect(screen.queryByText('Depth exceeds width')).not.toBeInTheDocument();
  });

  it('moves focus to the validation toggle after removing the focused fix button', async () => {
    const user = userEvent.setup();
    render(<ValidationPanel issues={[FIXABLE_ISSUE, REMAINING_ISSUE]} />);
    const fixButton = screen.getByRole('button', { name: /fix/i });
    fixButton.focus();
    await user.click(fixButton);
    expect(screen.getByRole('button', { name: /design checks/i })).toHaveFocus();
  });

  it('returns focus to the selected workspace tab when the final issue is repaired', async () => {
    const user = userEvent.setup();
    render(
      <>
        <div role="tablist" aria-label="Workspace">
          <button type="button" role="tab" aria-selected="true">
            Configure
          </button>
        </div>
        <ValidationPanel issues={[FIXABLE_ISSUE]} />
      </>,
    );
    const workspaceTab = screen.getByRole('tab', { name: 'Configure' });
    const fixButton = screen.getByRole('button', { name: /fix/i });
    fixButton.focus();
    await user.click(fixButton);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(workspaceTab).toHaveFocus();
  });

  it.each(REPAIRS)(
    'applies the "$label" repair and keeps the remaining issue accessible',
    async ({ label, issueCode, initial }) => {
      const user = userEvent.setup();
      const config = cfg(initial);
      const issues = validateConfig(config);
      const issue = issues.find((candidate) => candidate.code === issueCode);
      expect(issue?.fix?.labelKey).toBeTruthy();
      expect(issue?.fix?.patch).toBeTruthy();
      if (!issue?.fix?.patch) return;
      const patch = issue.fix.patch;
      const remainingIssue = issues.find((candidate) => candidate.code !== issueCode) ?? REMAINING_ISSUE;
      useCabinetStore.getState().setConfig(config);
      render(<ValidationPanel issues={[issue, remainingIssue]} />);
      const fixButton = screen.getByRole('button', { name: label });
      fixButton.focus();
      await user.click(fixButton);
      expect(useCabinetStore.getState().config).toMatchObject(patch);
      expect(screen.queryByText(issue.message.en)).not.toBeInTheDocument();
      expect(screen.getByText(remainingIssue.message.en)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /design checks/i })).toHaveFocus();
      const toggle = screen.getByRole('button', { name: /design checks/i });
      const issueList = screen.getByRole('list');
      expect(toggle).toHaveAttribute('aria-controls', issueList.id);
      expect(issueList).toHaveAttribute('aria-live', 'polite');
      expect(issueList).toHaveAttribute('aria-atomic', 'false');
    },
  );

  it('dismiss (×) button still works independently of Fix button', () => {
    render(<ValidationPanel issues={[FIXABLE_ISSUE]} />);
    const dismissBtn = screen.getByRole('button', { name: /dismiss$/i });
    fireEvent.click(dismissBtn);
    expect(screen.queryByText('Depth exceeds width')).not.toBeInTheDocument();
  });
});
