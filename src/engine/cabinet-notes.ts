/**
 * Sprint 32 — Cabinet notes engine.
 *
 * Stores free-text notes attached to:
 *   - The project as a whole ("project note")
 *   - Individual cabinets (by cabinetId)
 *   - Individual parts (by partId within a cabinet)
 *
 * Notes are plain strings persisted as part of the project JSON (IndexedDB).
 * The engine layer provides pure functions for managing a `NoteStore` value
 * object — no side effects, no storage calls.
 *
 * Pure function — no React, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Scope of a cabinet note. */
export type NoteScope = 'project' | 'cabinet' | 'part';

export interface CabinetNote {
  /** Unique note ID (short uuid-like random string). */
  id: string;
  scope: NoteScope;
  /** Cabinet ID (required when scope is 'cabinet' or 'part'). */
  cabinetId?: string;
  /** Part ID within the cabinet (required when scope is 'part'). */
  partId?: string;
  /** Plain-text note content. Max 1000 characters. */
  text: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-update timestamp. */
  updatedAt: string;
}

/** A value object holding the full set of notes for a project. */
export interface NoteStore {
  notes: CabinetNote[];
}

export type NoteError =
  | { code: 'NOTE_TOO_LONG'; message: string }
  | { code: 'NOTE_NOT_FOUND'; message: string }
  | { code: 'MISSING_CABINET_ID'; message: string }
  | { code: 'MISSING_PART_ID'; message: string };

/** Maximum note length in characters. */
export const MAX_NOTE_LENGTH = 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic short ID: base-36 timestamp + 4-char random suffix. */
function generateNoteId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function now(): string {
  return new Date().toISOString();
}

// ─── Core functions ───────────────────────────────────────────────────────────

/** Create an empty note store. */
export function createNoteStore(): NoteStore {
  return { notes: [] };
}

/**
 * Add a new note to the store.
 * Returns the updated store and the new note, or an error.
 */
export function addNote(
  store: NoteStore,
  scope: NoteScope,
  text: string,
  cabinetId?: string,
  partId?: string,
): { store: NoteStore; note: CabinetNote } | { error: NoteError } {
  if (text.length > MAX_NOTE_LENGTH) {
    return { error: { code: 'NOTE_TOO_LONG', message: `Note exceeds ${MAX_NOTE_LENGTH} character limit.` } };
  }
  if ((scope === 'cabinet' || scope === 'part') && !cabinetId) {
    return { error: { code: 'MISSING_CABINET_ID', message: 'cabinetId is required for cabinet/part-scoped notes.' } };
  }
  if (scope === 'part' && !partId) {
    return { error: { code: 'MISSING_PART_ID', message: 'partId is required for part-scoped notes.' } };
  }
  const ts = now();
  const note: CabinetNote = {
    id: generateNoteId(),
    scope,
    cabinetId,
    partId,
    text: text.trim(),
    createdAt: ts,
    updatedAt: ts,
  };
  return { store: { notes: [...store.notes, note] }, note };
}

/**
 * Update the text of an existing note.
 * Returns the updated store, or an error if note not found or text too long.
 */
export function updateNote(
  store: NoteStore,
  noteId: string,
  newText: string,
): { store: NoteStore } | { error: NoteError } {
  if (newText.length > MAX_NOTE_LENGTH) {
    return { error: { code: 'NOTE_TOO_LONG', message: `Note exceeds ${MAX_NOTE_LENGTH} character limit.` } };
  }
  const idx = store.notes.findIndex((n) => n.id === noteId);
  if (idx === -1) {
    return { error: { code: 'NOTE_NOT_FOUND', message: `Note ${noteId} not found.` } };
  }
  const updated: CabinetNote = { ...store.notes[idx], text: newText.trim(), updatedAt: now() };
  const notes = [...store.notes];
  notes[idx] = updated;
  return { store: { notes } };
}

/**
 * Delete a note by id.
 * Returns the updated store, or an error if note not found.
 */
export function deleteNote(store: NoteStore, noteId: string): { store: NoteStore } | { error: NoteError } {
  const idx = store.notes.findIndex((n) => n.id === noteId);
  if (idx === -1) {
    return { error: { code: 'NOTE_NOT_FOUND', message: `Note ${noteId} not found.` } };
  }
  return { store: { notes: store.notes.filter((n) => n.id !== noteId) } };
}

/** Return all notes for a given cabinet. */
export function getNotesForCabinet(store: NoteStore, cabinetId: string): CabinetNote[] {
  return store.notes.filter((n) => n.cabinetId === cabinetId);
}

/** Return all notes for a given part within a cabinet. */
export function getNotesForPart(store: NoteStore, cabinetId: string, partId: string): CabinetNote[] {
  return store.notes.filter((n) => n.cabinetId === cabinetId && n.partId === partId);
}

/** Return all project-scoped notes. */
export function getProjectNotes(store: NoteStore): CabinetNote[] {
  return store.notes.filter((n) => n.scope === 'project');
}

/**
 * Render notes for BOM/PDF output as a plain-text block.
 * Groups by scope, with cabinet and part headers.
 */
export function formatNotesForExport(store: NoteStore): string {
  const lines: string[] = [];

  const projectNotes = getProjectNotes(store);
  if (projectNotes.length > 0) {
    lines.push('=== Project Notes ===');
    for (const n of projectNotes) lines.push(`• ${n.text}`);
    lines.push('');
  }

  // Group cabinet-scoped notes by cabinetId
  const cabinetIds = [...new Set(store.notes.filter((n) => n.scope !== 'project').map((n) => n.cabinetId!))];
  for (const cid of cabinetIds) {
    const cabNotes = store.notes.filter((n) => n.cabinetId === cid && n.scope === 'cabinet');
    const partNotes = store.notes.filter((n) => n.cabinetId === cid && n.scope === 'part');
    if (cabNotes.length + partNotes.length > 0) {
      lines.push(`=== Cabinet ${cid} Notes ===`);
      for (const n of cabNotes) lines.push(`• ${n.text}`);
      for (const n of partNotes) lines.push(`  Part ${n.partId}: ${n.text}`);
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}
