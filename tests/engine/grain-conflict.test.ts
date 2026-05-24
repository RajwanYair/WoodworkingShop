import { describe, it, expect } from 'vitest';
import { resolveGrainConflicts, hasGrainConflicts } from '../../src/engine/grain-conflict';
import type { GrainCheckPart } from '../../src/engine/grain-conflict';

function part(overrides: Partial<GrainCheckPart> & { id: string }): GrainCheckPart {
  return {
    name: { en: 'Panel', he: 'לוח' },
    type: 'panel',
    grainAlongLength: true,
    widthMm: 400,
    lengthMm: 720,
    ...overrides,
  };
}

describe('resolveGrainConflicts — no conflicts', () => {
  it('returns empty for a panel with correct grain', () => {
    const result = resolveGrainConflicts([part({ id: '1', type: 'panel', grainAlongLength: true })]);
    expect(result).toHaveLength(0);
  });

  it('returns empty for an empty parts list', () => {
    expect(resolveGrainConflicts([])).toHaveLength(0);
  });
});

describe('resolveGrainConflicts — door grain', () => {
  it('flags a door with horizontal grain', () => {
    const conflicts = resolveGrainConflicts([part({ id: 'd1', type: 'door', grainAlongLength: false })]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].code).toBe('DOOR_GRAIN_HORIZONTAL');
  });

  it('also flags drawer-front with horizontal grain', () => {
    const conflicts = resolveGrainConflicts([part({ id: 'd2', type: 'drawer-front', grainAlongLength: false })]);
    expect(conflicts[0].code).toBe('DOOR_GRAIN_HORIZONTAL');
  });

  it('does not flag a door with correct vertical grain', () => {
    const result = resolveGrainConflicts([part({ id: 'd3', type: 'door', grainAlongLength: true })]);
    expect(result.filter((c) => c.code === 'DOOR_GRAIN_HORIZONTAL')).toHaveLength(0);
  });
});

describe('resolveGrainConflicts — shelf grain', () => {
  it('flags a shelf when grain is along length but length > width', () => {
    const conflicts = resolveGrainConflicts([
      part({ id: 's1', type: 'shelf', grainAlongLength: true, widthMm: 400, lengthMm: 800 }),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].code).toBe('SHELF_GRAIN_WRONG');
  });

  it('does not flag a shelf when width >= length (grain along correct axis)', () => {
    const conflicts = resolveGrainConflicts([
      part({ id: 's2', type: 'shelf', grainAlongLength: true, widthMm: 900, lengthMm: 400 }),
    ]);
    expect(conflicts.filter((c) => c.code === 'SHELF_GRAIN_WRONG')).toHaveLength(0);
  });
});

describe('resolveGrainConflicts — carcass grain', () => {
  it('flags a carcass panel with horizontal grain', () => {
    const conflicts = resolveGrainConflicts([part({ id: 'c1', type: 'side', grainAlongLength: false })]);
    expect(conflicts.some((c) => c.code === 'CARCASS_GRAIN_WRONG')).toBe(true);
  });
});

describe('resolveGrainConflicts — cross-grain too wide', () => {
  it('flags a cross-grain panel exceeding default 600 mm', () => {
    const conflicts = resolveGrainConflicts([part({ id: 'cg1', type: 'back', grainAlongLength: false, widthMm: 700 })]);
    expect(conflicts.some((c) => c.code === 'CROSS_GRAIN_TOO_WIDE')).toBe(true);
  });

  it('respects custom crossGrainMaxWidthMm', () => {
    const conflicts = resolveGrainConflicts(
      [part({ id: 'cg2', type: 'back', grainAlongLength: false, widthMm: 450 })],
      { crossGrainMaxWidthMm: 400 },
    );
    expect(conflicts.some((c) => c.code === 'CROSS_GRAIN_TOO_WIDE')).toBe(true);
  });
});

describe('resolveGrainConflicts — custom doorTypes', () => {
  it('uses custom door type list', () => {
    const conflicts = resolveGrainConflicts([part({ id: 'x1', type: 'flip-door', grainAlongLength: false })], {
      doorTypes: ['flip-door'],
    });
    expect(conflicts[0].code).toBe('DOOR_GRAIN_HORIZONTAL');
  });
});

describe('hasGrainConflicts', () => {
  it('returns false when no conflicts', () => {
    expect(hasGrainConflicts([part({ id: '1', grainAlongLength: true })])).toBe(false);
  });

  it('returns true when conflicts exist', () => {
    expect(hasGrainConflicts([part({ id: '1', type: 'door', grainAlongLength: false })])).toBe(true);
  });
});
