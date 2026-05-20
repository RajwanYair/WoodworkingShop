/**
 * Sprint 85 — ValidationPanel issue code shown as title tooltip on each row.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ValidationPanel } from '../../src/components/configurator/ValidationPanel';
import type { ValidationIssue } from '../../src/engine/types';

const ISSUE_A: ValidationIssue = {
  code: 'CARCASS_TOO_NARROW',
  severity: 'error',
  message: { en: 'Cabinet is too narrow', he: 'הארון צר מדי' },
};

const ISSUE_B: ValidationIssue = {
  code: 'DEPTH_TOO_SHALLOW_FOR_DOORS',
  severity: 'warning',
  message: { en: 'Depth too shallow for doors', he: 'עומק קטן מדי לדלתות' },
};

describe('ValidationPanel — issue code title tooltip (Sprint 85)', () => {
  it('each issue row has a title attribute equal to the issue code', () => {
    render(<ValidationPanel issues={[ISSUE_A, ISSUE_B]} />);
    const items = screen.getAllByRole('listitem');
    const titles = items.map((el) => el.getAttribute('title'));
    expect(titles).toContain('CARCASS_TOO_NARROW');
    expect(titles).toContain('DEPTH_TOO_SHALLOW_FOR_DOORS');
  });

  it('title attribute matches the exact issue code string', () => {
    render(<ValidationPanel issues={[ISSUE_A]} />);
    const item = screen.getByRole('listitem');
    expect(item.getAttribute('title')).toBe('CARCASS_TOO_NARROW');
  });

  it('multiple issues each carry their own code as title', () => {
    render(<ValidationPanel issues={[ISSUE_A, ISSUE_B]} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0].getAttribute('title')).toBe('CARCASS_TOO_NARROW');
    expect(items[1].getAttribute('title')).toBe('DEPTH_TOO_SHALLOW_FOR_DOORS');
  });

  it('info severity row also carries the issue code as title', () => {
    const infoIssue: ValidationIssue = {
      code: 'PANEL_TOO_THIN_FOR_SHELF_PINS',
      severity: 'info',
      message: { en: 'Panel too thin', he: 'לוח דק מדי' },
    };
    render(<ValidationPanel issues={[infoIssue]} />);
    const item = screen.getByRole('listitem');
    expect(item.getAttribute('title')).toBe('PANEL_TOO_THIN_FOR_SHELF_PINS');
  });
});
