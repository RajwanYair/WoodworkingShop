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
  /** When true, the command is not shown in search results but can still be invoked by ID. */
  hidden?: boolean;
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
    if (cmd.hidden) continue;
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
    return Array.isArray(parsed) ? (parsed as string[]) : [];
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
  return 0;
}
