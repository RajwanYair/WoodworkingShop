import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { Header } from '../../src/components/layout/Header';
import { COMMANDS, formatShortcut } from '../../src/components/layout/command-registry';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { getCommand } from '../../src/utils/command-palette';
import { TEMPLATES } from '../../src/engine/templates';

describe('Header', () => {
  beforeEach(() => {
    useCabinetStore.setState({ activeTab: 'configurator', darkMode: false });
  });

  it('renders app title', () => {
    render(<Header />);
    expect(screen.getByRole('heading', { name: /WoodworkingShop/ })).toBeInTheDocument();
  });

  it('renders all four tab buttons', () => {
    render(<Header />);
    expect(screen.getAllByText(/configure/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/preview/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/cut sheets/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/export pdf/i).length).toBeGreaterThanOrEqual(1);
  });

  it('exposes the active tab as selected', () => {
    render(<Header />);
    expect(screen.getByRole('tab', { name: 'Configure' })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches tab on click', () => {
    render(<Header />);
    const previewBtns = screen.getAllByText(/preview/i);
    fireEvent.click(previewBtns[0]);
    expect(useCabinetStore.getState().activeTab).toBe('preview');
  });

  it('renders undo/redo buttons', () => {
    render(<Header />);
    const undoButtons = screen.getAllByLabelText('Undo');
    expect(undoButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders dark mode toggle', () => {
    render(<Header />);
    // Button uses SVG icon now — verify by aria-label
    const darkBtns = screen.getAllByLabelText(/dark mode|light mode/i);
    expect(darkBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('renders language toggle', () => {
    render(<Header />);
    expect(screen.getAllByText('עברית').length).toBeGreaterThanOrEqual(1);
  });

  it('exposes a command palette trigger', () => {
    render(<Header />);
    expect(screen.getAllByRole('button', { name: 'Command Palette' }).length).toBeGreaterThanOrEqual(1);
  });

  it('renders command shortcut hints from the registry', () => {
    render(<Header />);
    const shortcutCommands = COMMANDS.filter((command) =>
      ['palette.open', 'history.undo', 'history.redo'].includes(command.id),
    );
    const shortcutHints = shortcutCommands.flatMap((command) =>
      ('shortcuts' in command ? (command.shortcuts ?? []) : []).slice(0, 1).map(formatShortcut),
    );
    const controlTitles = screen
      .getAllByRole('button', { name: /Command Palette|Undo|Redo/ })
      .map((button) => button.getAttribute('title') ?? '');

    expect(shortcutHints).toHaveLength(3);
    expect(controlTitles).toEqual(
      expect.arrayContaining(shortcutHints.map((shortcut) => expect.stringContaining(shortcut))),
    );
  });

  it('registers a palette command that uses the same unit-toggle action', () => {
    render(<Header />);
    const initialUnits = useCabinetStore.getState().units;
    const toggleUnitsCommand = getCommand('header.toggle-units');

    expect(toggleUnitsCommand).not.toBeNull();
    expect(toggleUnitsCommand?.when?.()).not.toBe(false);
    toggleUnitsCommand?.action();

    expect(useCabinetStore.getState().units).not.toBe(initialUnits);
  });

  it('applies a preset from its palette command', () => {
    render(<Header />);
    const template = TEMPLATES[0];
    const command = getCommand(`header.template.${template.id}`);
    const originalUrl = window.location.href;

    expect(command?.label).toBe(template.name.en);
    command?.action();

    expect(useCabinetStore.getState().config.width).toBe(template.config.width);
    expect(new URL(window.location.href).searchParams.get('tpl')).toBe(template.id);
    window.history.replaceState(null, '', originalUrl);
  });

  it('registers every Header-owned action in the command palette', () => {
    render(<Header />);
    const commandIds = [
      'header.undo',
      'header.redo',
      'header.toggle-theme',
      'header.toggle-contrast',
      'header.toggle-units',
      'header.copy-link',
      'header.open-templates',
      'header.open-projects',
      'header.open-marketplace',
      'header.open-shortcuts',
      'help.onboarding',
    ];

    expect(commandIds.every((id) => getCommand(id) !== null)).toBe(true);
  });

  // ── Keyboard tab navigation (Sprint 22 — Phase 4 keyboard-only workflow) ──

  it('active tab button has tabIndex=0; others have tabIndex=-1 (roving tabindex)', () => {
    render(<Header />);
    const tabButtons = screen.getAllByRole('tab');
    const active = tabButtons.find((b) => b.getAttribute('aria-selected') === 'true');
    const inactive = tabButtons.filter((b) => b.getAttribute('aria-selected') !== 'true');
    expect(active).toBeDefined();
    expect(active!.tabIndex).toBe(0);
    inactive.forEach((b) => expect(b.tabIndex).toBe(-1));
  });

  it('ArrowRight moves focus to the next tab', () => {
    render(<Header />);
    const configuratorTab = screen.getAllByRole('tab').find((b) => b.textContent?.includes('Configure'))!;
    fireEvent.keyDown(configuratorTab, { key: 'ArrowRight' });
    expect(useCabinetStore.getState().activeTab).toBe('preview');
  });

  it('ArrowLeft wraps from first tab to last tab', () => {
    render(<Header />);
    const tabButtons = screen.getAllByRole('tab');
    // configurator is first; ArrowLeft should wrap to calculators (last)
    fireEvent.keyDown(tabButtons[0], { key: 'ArrowLeft' });
    expect(useCabinetStore.getState().activeTab).toBe('calculators');
  });

  it('Home key navigates to the first tab', () => {
    useCabinetStore.setState({ activeTab: 'assembly' });
    render(<Header />);
    const assemblyTab = screen.getAllByRole('tab').find((b) => b.getAttribute('aria-selected') === 'true')!;
    fireEvent.keyDown(assemblyTab, { key: 'Home' });
    expect(useCabinetStore.getState().activeTab).toBe('workspace');
  });

  it('End key navigates to the last tab', () => {
    render(<Header />);
    const tabButtons = screen.getAllByRole('tab');
    fireEvent.keyDown(tabButtons[0], { key: 'End' });
    expect(useCabinetStore.getState().activeTab).toBe('calculators');
  });
});
