/**
 * Sprint 63 — ValidationPanel one-click Fix button tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidationPanel } from '../../src/components/configurator/ValidationPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';
import type { ValidationIssue } from '../../src/engine/types';

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

describe('ValidationPanel Fix button — Sprint 63', () => {
  beforeEach(() => {
    useCabinetStore.getState().resetConfig();
  });

  it('shows a Fix button when issue has field and suggestedValue', () => {
    render(<ValidationPanel issues={[FIXABLE_ISSUE]} />);
    expect(screen.getByRole('button', { name: /fix/i })).toBeInTheDocument();
  });

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

  it('dismiss (×) button still works independently of Fix button', () => {
    render(<ValidationPanel issues={[FIXABLE_ISSUE]} />);
    const dismissBtn = screen.getByRole('button', { name: /dismiss$/i });
    fireEvent.click(dismissBtn);
    expect(screen.queryByText('Depth exceeds width')).not.toBeInTheDocument();
  });
});
