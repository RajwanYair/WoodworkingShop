import { describe, it, expect } from 'vitest';
import {
  createNoteStore,
  addNote,
  updateNote,
  deleteNote,
  getNotesForCabinet,
  getNotesForPart,
  getProjectNotes,
  formatNotesForExport,
  MAX_NOTE_LENGTH,
} from '../../src/engine/cabinet-notes';

function isError(r: unknown): r is { error: { code: string } } {
  return typeof r === 'object' && r !== null && 'error' in r;
}

describe('createNoteStore', () => {
  it('creates an empty store', () => {
    expect(createNoteStore().notes).toHaveLength(0);
  });
});

describe('addNote', () => {
  it('adds a project-scoped note', () => {
    const store = createNoteStore();
    const res = addNote(store, 'project', 'General note');
    if (isError(res)) throw new Error('unexpected error');
    expect(res.store.notes).toHaveLength(1);
    expect(res.note.scope).toBe('project');
  });

  it('adds a cabinet-scoped note', () => {
    const store = createNoteStore();
    const res = addNote(store, 'cabinet', 'Wall unit note', 'cab-1');
    if (isError(res)) throw new Error('unexpected error');
    expect(res.note.cabinetId).toBe('cab-1');
  });

  it('adds a part-scoped note', () => {
    const store = createNoteStore();
    const res = addNote(store, 'part', 'Cut carefully', 'cab-1', 'part-5');
    if (isError(res)) throw new Error('unexpected error');
    expect(res.note.partId).toBe('part-5');
  });

  it('rejects a note that exceeds MAX_NOTE_LENGTH', () => {
    const store = createNoteStore();
    const longText = 'x'.repeat(MAX_NOTE_LENGTH + 1);
    const res = addNote(store, 'project', longText);
    expect(isError(res)).toBe(true);
    if (isError(res)) expect(res.error.code).toBe('NOTE_TOO_LONG');
  });

  it('rejects a cabinet note without cabinetId', () => {
    const store = createNoteStore();
    const res = addNote(store, 'cabinet', 'no id');
    expect(isError(res)).toBe(true);
    if (isError(res)) expect(res.error.code).toBe('MISSING_CABINET_ID');
  });

  it('rejects a part note without partId', () => {
    const store = createNoteStore();
    const res = addNote(store, 'part', 'no part id', 'cab-1');
    expect(isError(res)).toBe(true);
    if (isError(res)) expect(res.error.code).toBe('MISSING_PART_ID');
  });
});

describe('updateNote', () => {
  it('updates note text', () => {
    let store = createNoteStore();
    const added = addNote(store, 'project', 'Original');
    if (isError(added)) throw new Error('unexpected error');
    store = added.store;
    const updated = updateNote(store, added.note.id, 'Updated text');
    if (isError(updated)) throw new Error('unexpected error');
    expect(updated.store.notes[0].text).toBe('Updated text');
  });

  it('returns NOTE_NOT_FOUND for unknown id', () => {
    const store = createNoteStore();
    const res = updateNote(store, 'nonexistent', 'text');
    expect(isError(res)).toBe(true);
    if (isError(res)) expect(res.error.code).toBe('NOTE_NOT_FOUND');
  });
});

describe('deleteNote', () => {
  it('removes an existing note', () => {
    let store = createNoteStore();
    const added = addNote(store, 'project', 'Delete me');
    if (isError(added)) throw new Error('unexpected error');
    store = added.store;
    const deleted = deleteNote(store, added.note.id);
    if (isError(deleted)) throw new Error('unexpected error');
    expect(deleted.store.notes).toHaveLength(0);
  });

  it('returns NOTE_NOT_FOUND for unknown id', () => {
    const store = createNoteStore();
    const res = deleteNote(store, 'ghost-id');
    expect(isError(res)).toBe(true);
  });
});

describe('getNotesForCabinet', () => {
  it('returns only notes for the given cabinet', () => {
    let store = createNoteStore();
    const r1 = addNote(store, 'cabinet', 'A', 'cab-1');
    if (isError(r1)) throw new Error();
    store = r1.store;
    const r2 = addNote(store, 'cabinet', 'B', 'cab-2');
    if (isError(r2)) throw new Error();
    store = r2.store;
    expect(getNotesForCabinet(store, 'cab-1')).toHaveLength(1);
  });
});

describe('getNotesForPart', () => {
  it('returns only notes for the given part', () => {
    let store = createNoteStore();
    const r1 = addNote(store, 'part', 'P1', 'cab-1', 'part-1');
    if (isError(r1)) throw new Error();
    store = r1.store;
    const r2 = addNote(store, 'part', 'P2', 'cab-1', 'part-2');
    if (isError(r2)) throw new Error();
    store = r2.store;
    expect(getNotesForPart(store, 'cab-1', 'part-1')).toHaveLength(1);
  });
});

describe('getProjectNotes', () => {
  it('returns only project-scoped notes', () => {
    let store = createNoteStore();
    const r1 = addNote(store, 'project', 'Proj note');
    if (isError(r1)) throw new Error();
    store = r1.store;
    const r2 = addNote(store, 'cabinet', 'Cab note', 'cab-1');
    if (isError(r2)) throw new Error();
    store = r2.store;
    expect(getProjectNotes(store)).toHaveLength(1);
  });
});

describe('formatNotesForExport', () => {
  it('renders project and cabinet notes', () => {
    let store = createNoteStore();
    const r1 = addNote(store, 'project', 'Global');
    if (isError(r1)) throw new Error();
    store = r1.store;
    const r2 = addNote(store, 'cabinet', 'Wall unit', 'cab-1');
    if (isError(r2)) throw new Error();
    store = r2.store;
    const output = formatNotesForExport(store);
    expect(output).toContain('Project Notes');
    expect(output).toContain('Global');
    expect(output).toContain('Cabinet cab-1');
    expect(output).toContain('Wall unit');
  });

  it('returns empty string for empty store', () => {
    expect(formatNotesForExport(createNoteStore())).toBe('');
  });
});
