import { CALCULATOR_CATALOG, type CalculatorId } from '../configurator/calculator-catalog';

export const APP_TABS = [
  'workspace',
  'configurator',
  'preview',
  'optimizer',
  'assembly',
  'pdf',
  'calculators',
] as const;

type AppTab = (typeof APP_TABS)[number];

interface CommandAvailability {
  canUndo: boolean;
  canRedo: boolean;
}

const COMMAND_ACTIONS = [
  'palette.open',
  'history.undo',
  'history.redo',
  'snapshot.save',
  'print.run',
  'export.bom',
  'config.reset',
  'share.copy',
  'cabinet.add',
  'focus.toggle',
  'theme.toggle',
  'units.toggle',
  'contrast.toggle',
  'templates.open',
  'projects.open',
  'shortcuts.toggle',
  'diagnostics.open',
  'marketplace.open',
  'help.open',
] as const;

export type CommandAction = (typeof COMMAND_ACTIONS)[number];

export const COMMAND_ACTION_EVENT = 'command:execute';

export interface ShortcutBinding {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
}

export interface CommandExecutionContext {
  run: (action: CommandAction) => void;
  setActiveTab: (tab: AppTab) => void;
  openCalculator?: (id: CalculatorId) => void;
}

interface CommandDefinition {
  id: string;
  labelKey: string;
  categoryKey: string;
  keywords?: readonly string[];
  shortcuts?: readonly ShortcutBinding[];
  showInPalette: boolean;
  when: (availability: CommandAvailability) => boolean;
  handler: (context: CommandExecutionContext) => void;
}

const alwaysAvailable = () => true;
const canUndo = (availability: CommandAvailability) => availability.canUndo;
const canRedo = (availability: CommandAvailability) => availability.canRedo;

