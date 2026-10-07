import { describe, expect, it, vi } from 'vitest';
import { CALCULATOR_CATALOG } from '../../src/components/configurator/calculator-catalog';
import {
  COMMANDS,
  formatShortcut,
  getCommand,
  matchesShortcut,
  type CommandExecutionContext,
} from '../../src/components/layout/command-registry';

describe('command registry', () => {
  it('registers a direct palette command for every calculator section', () => {
    const calculatorCommands = CALCULATOR_CATALOG.map((calculator) => getCommand(`calculator.${calculator.id}`));

    expect(calculatorCommands.every((command) => command?.labelKey)).toBe(true);
    expect(calculatorCommands.map((command) => command?.labelKey)).toEqual(
      CALCULATOR_CATALOG.map((calculator) => calculator.titleKey),
    );
  });

  it('defines unique shortcut bindings and labels every descriptor', () => {
    const shortcutOwners = COMMANDS.flatMap((command) =>
      ('shortcuts' in command ? (command.shortcuts ?? []) : []).map((shortcut) => [
        formatShortcut(shortcut),
        command.id,
      ]),
    );
    const labels = new Set(COMMANDS.map((command) => command.labelKey));

    expect(new Set(shortcutOwners.map(([shortcut]) => shortcut)).size).toBe(shortcutOwners.length);
    expect(labels.size).toBe(COMMANDS.length);
    expect(
      COMMANDS.every((command) => typeof command.when === 'function' && typeof command.handler === 'function'),
    ).toBe(true);
  });

  it('matches platform modifier shortcuts without accepting extra modifiers', () => {
    const event = (overrides: Partial<KeyboardEvent>) =>
      ({ key: 'z', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, ...overrides }) as KeyboardEvent;

    expect(matchesShortcut(event({}), { key: 'z', ctrl: true })).toBe(true);
    expect(matchesShortcut(event({ metaKey: true, ctrlKey: false }), { key: 'z', ctrl: true })).toBe(true);
    expect(matchesShortcut(event({ shiftKey: true }), { key: 'z', ctrl: true })).toBe(false);
  });

  it('uses command availability and dispatches through the typed handler', () => {
    const undo = getCommand('history.undo');
    const dispatch = vi.fn();
    const context: CommandExecutionContext = {
      run: dispatch,
      setActiveTab: vi.fn(),
    };

    expect(undo?.when({ canUndo: false, canRedo: true })).toBe(false);
    expect(undo?.when({ canUndo: true, canRedo: false })).toBe(true);
    undo?.handler(context);
    expect(dispatch).toHaveBeenCalledWith('history.undo');
  });
});
