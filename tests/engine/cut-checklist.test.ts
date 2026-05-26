import { describe, it, expect } from 'vitest';
import { buildCutChecklist } from '../../src/engine/cut-checklist';
import type { Part } from '../../src/engine/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePart(id: string, material: string, qty = 1): Part {
  return {
    id,
    name: { en: `Part ${id}`, he: `חלק ${id}` },
    qty,
    material,
    thickness: 18,
    length: 600,
    width: 300,
    edgeBanding: { en: 'None', he: 'ללא' },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('buildCutChecklist — empty input', () => {
  it('returns zero totals for an empty part list', () => {
    const result = buildCutChecklist([], new Set());
    expect(result.totalParts).toBe(0);
    expect(result.checkedParts).toBe(0);
    expect(result.progressPercent).toBe(0);
    expect(result.isComplete).toBe(false);
    expect(result.groups).toHaveLength(0);
  });
});

describe('buildCutChecklist — basic checks', () => {
  const parts = [makePart('P1', 'MDF-18'), makePart('P2', 'MDF-18'), makePart('P3', 'Ply-12')];

  it('reflects unchecked state when checkedIds is empty', () => {
    const result = buildCutChecklist(parts, new Set());
    expect(result.checkedParts).toBe(0);
    expect(result.totalParts).toBe(3);
    result.groups.forEach((g) => g.items.forEach((i) => expect(i.checked).toBe(false)));
  });

  it('marks items as checked when their IDs are in checkedIds', () => {
    const result = buildCutChecklist(parts, new Set(['P1', 'P3']));
    expect(result.checkedParts).toBe(2);
    const p1 = result.groups.flatMap((g) => g.items).find((i) => i.partId === 'P1');
    expect(p1?.checked).toBe(true);
  });

  it('groups parts by material key', () => {
    const result = buildCutChecklist(parts, new Set());
    expect(result.groups).toHaveLength(2);
    const mdfGroup = result.groups.find((g) => g.material === 'MDF-18');
    expect(mdfGroup?.totalCount).toBe(2);
    const plyGroup = result.groups.find((g) => g.material === 'Ply-12');
    expect(plyGroup?.totalCount).toBe(1);
  });
});

describe('buildCutChecklist — progress', () => {
  it.each([
    ['0 checked → 0%', 0, 0],
    ['1 of 4 checked → 25%', 1, 25],
    ['2 of 4 checked → 50%', 2, 50],
    ['4 of 4 checked → 100%', 4, 100],
  ] as const)('%s', (_label, checkedCount, expectedPercent) => {
    const parts = Array.from({ length: 4 }, (_, i) => makePart(`P${i}`, 'MDF'));
    const checked = new Set(parts.slice(0, checkedCount).map((p) => p.id));
    const result = buildCutChecklist(parts, checked);
    expect(result.progressPercent).toBe(expectedPercent);
  });

  it('isComplete is true only when all parts are checked', () => {
    const parts = [makePart('A', 'MDF'), makePart('B', 'MDF')];
    const incomplete = buildCutChecklist(parts, new Set(['A']));
    const complete = buildCutChecklist(parts, new Set(['A', 'B']));
    expect(incomplete.isComplete).toBe(false);
    expect(complete.isComplete).toBe(true);
  });
});

describe('buildCutChecklist — language', () => {
  it('returns Hebrew labels when lang is "he"', () => {
    const parts = [makePart('X', 'MDF')];
    const result = buildCutChecklist(parts, new Set(), 'he');
    expect(result.groups[0].items[0].label).toBe('חלק X');
  });

  it('returns English labels when lang is "en"', () => {
    const parts = [makePart('X', 'MDF')];
    const result = buildCutChecklist(parts, new Set(), 'en');
    expect(result.groups[0].items[0].label).toBe('Part X');
  });
});

describe('buildCutChecklist — per-group counts', () => {
  it('checkedCount reflects only checked items within the group', () => {
    const parts = [makePart('A', 'MDF'), makePart('B', 'MDF'), makePart('C', 'MDF')];
    const result = buildCutChecklist(parts, new Set(['A', 'B']));
    const group = result.groups[0];
    expect(group.checkedCount).toBe(2);
    expect(group.totalCount).toBe(3);
  });
});
