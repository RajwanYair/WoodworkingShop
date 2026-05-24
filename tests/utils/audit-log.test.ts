/**
 * Audit log — Sprint 22 tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import 'fake-indexeddb/auto';
import {
  logOperation,
  getAuditLog,
  getRecentAuditEntries,
  clearAuditLog,
  deleteAuditEntry,
  listAuditedProjects,
  countAuditEntries,
  sha256Hex,
  _resetSeq,
  _clearAllAuditEntries,
} from '../../src/utils/audit-log';

// Ensure a fresh IDB for every test
beforeEach(async () => {
  // @ts-expect-error — fake-indexeddb/auto replaces global
  globalThis.indexedDB = new IDBFactory();
  _resetSeq();
  await _clearAllAuditEntries();
});

describe('logOperation', () => {
  it('returns an AuditEntry with the correct type', async () => {
    const entry = await logOperation('proj-1', 'config.update', { width: 600 });
    expect(entry.type).toBe('config.update');
    expect(entry.projectId).toBe('proj-1');
  });

  it('stores payload when provided', async () => {
    const entry = await logOperation('proj-1', 'export.gcode', { lines: 42 });
    expect(entry.payload).toEqual({ lines: 42 });
  });

  it('omits payload when not provided', async () => {
    const entry = await logOperation('proj-1', 'project.save');
    expect(entry.payload).toBeUndefined();
  });

  it('stores actor when provided in options', async () => {
    const entry = await logOperation('proj-1', 'cabinet.add', undefined, {
      actor: 'user-abc',
    });
    expect(entry.actor).toBe('user-abc');
  });

  it('generates a composite key starting with projectId', async () => {
    const entry = await logOperation('my-project', 'project.load');
    expect(entry.key.startsWith('my-project:')).toBe(true);
  });

  it('increments seq across multiple calls', async () => {
    const e1 = await logOperation('p', 'config.update');
    const e2 = await logOperation('p', 'config.update');
    expect(e2.seq).toBeGreaterThan(e1.seq);
  });

  it('stores a payloadHash when hashPayload is true', async () => {
    const entry = await logOperation('p', 'export.dxf', { size: 100 }, { hashPayload: true });
    expect(typeof entry.payloadHash).toBe('string');
    expect(entry.payloadHash!.length).toBeGreaterThan(0);
  });

  it('does not store payloadHash when hashPayload is false', async () => {
    const entry = await logOperation('p', 'project.save', { x: 1 }, { hashPayload: false });
    expect(entry.payloadHash).toBeUndefined();
  });
});

describe('getAuditLog', () => {
  it('returns empty array for unknown project', async () => {
    const log = await getAuditLog('nonexistent');
    expect(log).toHaveLength(0);
  });

  it('returns entries in chronological order', async () => {
    await logOperation('p1', 'config.update', { step: 1 });
    await logOperation('p1', 'config.update', { step: 2 });
    await logOperation('p1', 'config.update', { step: 3 });
    const log = await getAuditLog('p1');
    expect(log).toHaveLength(3);
    for (let i = 0; i < log.length - 1; i++) {
      expect(log[i]!.seq).toBeLessThan(log[i + 1]!.seq);
    }
  });

  it('isolates entries by project', async () => {
    await logOperation('proj-a', 'config.update');
    await logOperation('proj-b', 'project.save');
    const logA = await getAuditLog('proj-a');
    expect(logA).toHaveLength(1);
    expect(logA[0]!.projectId).toBe('proj-a');
  });
});

describe('getRecentAuditEntries', () => {
  it('returns newest first', async () => {
    await logOperation('p', 'config.update', { n: 1 });
    await logOperation('p', 'config.update', { n: 2 });
    await logOperation('p', 'config.update', { n: 3 });
    const recent = await getRecentAuditEntries('p', 2);
    expect(recent).toHaveLength(2);
    expect((recent[0]!.payload as { n: number }).n).toBe(3);
  });

  it('returns all when limit exceeds count', async () => {
    await logOperation('p', 'project.save');
    const recent = await getRecentAuditEntries('p', 100);
    expect(recent).toHaveLength(1);
  });
});

describe('clearAuditLog', () => {
  it('removes all entries for a project', async () => {
    await logOperation('p', 'config.update');
    await logOperation('p', 'export.gcode');
    await clearAuditLog('p');
    expect(await getAuditLog('p')).toHaveLength(0);
  });

  it('does not affect other projects', async () => {
    await logOperation('proj-a', 'config.update');
    await logOperation('proj-b', 'project.save');
    await clearAuditLog('proj-a');
    expect(await getAuditLog('proj-b')).toHaveLength(1);
  });
});

describe('deleteAuditEntry', () => {
  it('removes a single entry by key', async () => {
    const entry = await logOperation('p', 'export.bom');
    await deleteAuditEntry(entry.key);
    expect(await getAuditLog('p')).toHaveLength(0);
  });

  it('silently ignores unknown key', async () => {
    await expect(deleteAuditEntry('nonexistent:key')).resolves.toBeUndefined();
  });
});

describe('listAuditedProjects', () => {
  it('returns empty array when no entries', async () => {
    expect(await listAuditedProjects()).toHaveLength(0);
  });

  it('returns sorted project IDs', async () => {
    await logOperation('z-proj', 'project.save');
    await logOperation('a-proj', 'project.save');
    await logOperation('m-proj', 'project.save');
    const ids = await listAuditedProjects();
    expect(ids).toEqual(['a-proj', 'm-proj', 'z-proj']);
  });

  it('deduplicates project IDs', async () => {
    await logOperation('p', 'config.update');
    await logOperation('p', 'export.dxf');
    const ids = await listAuditedProjects();
    expect(ids).toEqual(['p']);
  });
});

describe('countAuditEntries', () => {
  it('returns 0 for unknown project', async () => {
    expect(await countAuditEntries('unknown')).toBe(0);
  });

  it('counts entries correctly', async () => {
    await logOperation('p', 'config.update');
    await logOperation('p', 'config.update');
    await logOperation('p', 'export.pdf');
    expect(await countAuditEntries('p')).toBe(3);
  });
});

describe('sha256Hex', () => {
  it('returns a non-empty hex string', async () => {
    const hash = await sha256Hex('hello');
    expect(hash.length).toBeGreaterThan(0);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it('same input produces same hash', async () => {
    const h1 = await sha256Hex('cabinet-planner');
    const h2 = await sha256Hex('cabinet-planner');
    expect(h1).toBe(h2);
  });

  it('different inputs produce different hashes', async () => {
    const h1 = await sha256Hex('aaa');
    const h2 = await sha256Hex('bbb');
    expect(h1).not.toBe(h2);
  });
});
