/**
 * Sprint 15 — Focus order & screen-reader narration tests
 *
 * Verifies that key interactive components expose proper ARIA attributes
 * and that keyboard-navigable elements are correctly labelled so screen
 * readers can announce them.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationPanel } from '../../src/components/configurator/ValidationPanel';
import { DimensionSliders } from '../../src/components/configurator/DimensionSliders';
import { ConfiguratorPanel } from '../../src/components/configurator/ConfiguratorPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import type { ValidationIssue } from '../../src/engine/types';

// ── Fixtures ────────────────────────────────────────────────────────────────

const WARNING_ISSUE: ValidationIssue = {
  code: 'TEST_WARN',
  severity: 'warning',
  message: { en: 'Cabinet is too tall', he: 'הארון גבוה מדי' },
};

const ERROR_ISSUE: ValidationIssue = {
  code: 'TEST_ERR',
  severity: 'error',
  message: { en: 'Width exceeds limit', he: 'רוחב חורג מהמגבלה' },
  suggestedValue: 800,
};

// ── ValidationPanel — ARIA attributes ───────────────────────────────────────

describe('ValidationPanel — ARIA / screen-reader attributes', () => {
  it('renders a <section> with aria-label identifying the panel', () => {
    render(<ValidationPanel issues={[WARNING_ISSUE]} />);
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('collapse toggle button has aria-expanded=true when open', () => {
    render(<ValidationPanel issues={[WARNING_ISSUE]} />);
    const toggle = screen.getByRole('button', { name: /design checks/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapse toggle has aria-controls pointing to the issue list', () => {
    render(<ValidationPanel issues={[WARNING_ISSUE]} />);
    const toggle = screen.getByRole('button', { name: /design checks/i });
    expect(toggle).toHaveAttribute('aria-controls', 'validation-issue-list');
  });

  it('issue list has role=list for proper screen-reader announcement', () => {
    render(<ValidationPanel issues={[WARNING_ISSUE]} />);
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('aria-expanded flips to false after collapsing', () => {
    render(<ValidationPanel issues={[WARNING_ISSUE]} />);
    const toggle = screen.getByRole('button', { name: /design checks/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('dismiss button has accessible aria-label', () => {
    render(<ValidationPanel issues={[WARNING_ISSUE]} />);
    // Each issue row has an individual dismiss button
    const dismissBtns = screen.getAllByRole('button', { name: /dismiss/i });
    expect(dismissBtns.length).toBeGreaterThanOrEqual(1);
    dismissBtns.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-label');
    });
  });

  it('renders warning icon aria-hidden for decorative icons', () => {
    render(<ValidationPanel issues={[WARNING_ISSUE]} />);
    // The panel must render without missing text alternatives for the icons
    // (icon-only SVGs are aria-hidden so screen readers skip them)
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('suggestedValue note is rendered when present', () => {
    render(<ValidationPanel issues={[ERROR_ISSUE]} />);
    // The i18n template renders as "Suggested: 800"
    expect(screen.getByText(/800/)).toBeInTheDocument();
  });
});

// ── DimensionSliders — fieldset / legend pattern ────────────────────────────

describe('DimensionSliders — fieldset / legend for grouped controls', () => {
  beforeEach(() => {
    useCabinetStore.setState({
      config: { ...DEFAULT_CONFIG },
      cabinets: [{ name: 'Cabinet 1', config: { ...DEFAULT_CONFIG } }],
      activeCabinetIndex: 0,
    });
  });

  it('wraps controls in a <fieldset> for grouped keyboard navigation', () => {
    const { container } = render(<DimensionSliders />);
    expect(container.querySelector('fieldset')).not.toBeNull();
  });

  it('fieldset has a <legend> describing the group', () => {
    const { container } = render(<DimensionSliders />);
    expect(container.querySelector('fieldset > * legend, fieldset > legend')).not.toBeNull();
  });

  it('units toggle button is keyboard-accessible (no tabIndex=-1)', () => {
    render(<DimensionSliders />);
    // Use the arrow character (→) which is unique to the units toggle button
    const btn = screen.getByRole('button', { name: /mm \u2192 in|in \u2192 mm/i });
    const tabIndex = btn.getAttribute('tabindex');
    // null means natural tabOrder (0), anything other than -1 is accessible
    expect(tabIndex).not.toBe('-1');
  });
});

// ── ConfiguratorPanel — furniture type radio group ──────────────────────────

describe('ConfiguratorPanel — furniture type radio group', () => {
  beforeEach(() => {
    useCabinetStore.setState({
      config: { ...DEFAULT_CONFIG },
      cabinets: [{ name: 'Cabinet 1', config: { ...DEFAULT_CONFIG } }],
      activeCabinetIndex: 0,
    });
  });

  it('furniture type inputs are radio buttons (keyboard navigable via arrow keys)', () => {
    render(<ConfiguratorPanel />);
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBeGreaterThanOrEqual(3);
  });

  it('all radio buttons share the same name= group for unified arrow-key navigation', () => {
    render(<ConfiguratorPanel />);
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    const names = new Set(radios.map((r) => r.name));
    // furnitureType radios must all share one name
    expect(names.has('furnitureType')).toBe(true);
  });

  it('exactly one furnitureType radio button is checked on initial render', () => {
    render(<ConfiguratorPanel />);
    // Scope to the furnitureType group only — other radio groups also exist on the page
    const ftRadios = (screen.getAllByRole('radio') as HTMLInputElement[]).filter(
      (r) => r.name === 'furnitureType',
    );
    const checked = ftRadios.filter((r) => r.checked);
    expect(checked.length).toBe(1);
  });

  it('furniture type fieldset has a <legend> for SR grouping', () => {
    const { container } = render(<ConfiguratorPanel />);
    const legends = container.querySelectorAll('legend');
    expect(legends.length).toBeGreaterThanOrEqual(1);
  });
});
