/**
 * Command Palette — Sprint 15
 *
 * A searchable registry of application commands (Cmd+K / Ctrl+K).
 * Pure TypeScript — no React, no DOM.  Consumers (React components, hooks)
 * register commands at startup and invoke them by ID.
 *
 * Features:
 *   - Register / unregister commands at runtime.
 *   - Fuzzy search by label, keywords, and category.
 *   - Keyboard shortcut labels for display in the palette UI.
 *   - Grouped command results (by category).
 *   - Recent-commands list (last 10) persisted to localStorage.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppCommandDefinition {
  id: string;
  key?: string;
  shortcut?: string;
  labelKey: string;
  categoryKey: string;
}

export const APP_COMMAND_DEFINITIONS = {
  undo: {
    id: 'header.undo',
    key: 'z',
    shortcut: 'Ctrl+Z',
    labelKey: 'commandPalette.commands.undo',
    categoryKey: 'commandPalette.categories.actions',
  },
  redo: {
    id: 'header.redo',
    key: 'y',
    shortcut: 'Ctrl+Y',
    labelKey: 'commandPalette.commands.redo',
    categoryKey: 'commandPalette.categories.actions',
  },
  redoAlternate: {
    id: 'action.redo-alternate',
    key: 'z',
    shortcut: 'Ctrl+Shift+Z',
    labelKey: 'commandPalette.commands.redoAlternate',
    categoryKey: 'commandPalette.categories.actions',
  },
  toggleTheme: {
    id: 'header.toggle-theme',
    key: 'd',
    shortcut: 'Alt+D',
    labelKey: 'commandPalette.commands.toggleTheme',
    categoryKey: 'commandPalette.categories.actions',
  },
  toggleContrast: {
    id: 'header.toggle-contrast',
    labelKey: 'commandPalette.commands.toggleContrast',
    categoryKey: 'commandPalette.categories.actions',
  },
  toggleUnits: {
    id: 'header.toggle-units',
    labelKey: 'config.toggleUnits',
    categoryKey: 'commandPalette.categories.actions',
  },
  copyLink: {
    id: 'header.copy-link',
    key: 'l',
    shortcut: 'Ctrl+L',
    labelKey: 'commandPalette.commands.copyLink',
    categoryKey: 'commandPalette.categories.actions',
  },
  openTemplates: {
    id: 'header.open-templates',
    labelKey: 'templates.title',
    categoryKey: 'commandPalette.categories.actions',
  },
  openProjects: {
    id: 'header.open-projects',
    labelKey: 'projects.title',
    categoryKey: 'commandPalette.categories.actions',
  },
  openMarketplace: {
    id: 'header.open-marketplace',
    labelKey: 'marketplace.title',
    categoryKey: 'commandPalette.categories.actions',
  },
  openShortcuts: {
    id: 'header.open-shortcuts',
    key: '?',
    shortcut: '?',
    labelKey: 'commandPalette.commands.keyboardShortcuts',
    categoryKey: 'commandPalette.categories.actions',
  },
  reopenOnboarding: {
    id: 'help.onboarding',
    labelKey: 'onboarding.help',
    categoryKey: 'commandPalette.categories.actions',
  },
  addCabinet: {
    id: 'action.add-cabinet',
    key: 'n',
    shortcut: 'Ctrl+Shift+N',
    labelKey: 'commandPalette.commands.addCabinet',
    categoryKey: 'commandPalette.categories.actions',
  },
  exportBom: {
    id: 'action.export-bom',
    key: 'e',
    shortcut: 'Ctrl+E',
    labelKey: 'commandPalette.commands.exportBom',
    categoryKey: 'commandPalette.categories.exports',
  },
  saveSnapshot: {
    id: 'action.save-snapshot',
    key: 's',
    shortcut: 'Ctrl+Shift+S',
    labelKey: 'commandPalette.commands.saveSnapshot',
    categoryKey: 'commandPalette.categories.actions',
  },
  resetConfig: {
    id: 'action.reset-config',
    key: 'r',
    shortcut: 'Ctrl+R',
    labelKey: 'commandPalette.commands.resetConfig',
    categoryKey: 'commandPalette.categories.actions',
  },
  print: {
    id: 'action.print',
    key: 'p',
    shortcut: 'Ctrl+P',
    labelKey: 'commandPalette.commands.print',
    categoryKey: 'commandPalette.categories.exports',
  },
  toggleFocusMode: {
    id: 'action.toggle-focus-mode',
    key: 'k',
    shortcut: 'Ctrl+Shift+K',
    labelKey: 'commandPalette.commands.toggleFocusMode',
    categoryKey: 'commandPalette.categories.actions',
  },
} as const satisfies Record<string, AppCommandDefinition>;

export const APP_SHORTCUTS = {
  commandPalette: { key: 'k', shortcut: 'Ctrl+K', labelKey: 'commandPalette.shortcutDescription' },
  undo: APP_COMMAND_DEFINITIONS.undo,
  redo: APP_COMMAND_DEFINITIONS.redo,
  redoAlternate: APP_COMMAND_DEFINITIONS.redoAlternate,
  toggleTheme: APP_COMMAND_DEFINITIONS.toggleTheme,
  saveSnapshot: APP_COMMAND_DEFINITIONS.saveSnapshot,
  print: APP_COMMAND_DEFINITIONS.print,
  exportBom: APP_COMMAND_DEFINITIONS.exportBom,
  resetConfig: APP_COMMAND_DEFINITIONS.resetConfig,
  copyLink: APP_COMMAND_DEFINITIONS.copyLink,
  addCabinet: APP_COMMAND_DEFINITIONS.addCabinet,
  toggleFocusMode: APP_COMMAND_DEFINITIONS.toggleFocusMode,
  shortcuts: APP_COMMAND_DEFINITIONS.openShortcuts,
} as const;

export const APP_TAB_COMMANDS = [
  { id: 'workspace', labelKey: 'tabs.workspace', shortcut: null, shortcutKey: null },
  { id: 'configurator', labelKey: 'tabs.configurator', shortcut: 'Alt+1', shortcutKey: '1' },
  { id: 'preview', labelKey: 'tabs.preview', shortcut: 'Alt+2', shortcutKey: '2' },
  { id: 'optimizer', labelKey: 'tabs.optimizer', shortcut: 'Alt+3', shortcutKey: '3' },
  { id: 'assembly', labelKey: 'tabs.assembly', shortcut: 'Alt+4', shortcutKey: '4' },
  { id: 'pdf', labelKey: 'tabs.pdf', shortcut: 'Alt+5', shortcutKey: '5' },
  { id: 'calculators', labelKey: 'tabs.calculators', shortcut: 'Alt+6', shortcutKey: '6' },
] as const;

export interface PaletteCommand {
  /** Unique command identifier, e.g. 'export.gcode'. */
  id: string;
  /** Short display label, e.g. 'Export G-code'. */
  label: string;
  /** Logical grouping, e.g. 'Export', 'View', 'Project'. */
  category: string;
  /** Execute the command.  May be async. */
  action: () => void | Promise<void>;
  /** Human-readable keyboard shortcut, e.g. 'Ctrl+G'. */
  shortcut?: string;
  /** Extra search keywords (not displayed). */
  keywords?: string[];
  /** When false, the command is omitted from search results. */
  when?: () => boolean;
  /** When true, the command is not shown in search results but can still be invoked by ID. */
  hidden?: boolean;
}