export const COMMANDS = [
  ...APP_TABS.map((tab, index) => ({
    id: `tab.${tab}`,
    labelKey: `tabs.${tab}`,
    categoryKey: 'commandPalette.categoryNavigation',
    shortcuts: index > 0 ? [{ key: String(index), alt: true }] : undefined,
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.setActiveTab(tab),
  })),
  ...CALCULATOR_CATALOG.map(({ id, titleKey }) => ({
    id: `calculator.${id}`,
    labelKey: titleKey,
    categoryKey: 'commandPalette.categoryCalculators',
    keywords: [id.replaceAll('-', ' ')],
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => {
      if (context.openCalculator) context.openCalculator(id);
      else context.setActiveTab('calculators');
    },
  })),
  {
    id: 'palette.open',
    labelKey: 'commandPalette.title',
    categoryKey: 'commandPalette.categoryActions',
    shortcuts: [{ key: 'k', ctrl: true }],
    showInPalette: false,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.run('palette.open'),
  },
  {
    id: 'history.undo',
    labelKey: 'commandPalette.undo',
    categoryKey: 'commandPalette.categoryActions',
    shortcuts: [{ key: 'z', ctrl: true }],
    showInPalette: true,
    when: canUndo,
    handler: (context: CommandExecutionContext) => context.run('history.undo'),
  },
  {
    id: 'history.redo',
    labelKey: 'commandPalette.redo',
    categoryKey: 'commandPalette.categoryActions',
    shortcuts: [
      { key: 'y', ctrl: true },
      { key: 'z', ctrl: true, shift: true },
    ],
    showInPalette: true,
    when: canRedo,
    handler: (context: CommandExecutionContext) => context.run('history.redo'),
  },
  {
    id: 'snapshot.save',
    labelKey: 'commandPalette.saveSnapshot',
    categoryKey: 'commandPalette.categoryActions',
    shortcuts: [{ key: 's', ctrl: true, shift: true }],
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.run('snapshot.save'),
  },
  {
    id: 'print.run',
    labelKey: 'commandPalette.print',
    categoryKey: 'commandPalette.categoryActions',
    shortcuts: [{ key: 'p', ctrl: true }],
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.run('print.run'),
  },
  {
    id: 'export.bom',
    labelKey: 'commandPalette.exportBom',
    categoryKey: 'commandPalette.categoryExports',
    shortcuts: [{ key: 'e', ctrl: true }],
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.run('export.bom'),
  },
  {
    id: 'export.dxf',
    labelKey: 'commandPalette.openDxf',
    categoryKey: 'commandPalette.categoryExports',
    keywords: ['cut sheets', 'cad'],
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.setActiveTab('optimizer'),
  },
  {
    id: 'export.gcode',
    labelKey: 'commandPalette.openGcode',
    categoryKey: 'commandPalette.categoryExports',
    keywords: ['cut sheets', 'cnc'],
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.setActiveTab('optimizer'),
  },
  {
    id: 'export.pdf',
    labelKey: 'commandPalette.openPdf',
    categoryKey: 'commandPalette.categoryExports',
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.setActiveTab('pdf'),
  },
  {
    id: 'config.reset',
    labelKey: 'commandPalette.resetConfig',
    categoryKey: 'commandPalette.categoryActions',
    shortcuts: [{ key: 'r', ctrl: true }],
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.run('config.reset'),
  },
  {
    id: 'share.copy',
    labelKey: 'commandPalette.copyLink',
    categoryKey: 'commandPalette.categoryActions',
    shortcuts: [{ key: 'l', ctrl: true }],
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.run('share.copy'),
  },
  {
    id: 'cabinet.add',
    labelKey: 'shortcuts.addCabinet',
    categoryKey: 'commandPalette.categoryActions',
    shortcuts: [{ key: 'n', ctrl: true, shift: true }],
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.run('cabinet.add'),
  },
  {
    id: 'focus.toggle',
    labelKey: 'commandPalette.toggleFocusMode',
    categoryKey: 'commandPalette.categoryActions',
    shortcuts: [{ key: 'k', ctrl: true, shift: true }],
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.run('focus.toggle'),
  },
  {
    id: 'theme.toggle',
    labelKey: 'commandPalette.toggleTheme',
    categoryKey: 'commandPalette.categoryActions',
    shortcuts: [{ key: 'd', alt: true }],
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.run('theme.toggle'),
  },
  {
    id: 'units.toggle',
    labelKey: 'commandPalette.toggleUnits',
    categoryKey: 'commandPalette.categoryActions',
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.run('units.toggle'),
  },
  {
    id: 'contrast.toggle',
    labelKey: 'footer.highContrast',
    categoryKey: 'commandPalette.categoryActions',
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.run('contrast.toggle'),
  },
  {
    id: 'presets.open',
    labelKey: 'commandPalette.openPresets',
    categoryKey: 'commandPalette.categoryActions',
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.setActiveTab('configurator'),
  },
  {
    id: 'templates.open',
    labelKey: 'templates.title',
    categoryKey: 'commandPalette.categoryActions',
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.run('templates.open'),
  },
  {
    id: 'projects.open',
    labelKey: 'projects.title',
    categoryKey: 'commandPalette.categoryActions',
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.run('projects.open'),
  },
  {
    id: 'shortcuts.toggle',
    labelKey: 'commandPalette.openShortcuts',
    categoryKey: 'commandPalette.categoryActions',
    shortcuts: [{ key: '?' }],
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.run('shortcuts.toggle'),
  },
  {
    id: 'marketplace.open',
    labelKey: 'marketplace.title',
    categoryKey: 'commandPalette.categoryActions',
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.run('marketplace.open'),
  },
  {
    id: 'diagnostics.open',
    labelKey: 'diagnostics.title',
    categoryKey: 'commandPalette.categoryActions',
    keywords: ['support', 'bug report', 'export'],
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.run('diagnostics.open'),
  },
  {
    id: 'help.open',
    labelKey: 'onboarding.help',
    categoryKey: 'commandPalette.categoryActions',
    showInPalette: true,
    when: alwaysAvailable,
    handler: (context: CommandExecutionContext) => context.run('help.open'),
  },
] as const satisfies readonly CommandDefinition[];

export type CommandId = (typeof COMMANDS)[number]['id'];

export function getCommand(id: string) {
  return COMMANDS.find((command) => command.id === id);
}

export function formatShortcut(binding: ShortcutBinding): string {
  return [binding.ctrl && 'Ctrl', binding.alt && 'Alt', binding.shift && 'Shift', binding.key.toUpperCase()]
    .filter(Boolean)
    .join('+');
}

export function matchesShortcut(event: KeyboardEvent, binding: ShortcutBinding): boolean {
  const ctrl = event.ctrlKey || event.metaKey;
  const shiftMatches = binding.key === '?' || event.shiftKey === Boolean(binding.shift);
  return (
    event.key.toLowerCase() === binding.key.toLowerCase() &&
    ctrl === Boolean(binding.ctrl) &&
    event.altKey === Boolean(binding.alt) &&
    shiftMatches
  );
}

export function isCommandAction(value: unknown): value is CommandAction {
  return COMMAND_ACTIONS.some((action) => action === value);
}

export function dispatchCommandAction(action: CommandAction): void {
  window.dispatchEvent(new CustomEvent(COMMAND_ACTION_EVENT, { detail: action }));
}
