import { describe, expect, it } from 'vitest';
import { estimateBuildTimeForProject } from '../../src/utils/project-build-estimate';
import type { HardwareItem, Part } from '../../src/engine/types';

const parts: Part[] = [
  {
    id: 'P01',
    name: { en: 'Side', he: 'Side' },
    qty: 1,
    material: 'plywood-18',
    thickness: 18,
    length: 600,
    width: 400,
    edgeBanding: { en: 'Front edge', he: 'Front edge' },
  },
  {
    id: 'P02',
    name: { en: 'Shelf', he: 'Shelf' },
    qty: 2,
    material: 'plywood-18',
    thickness: 18,
    length: 500,
    width: 300,
    edgeBanding: { en: 'None', he: 'None' },
  },
];

const hardware: HardwareItem[] = [
  { id: 'H01', name: { en: 'Hinge', he: 'Hinge' }, qty: 3, unit: { en: 'pcs', he: 'pcs' } },
];

describe('estimateBuildTimeForProject', () => {
  it('estimates sequential work from part, edge, cabinet, and hardware quantities', () => {
    const result = estimateBuildTimeForProject(parts, 2, hardware);

    expect(result.totalMinutes).toBe(125);
    expect(result.totalHours).toBe(2.08);
    expect(result.criticalPathMinutes).toBe(125);
  });

  it('returns zero time when all project quantities are empty', () => {
    const result = estimateBuildTimeForProject([], 0, []);

    expect(result.totalMinutes).toBe(0);
    expect(result.criticalPathMinutes).toBe(0);
  });
});