export function createAppCommand(
  definition: AppCommandDefinition,
  label: string,
  category: string,
  action: PaletteCommand['action'],
  when?: () => boolean,
): PaletteCommand {
  return {
    id: definition.id,
    label,
    category,
    action,
    ...(definition.shortcut ? { shortcut: definition.shortcut } : {}),
    ...(when ? { when } : {}),
  };
}

export interface CommandGroup {
  category: string;
  commands: PaletteCommand[];
}

export interface SearchResult {
  /** The matched command. */
  command: PaletteCommand;
  /** Score 0–100; higher = better match. */
  score: number;
}

// ── Registry ──────────────────────────────────────────────────────────────────

const _registry = new Map<string, PaletteCommand>();
const RECENTS_KEY = 'cabinet-planner-palette-recents';
const MAX_RECENTS = 10;

/**
 * Register one or more commands with the palette.
 * If a command with the same `id` already exists it is replaced.
 */
export function registerCommands(commands: PaletteCommand[]): void {
  for (const cmd of commands) {
    _registry.set(cmd.id, cmd);
  }
}

/**
 * Unregister a command by ID.
 * Silently ignores unknown IDs.
 */
export function unregisterCommand(id: string): void {
  _registry.delete(id);
}

/** Return a command by ID, or `null` when not found. */
export function getCommand(id: string): PaletteCommand | null {
  return _registry.get(id) ?? null;
}

/** Return all registered commands (hidden + visible). */
export function getAllCommands(): PaletteCommand[] {
  return [..._registry.values()];
}

/** Clear all registered commands (useful in tests). */
export function clearRegistry(): void {
  _registry.clear();
}

