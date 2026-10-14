import { describe, expect, it } from 'vitest';
import {
  buildEngineMovePlan,
  buildEngineTestMovePlan,
  DOMAIN_MODULES,
  rewriteImports,
} from '../../scripts/codemods/move-engine-domains.js';

describe('buildEngineMovePlan', () => {
  it('routes every top-level engine module exactly once and retains the root barrel', () => {
    const engineFiles = Object.values(DOMAIN_MODULES)
      .flat()
      .map((moduleName) => `src/engine/${moduleName}.ts`);
    engineFiles.push('src/engine/index.ts');
    const plan = buildEngineMovePlan(engineFiles);

    expect(plan).toHaveLength(141);
    expect(plan.find(({ from }) => from === 'src/engine/webserial.ts')?.to).toBe('src/engine/workshop/webserial.ts');
    expect(plan.some(({ from }) => from === 'src/engine/index.ts')).toBe(false);
  });

  it('accepts an already-moved engine tree without duplicate module moves', () => {
    const movedFiles = Object.entries(DOMAIN_MODULES).flatMap(([domain, modules]) =>
      modules.map((moduleName) => `src/engine/${domain}/${moduleName}.ts`),
    );
    movedFiles.push('src/engine/index.ts');

    expect(buildEngineMovePlan(movedFiles)).toEqual([]);
  });
});

describe('rewriteImports', () => {
  it('rewrites imports from moved modules and callers while preserving extensions and query suffixes', () => {
    const sources = {
      'src/engine/dimensions.ts':
        "import { material } from './materials.ts'; import { part } from './parts?worker'; export type Alias = import('./types').Mm; export { material, part };",
      'src/engine/materials.ts': 'export const material = true;',
      'src/engine/parts.ts': 'export const part = true;',
      'src/engine/types.ts': "import { stock } from './stock/index'; export { stock };",
      'src/engine/stock/index.ts': 'export const stock = true;',
      'src/engine/hardware.ts': "import catalogRaw from '../catalog/hardware.json'; export { catalogRaw };",
      'src/catalog/hardware.json': '{"items":[]}',
      'src/App.tsx': "import { material } from '@/engine/dimensions'; export { material };",
      'tests/engine/dimensions.test.ts':
        "import { material } from '../../src/engine/dimensions'; vi.mock('../../src/engine/dimensions'); export { material };",
    };
    const movePlan = [
      { from: 'src/engine/dimensions.ts', to: 'src/engine/geometry/dimensions.ts', domain: 'geometry' },
      { from: 'src/engine/materials.ts', to: 'src/engine/materials/materials.ts', domain: 'materials' },
      { from: 'src/engine/parts.ts', to: 'src/engine/joinery/parts.ts', domain: 'joinery' },
      { from: 'src/engine/types.ts', to: 'src/engine/core/types.ts', domain: 'core' },
      { from: 'src/engine/hardware.ts', to: 'src/engine/hardware/hardware.ts', domain: 'hardware' },
    ];

    const result = rewriteImports(sources, movePlan, Object.keys(sources));

    expect(result.importCount).toBe(8);
    expect(result.rewritten.get('src/engine/dimensions.ts')).toContain("'../materials/materials.ts'");
    expect(result.rewritten.get('src/engine/dimensions.ts')).toContain("'../joinery/parts?worker'");
    expect(result.rewritten.get('src/engine/dimensions.ts')).toContain("'../core/types'");
    expect(result.rewritten.get('src/App.tsx')).toContain("'@/engine/geometry/dimensions'");
    expect(result.rewritten.get('tests/engine/dimensions.test.ts')).toContain("'../../src/engine/geometry/dimensions'");
    expect(result.rewritten.get('src/engine/types.ts')).toContain("'../stock/index'");
    expect(result.rewritten.get('src/engine/hardware.ts')).toContain("'../../catalog/hardware.json'");
    expect(result.rewritten.get('tests/engine/dimensions.test.ts')).not.toContain(
      "vi.mock('../../src/engine/dimensions')",
    );
  });
});

describe('buildEngineTestMovePlan', () => {
  it('moves single-domain suites, preserves cross-domain suites, and ignores already-nested tests', () => {
    const sources = {
      'tests/engine/dimensions.test.ts': "import { compute } from '../../src/engine/geometry/dimensions';",
      'tests/engine/shared.test.ts':
        "import { compute } from '../../src/engine/geometry/dimensions'; import { assert } from '../../src/engine/core/invariant';",
      'tests/engine/geometry/dimensions.test.ts': "import { compute } from '../../../src/engine/geometry/dimensions';",
      'src/engine/geometry/dimensions.ts': 'export const compute = true;',
      'src/engine/core/invariant.ts': 'export const assert = true;',
    };

    expect(
      buildEngineTestMovePlan(
        ['tests/engine/dimensions.test.ts', 'tests/engine/shared.test.ts', 'tests/engine/geometry/dimensions.test.ts'],
        sources,
      ),
    ).toEqual([
      {
        from: 'tests/engine/dimensions.test.ts',
        to: 'tests/engine/geometry/dimensions.test.ts',
        domain: 'geometry',
      },
    ]);
  });
});
