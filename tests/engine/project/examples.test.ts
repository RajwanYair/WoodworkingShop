import { describe, expect, it } from 'vitest';
import { EXAMPLE_PROJECTS } from '../../../src/engine/project/examples';
import { generateParts } from '../../../src/engine/geometry/parts';
import { generateHardware } from '../../../src/engine/hardware/hardware';

const EXPECTED_IDS = [
  'kitchenBaseRun',
  'wallCabinetRun',
  'bookcase',
  'wardrobe',
  'bathroomVanity',
  'workshopStorage',
] as const;

describe('EXAMPLE_PROJECTS', () => {
  it('has the six documented example projects with unique ids', () => {
    const ids = EXAMPLE_PROJECTS.map((project) => project.id);
    expect(ids).toEqual(EXPECTED_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every project at least one cabinet with a unique name', () => {
    for (const project of EXAMPLE_PROJECTS) {
      expect(project.cabinets.length).toBeGreaterThan(0);
      const names = project.cabinets.map((cabinet) => cabinet.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('every cabinet config produces parts and hardware without throwing', () => {
    for (const project of EXAMPLE_PROJECTS) {
      for (const cabinet of project.cabinets) {
        expect(() => generateParts(cabinet.config, [])).not.toThrow();
        expect(() => generateHardware(cabinet.config, [])).not.toThrow();
        expect(generateParts(cabinet.config, []).length).toBeGreaterThan(0);
      }
    }
  });
});
