import { describe, expect, it } from 'vitest';
import { COMMANDS, formatShortcut, getCommand } from '../../src/app/command-registry';
import { APP_ROUTES, APP_TAB_COMMANDS, APP_TABS, isAppRouteId } from '../../src/utils/route-table';

describe('route table', () => {
  it('is the only tab list used by shortcuts and the command registry', () => {
    expect(APP_TABS).toEqual(APP_ROUTES.map((route) => route.id));
    expect(APP_TAB_COMMANDS.map((command) => command.id)).toEqual(APP_TABS);
    expect(COMMANDS.filter((command) => command.id.startsWith('tab.')).map((command) => command.id)).toEqual(
      APP_TABS.map((tab) => `tab.${tab}`),
    );
  });

  it.each(APP_ROUTES.filter((route) => route.altKey !== null))('binds Alt+$altKey to $id in both tables', (route) => {
    const command = getCommand(`tab.${route.id}`);
    const shortcuts = command && 'shortcuts' in command ? command.shortcuts : undefined;
    const palette = APP_TAB_COMMANDS.find((entry) => entry.id === route.id);

    expect(shortcuts).toEqual([{ key: route.altKey, alt: true }]);
    expect(shortcuts?.[0] ? formatShortcut(shortcuts[0]) : null).toBe(palette?.shortcut);
  });

  it('does not assign Alt+1 to the workspace tab', () => {
    const workspace = getCommand('tab.workspace');
    expect(workspace && 'shortcuts' in workspace ? workspace.shortcuts : undefined).toBeUndefined();
    expect(APP_TAB_COMMANDS[0]).toEqual({
      id: 'workspace',
      labelKey: 'tabs.workspace',
      shortcut: null,
      shortcutKey: null,
    });
  });

  it.each(['workspace', 'configurator', 'preview', 'optimizer', 'assembly', 'pdf', 'calculators'])(
    'accepts the %s route id',
    (tab) => {
      expect(isAppRouteId(tab)).toBe(true);
    },
  );

  it.each(['', 'unknown', 'Workspace'])('rejects %s as a route id', (tab) => {
    expect(isAppRouteId(tab)).toBe(false);
  });
});
