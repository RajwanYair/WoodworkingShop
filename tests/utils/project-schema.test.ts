import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import projectSchema from '../../config/schemas/project-v1.schema.json';
import { makeSavedProject } from '../helpers';

const validateProject = new Ajv2020({ allErrors: true }).compile(projectSchema);

describe('project v1 JSON Schema', () => {
  it('accepts canonical projects with optional cabinet notes and snapshot history', () => {
    const project = makeSavedProject({
      generatedAt: '2026-10-09T12:00:00.000Z',
      snapshots: [
        {
          id: 'snapshot-1',
          name: 'Before revision',
          cabinets: [makeSavedProject().cabinets[0]],
          timestamp: '2026-10-09T11:00:00.000Z',
        },
      ],
    });
    project.cabinets[0].notes = 'Keep the grain vertical';

    expect(validateProject(project)).toBe(true);
  });

  it.each([
    [
      'a future schema version',
      (project: ReturnType<typeof makeSavedProject>) => ({ ...project, schemaVersion: '2.0' }),
    ],
    [
      'an unversioned legacy record',
      (project: ReturnType<typeof makeSavedProject>) => ({ ...project, schemaVersion: undefined }),
    ],
    [
      'unknown envelope fields',
      (project: ReturnType<typeof makeSavedProject>) => ({ ...project, optimizerResult: {} }),
    ],
    [
      'a cabinet without configuration',
      (project: ReturnType<typeof makeSavedProject>) => ({ ...project, cabinets: [{ name: 'Missing config' }] }),
    ],
    [
      'unsupported furniture types',
      (project: ReturnType<typeof makeSavedProject>) => ({
        ...project,
        cabinets: [{ ...project.cabinets[0], config: { ...project.cabinets[0].config, furnitureType: 'sofa' } }],
      }),
    ],
  ])('rejects %s', (_case, mutateProject) => {
    expect(validateProject(mutateProject(makeSavedProject()))).toBe(false);
  });

  it('allows unrecognized nested configuration keys for forward compatibility', () => {
    const project = makeSavedProject({ generatedAt: '2026-10-09T12:00:00.000Z' });
    Object.assign(project.cabinets[0].config, { futureConfigKey: true });

    expect(validateProject(project)).toBe(true);
  });
});
