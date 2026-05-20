/**
 * Sprint 72 — ValidationPanel severity count badge pills.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ValidationPanel } from '../../src/components/configurator/ValidationPanel';
import type { ValidationIssue } from '../../src/engine/types';

const ERROR_ISSUE: ValidationIssue = {
  code: 'ERR_A',
  severity: 'error',
  message: { en: 'Error one', he: 'שגיאה אחת' },
};

const WARN_ISSUE: ValidationIssue = {
  code: 'WARN_A',
  severity: 'warning',
  message: { en: 'Warning one', he: 'אזהרה אחת' },
};

const INFO_ISSUE: ValidationIssue = {
  code: 'INFO_A',
  severity: 'info',
  message: { en: 'Info note', he: 'הערה' },
};

describe('ValidationPanel severity badge pills — Sprint 72', () => {
  it('shows a red badge when there is 1 error', () => {
    render(<ValidationPanel issues={[ERROR_ISSUE]} />);
    // aria-label contains "1 error"
    const badge = screen.getByLabelText(/1 error/i);
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('1');
  });

  it('shows an amber badge when there is 1 warning', () => {
    render(<ValidationPanel issues={[WARN_ISSUE]} />);
    const badge = screen.getByLabelText(/1 warning/i);
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('1');
  });

  it('shows a blue badge when there is 1 info note', () => {
    render(<ValidationPanel issues={[INFO_ISSUE]} />);
    const badge = screen.getByLabelText(/1 note/i);
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('1');
  });

  it('shows separate badges for mixed severities', () => {
    render(<ValidationPanel issues={[ERROR_ISSUE, WARN_ISSUE, INFO_ISSUE]} />);
    expect(screen.getByLabelText(/1 error/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/1 warning/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/1 note/i)).toBeInTheDocument();
  });

  it('badge count matches the number of issues per severity', () => {
    const twoErrors: ValidationIssue[] = [
      { ...ERROR_ISSUE, code: 'ERR_A' },
      { ...ERROR_ISSUE, code: 'ERR_B' },
    ];
    render(<ValidationPanel issues={twoErrors} />);
    const badge = screen.getByLabelText(/2 error/i);
    expect(badge.textContent).toBe('2');
  });
});