// ── Search ────────────────────────────────────────────────────────────────────

/**
 * Search registered commands by query string.
 *
 * Scoring:
 *   - Exact id match → 100
 *   - Label starts with query → 90
 *   - Label contains query → 70
 *   - Keyword exact match → 60
 *   - Category contains query → 40
 *
 * Hidden commands are excluded.
 *
 * @param query  Search string.  Empty string returns all visible commands at score 50.
 * @param limit  Maximum number of results (default 20).
 */
export function searchCommands(query: string, limit = 20): SearchResult[] {
  const q = query.trim().toLowerCase();
  const results: SearchResult[] = [];

  for (const cmd of _registry.values()) {
    if (cmd.hidden || (cmd.when && !cmd.when())) continue;
    if (!q) {
      results.push({ command: cmd, score: 50 });
      continue;
    }
    const score = _score(cmd, q);
    if (score > 0) results.push({ command: cmd, score });
  }

  results.sort((a, b) => b.score - a.score || a.command.label.localeCompare(b.command.label));
  return results.slice(0, limit);
}

/**
 * Group search results by category.
 * Within each group results are ordered by score descending.
 */
export function groupSearchResults(results: SearchResult[]): CommandGroup[] {
  const groups = new Map<string, SearchResult[]>();
  for (const r of results) {
    const cat = r.command.category;
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(r);
  }
  return [...groups.entries()].map(([category, items]) => ({
    category,
    commands: items.map((r) => r.command),
  }));
}

// ── Invocation ────────────────────────────────────────────────────────────────

/**
 * Invoke a command by ID and record it in the recents list.
 * @throws When the command is not found.
 */
export async function invokeCommand(id: string): Promise<void> {
  const cmd = _registry.get(id);
  if (!cmd) throw new Error(`Command '${id}' not found`);
  await cmd.action();
  _addRecent(id);
}

// ── Recents ───────────────────────────────────────────────────────────────────

/** Return the last N invoked command IDs (most recent first). */
export function getRecentCommandIds(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) && parsed.every((id): id is string => typeof id === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

/** Return recent commands that are still registered, most recent first. */
export function getRecentCommands(): PaletteCommand[] {
  return getRecentCommandIds()
    .map((id) => _registry.get(id))
    .filter((cmd): cmd is PaletteCommand => cmd != null);
}

/** Clear the recents list. */
export function clearRecentCommands(): void {
  try {
    window.localStorage.removeItem(RECENTS_KEY);
  } catch {
    // storage unavailable
  }
}

function _addRecent(id: string): void {
  try {
    const current = getRecentCommandIds().filter((r) => r !== id);
    const updated = [id, ...current].slice(0, MAX_RECENTS);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
  } catch {
    // storage unavailable — recents are best-effort
  }
}

// ── Scoring helper ────────────────────────────────────────────────────────────

function _score(cmd: PaletteCommand, q: string): number {
  const id = cmd.id.toLowerCase();
  const label = cmd.label.toLowerCase();
  const category = cmd.category.toLowerCase();
  const keywords = (cmd.keywords ?? []).map((k) => k.toLowerCase());

  if (id === q) return 100;
  if (label === q) return 95;
  if (label.startsWith(q)) return 90;
  if (label.includes(q)) return 70;
  if (keywords.some((k) => k === q)) return 60;
  if (keywords.some((k) => k.includes(q))) return 50;
  if (category === q) return 45;
  if (category.includes(q)) return 40;
  if (id.includes(q)) return 30;
  return Math.max(
    fuzzySubsequenceScore(label, q),
    fuzzySubsequenceScore(id, q),
    fuzzySubsequenceScore(category, q),
    ...keywords.map((keyword) => fuzzySubsequenceScore(keyword, q)),
  );
}

function fuzzySubsequenceScore(value: string, query: string): number {
  let queryIndex = 0;
  let firstMatch = -1;
  let lastMatch = -1;
  let consecutive = 0;
  let longestRun = 0;

  for (let index = 0; index < value.length && queryIndex < query.length; index += 1) {
    if (value[index] !== query[queryIndex]) continue;
    if (firstMatch === -1) firstMatch = index;
    consecutive = lastMatch === index - 1 ? consecutive + 1 : 1;
    longestRun = Math.max(longestRun, consecutive);
    lastMatch = index;
    queryIndex += 1;
  }

  if (queryIndex !== query.length) return 0;
  const span = lastMatch - firstMatch + 1;
  return Math.min(
    29,
    Math.max(1, Math.round((query.length / value.length) * 20 + longestRun * 2 - (span - query.length))),
  );
}
