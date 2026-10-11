import { describe, expect, it } from 'vitest';
import {
  buildCapabilityInventory,
  buildImportGraph,
  checkCapabilityLedger,
  findReachableRoots,
  isBarrelOnlyExposure,
} from '../../scripts/capability-map.js';

describe('buildImportGraph', () => {
  const sources = {
    'src/App.tsx': 'import "./components/Panel"; import("./utils/lazy");',
    'src/components/Panel.tsx': 'import "../engine"; import "../workers/cut.worker?worker";',
    'src/engine/index.ts': 'export { calculate } from "./calculate";',
    'src/engine/calculate.ts': 'export function calculate() { return 1; }',
    'src/utils/lazy.ts': 'export const loaded = true;',
    'src/workers/cut.worker.ts': 'export const result = 1;',
  };

  it('tracks direct, transitive, barrel, dynamic, and worker imports', () => {
    const graph = buildImportGraph(sources);

    expect(graph.get('src/App.tsx')).toEqual([
      { target: 'src/components/Panel.tsx', kind: 'static' },
      { target: 'src/utils/lazy.ts', kind: 'dynamic' },
    ]);
    expect(graph.get('src/components/Panel.tsx')).toEqual([
      { target: 'src/engine/index.ts', kind: 'static' },
      { target: 'src/workers/cut.worker.ts', kind: 'worker' },
    ]);
    expect(graph.get('src/engine/index.ts')).toEqual([{ target: 'src/engine/calculate.ts', kind: 'static' }]);
    expect(findReachableRoots(graph, 'src/engine/calculate.ts', ['src/App.tsx'])).toEqual(['src/App.tsx']);
    expect(isBarrelOnlyExposure(graph, 'src/engine/calculate.ts')).toBe(true);
    expect(isBarrelOnlyExposure(graph, 'src/utils/lazy.ts')).toBe(false);
  });
});

describe('buildCapabilityInventory', () => {
  it('records transitive UI and test importers with the emitted output chunk', () => {
    const inventory = buildCapabilityInventory(
      {
        'src/App.tsx': 'import "./components/Panel";',
        'src/components/Panel.tsx': 'import "../engine/calculate";',
        'src/engine/calculate.ts': 'export const value = 1;',
        'tests/engine/calculate.test.ts': 'import "../../src/engine/calculate";',
      },
      {
        modulePaths: ['src/engine/calculate.ts'],
        uiRoots: ['src/App.tsx'],
        testRoots: ['tests/engine/calculate.test.ts'],
        outputChunks: { 'src/engine/calculate.ts': ['assets/engine.js'] },
      },
    );

    expect(inventory).toEqual([
      {
        path: 'src/engine/calculate.ts',
        uiImporters: ['src/App.tsx', 'src/components/Panel.tsx'],
        internalImporters: [],
        barrelOnly: false,
        testImporters: ['tests/engine/calculate.test.ts'],
        outputChunks: ['assets/engine.js'],
      },
    ]);
  });
});

describe('checkCapabilityLedger', () => {
  const inventory = [
    {
      path: 'src/engine/live.ts',
      uiImporters: ['src/App.tsx'],
      internalImporters: [],
      barrelOnly: false,
      testImporters: [],
      outputChunks: [],
    },
    {
      path: 'src/engine/retired-late.ts',
      uiImporters: [],
      internalImporters: [],
      barrelOnly: false,
      testImporters: [],
      outputChunks: [],
    },
  ];

  it('reports overdue retirements and ledger entries without source modules', () => {
    const errors = checkCapabilityLedger(
      inventory,
      {
        modules: [
          { path: 'src/engine/live.ts', status: 'surfaced' },
          {
            path: 'src/engine/retired-late.ts',
            status: 'retire',
            reason: 'Replaced by the supported API.',
            targetRelease: '5.34.0',
          },
          { path: 'src/utils/stale.ts', status: 'internal', reason: 'No longer present.' },
        ],
      },
      '5.34.0',
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        'src/engine/retired-late.ts: retirement target 5.34.0 is overdue; module still exists.',
        'src/utils/stale.ts: ledger entry does not match a source module.',
      ]),
    );
  });

  it('rejects a surfaced module that loses every UI importer and an unclassified module', () => {
    const lostSurfaceInventory = inventory.map((module) => ({
      ...module,
      uiImporters: module.path === 'src/engine/live.ts' ? [] : module.uiImporters,
    }));
    const errors = checkCapabilityLedger(
      lostSurfaceInventory,
      { modules: [{ path: 'src/engine/live.ts', status: 'surfaced' }] },
      '5.34.0',
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        'src/engine/live.ts: surfaced module has no UI importers.',
        'src/engine/retired-late.ts: unclassified module.',
      ]),
    );
  });

  it('requires a target sprint and reason for surface-next modules', () => {
    const errors = checkCapabilityLedger(
      inventory,
      {
        modules: [
          { path: 'src/engine/live.ts', status: 'surface-next', targetSprint: 0 },
          { path: 'src/engine/retired-late.ts', status: 'internal', reason: 'Internal-only helper.' },
        ],
      },
      '5.34.0',
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        'src/engine/live.ts: surface-next requires a positive targetSprint.',
        'src/engine/live.ts: surface-next requires a reason.',
      ]),
    );
  });
});
