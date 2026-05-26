import { describe, it, expect } from 'vitest';
import {
  createAuditTrail,
  recordEvent,
  getAuditHistory,
  formatAuditEntry,
  summarizeAudit,
  diffConfigs,
} from '../../src/engine/audit-trail';
import { cfg } from '../helpers';

// ─── createAuditTrail ─────────────────────────────────────────────────────────

describe('createAuditTrail', () => {
  it('creates a trail with empty events list', () => {
    const trail = createAuditTrail('proj-1');
    expect(trail.projectId).toBe('proj-1');
    expect(trail.events).toHaveLength(0);
  });

  it.each([[''], ['   ']])('throws RangeError for empty projectId "%s"', (id) => {
    expect(() => createAuditTrail(id)).toThrow(RangeError);
  });
});

// ─── recordEvent ─────────────────────────────────────────────────────────────

describe('recordEvent', () => {
  it('appends an event with correct kind and description', () => {
    const trail = createAuditTrail('p1');
    const t2 = recordEvent(trail, 'config-change', 'Width changed to 800');
    expect(t2.events).toHaveLength(1);
    expect(t2.events[0]?.kind).toBe('config-change');
    expect(t2.events[0]?.description).toBe('Width changed to 800');
  });

  it('sequence numbers are 1-based and increment', () => {
    let trail = createAuditTrail('p1');
    trail = recordEvent(trail, 'project-created', 'Project created');
    trail = recordEvent(trail, 'config-change', 'Height changed');
    expect(trail.events[0]?.sequence).toBe(1);
    expect(trail.events[1]?.sequence).toBe(2);
  });

  it('stores configSnapshot when provided', () => {
    const trail = createAuditTrail('p1');
    const config = cfg({ width: 700 });
    const t2 = recordEvent(trail, 'config-change', 'Width set', { configSnapshot: config });
    expect(t2.events[0]?.configSnapshot?.width).toBe(700);
  });

  it('stores meta when provided', () => {
    const trail = createAuditTrail('p1');
    const t2 = recordEvent(trail, 'export', 'Exported to PDF', { meta: { format: 'pdf', pages: 3 } });
    expect(t2.events[0]?.meta?.['format']).toBe('pdf');
    expect(t2.events[0]?.meta?.['pages']).toBe(3);
  });

  it('is immutable — original trail is unchanged', () => {
    const trail = createAuditTrail('p1');
    recordEvent(trail, 'config-change', 'Something changed');
    expect(trail.events).toHaveLength(0);
  });

  it('throws RangeError for empty description', () => {
    const trail = createAuditTrail('p1');
    expect(() => recordEvent(trail, 'config-change', '')).toThrow(RangeError);
    expect(() => recordEvent(trail, 'config-change', '   ')).toThrow(RangeError);
  });
});

// ─── getAuditHistory ─────────────────────────────────────────────────────────

describe('getAuditHistory', () => {
  it('returns events newest-first', () => {
    let trail = createAuditTrail('p1');
    trail = recordEvent(trail, 'project-created', 'Created');
    trail = recordEvent(trail, 'config-change', 'Changed');
    const history = getAuditHistory(trail);
    expect(history[0]?.description).toBe('Changed');
    expect(history[1]?.description).toBe('Created');
  });

  it('respects limit parameter', () => {
    let trail = createAuditTrail('p1');
    for (let i = 1; i <= 5; i++) trail = recordEvent(trail, 'config-change', `Change ${i}`);
    expect(getAuditHistory(trail, 2)).toHaveLength(2);
  });

  it('returns all events when limit is undefined', () => {
    let trail = createAuditTrail('p1');
    for (let i = 1; i <= 4; i++) trail = recordEvent(trail, 'note-added', `Note ${i}`);
    expect(getAuditHistory(trail)).toHaveLength(4);
  });

  it('returns empty array for trail with no events', () => {
    const trail = createAuditTrail('p1');
    expect(getAuditHistory(trail)).toEqual([]);
  });
});

// ─── formatAuditEntry ─────────────────────────────────────────────────────────

describe('formatAuditEntry', () => {
  it('includes sequence, kind, and description', () => {
    let trail = createAuditTrail('p1');
    trail = recordEvent(trail, 'export', 'Exported BOM');
    const line = formatAuditEntry(trail.events[0]!);
    expect(line).toContain('[1]');
    expect(line).toContain('export');
    expect(line).toContain('Exported BOM');
  });

  it('timestamp is truncated to seconds with trailing Z', () => {
    let trail = createAuditTrail('p1');
    trail = recordEvent(trail, 'project-renamed', 'Renamed project');
    const line = formatAuditEntry(trail.events[0]!);
    expect(line).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
  });
});

// ─── summarizeAudit ───────────────────────────────────────────────────────────

describe('summarizeAudit', () => {
  it('returns "No audit events recorded." for empty trail', () => {
    const trail = createAuditTrail('p1');
    expect(summarizeAudit(trail)).toBe('No audit events recorded.');
  });

  it('includes event count for a single event', () => {
    let trail = createAuditTrail('p1');
    trail = recordEvent(trail, 'project-created', 'Created');
    expect(summarizeAudit(trail)).toMatch(/1 event/);
  });

  it('includes event count for multiple events', () => {
    let trail = createAuditTrail('p1');
    trail = recordEvent(trail, 'project-created', 'Created');
    trail = recordEvent(trail, 'config-change', 'Width changed');
    trail = recordEvent(trail, 'export', 'Exported');
    expect(summarizeAudit(trail)).toMatch(/3 events/);
  });
});

// ─── diffConfigs ─────────────────────────────────────────────────────────────

describe('diffConfigs', () => {
  it('returns identical=true for equal configs', () => {
    const a = cfg({ width: 600 });
    const diff = diffConfigs(a, a);
    expect(diff.identical).toBe(true);
    expect(diff.changeCount).toBe(0);
  });

  it('detects a single field change', () => {
    const before = cfg({ width: 600 });
    const after = cfg({ width: 900 });
    const diff = diffConfigs(before, after);
    expect(diff.identical).toBe(false);
    expect(diff.changeCount).toBe(1);
    expect(diff.changes[0]?.field).toBe('width');
    expect(diff.changes[0]?.before).toBe('600');
    expect(diff.changes[0]?.after).toBe('900');
  });

  it('detects multiple field changes', () => {
    const before = cfg({ width: 600, height: 720 });
    const after = cfg({ width: 900, height: 800 });
    const diff = diffConfigs(before, after);
    expect(diff.changeCount).toBeGreaterThanOrEqual(2);
  });

  it('correctly handles array field changes', () => {
    const before = cfg({ customShelfPositions: [] });
    const after = cfg({ customShelfPositions: [200, 400] });
    const diff = diffConfigs(before, after);
    const entry = diff.changes.find((c) => c.field === 'customShelfPositions');
    expect(entry).toBeDefined();
    expect(entry?.after).toBe('[200,400]');
  });

  it('reports no diff for configs with same array values', () => {
    const before = cfg({ customShelfPositions: [200, 400] });
    const after = cfg({ customShelfPositions: [200, 400] });
    const diff = diffConfigs(before, after);
    const entry = diff.changes.find((c) => c.field === 'customShelfPositions');
    expect(entry).toBeUndefined();
  });
});
