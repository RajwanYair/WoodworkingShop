import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { createCapabilityMap, validateLedger } from '../../scripts/capability-map.js';

describe('createCapabilityMap', () => {
  it('records direct, transitive, barrel-only, dynamic, and worker import paths', () => {
    const root = path.join(process.cwd(), 'src');
    const testsRoot = path.join(process.cwd(), 'tests');
    const files = new Map([
      [path.join(root, 'App.tsx'), `import './components/Panel'; void import('./engine/dynamic');`],
      [path.join(root, 'components/Panel.tsx'), `export { feature } from '../engine/index';`],
      [path.join(root, 'engine/index.ts'), `export { feature } from './feature';`],
      [path.join(root, 'engine/feature.ts'), `export const feature = true;`],
      [path.join(root, 'engine/dynamic.ts'), `export const dynamicFeature = true;`],
      [path.join(root, 'engine/worker.ts'), `export const workerFeature = true;`],
      [path.join(root, 'engine/alias.ts'), `export const aliasFeature = true;`],
      [path.join(root, 'workers/task.worker.ts'), `import '../engine/worker';`],
      [path.join(root, 'components/WorkerPanel.tsx'), `import TaskWorker from '../workers/task.worker?worker';`],
      [path.join(root, 'components/AliasPanel.tsx'), `import { aliasFeature } from '@/engine/alias';`],
      [path.join(root, 'utils/index.ts'), `export { helper } from './helper';`],
      [path.join(root, 'utils/helper.ts'), `export const helper = true;`],
      [path.join(testsRoot, 'utils/feature.test.ts'), `import '../../src/engine/feature';`],
      [
        path.join(testsRoot, 'utils/test-bridge.test.ts'),
        `import '../../src/components/Panel'; import '../../src/engine/dynamic';`,
      ],
    ]);

    const records = createCapabilityMap(files);
    const byPath = new Map(records.map((record) => [record.path, record]));

    expect(byPath.get('src/engine/feature.ts')).toMatchObject({
      uiImporters: [],
      transitiveUiImporters: ['src/App.tsx', 'src/components/Panel.tsx'],
      barrelOnlyExposure: true,
      testImporters: ['tests/utils/feature.test.ts'],
    });
    expect(byPath.get('src/engine/dynamic.ts')?.uiImporters).toEqual(['src/App.tsx']);
    expect(byPath.get('src/engine/worker.ts')?.uiImporters).toEqual(['src/workers/task.worker.ts']);
    expect(byPath.get('src/engine/alias.ts')?.uiImporters).toEqual(['src/components/AliasPanel.tsx']);
    expect(byPath.get('src/utils/helper.ts')?.barrelOnlyExposure).toBe(true);
    expect(byPath.get('src/engine/index.ts')?.transitiveUiImporters).toContain('src/App.tsx');
    expect(byPath.get('src/engine/dynamic.ts')?.transitiveUiImporters).toEqual(['src/App.tsx']);
  });
});

describe('validateLedger', () => {
  const record = {
    path: 'src/engine/feature.ts',
    kind: 'engine',
    uiImporters: [],
    transitiveUiImporters: [],
    engineInternalImporters: [],
    barrelOnlyExposure: false,
    testImporters: [],
    outputChunk: null,
  };

  it.each([
    {
      name: 'a missing classification',
      modules: {},
      expected: /missing capability classification/,
    },
    {
      name: 'a surfaced module without UI reachability',
      modules: { [record.path]: { classification: 'surfaced', rationale: 'Expected UI usage.' } },
      expected: /surfaced but has no transitive UI importer/,
    },
    {
      name: 'an already-due retirement',
      modules: {
        [record.path]: {
          classification: 'retire',
          rationale: 'Remove obsolete code.',
          targetSprint: 300,
          targetRelease: '0.0.0',
        },
      },
      expected: /still present at or after retirement release/,
    },
    {
      name: 'an undocumented public API',
      modules: {
        [record.path]: {
          classification: 'public-api',
          rationale: 'Public consumer contract.',
          documentation: 'docs/API-BOUNDARIES.md',
        },
      },
      expected: /public-api requires a mention/,
    },
    {
      name: 'an invalid schema classification',
      modules: { [record.path]: { classification: 'unclassified', rationale: 'Needs review.' } },
      expected: /must be equal to one of the allowed values/,
    },
  ])('rejects $name', ({ modules, expected }) => {
    expect(validateLedger([record], { schemaVersion: 1, modules })).toEqual(
      expect.arrayContaining([expect.stringMatching(expected)]),
    );
  });

  it('accepts a classified internal module with a rationale', () => {
    expect(
      validateLedger([record], {
        schemaVersion: 1,
        modules: { [record.path]: { classification: 'internal', rationale: 'Consumed by engine internals.' } },
      }),
    ).toEqual([]);
  });
});
