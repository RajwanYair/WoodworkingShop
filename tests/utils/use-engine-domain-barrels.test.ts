import { describe, expect, it } from 'vitest';
import { rewriteCrossDomainImports } from '../../scripts/codemods/use-engine-domain-barrels.js';

describe('rewriteCrossDomainImports', () => {
  it('routes direct cross-domain imports through barrels and leaves same-domain or barrel imports alone', () => {
    const sources = {
      'src/engine/calculators/example.ts':
        "import { assertFiniteNumber } from '../core/invariant'; import { computeDimensions } from '../geometry/dimensions'; import type { Material } from '../materials/materials.ts'; export { assertFiniteNumber, computeDimensions, Material };",
      'src/engine/optimizer/example.ts':
        "import { computeDimensions } from '../geometry/index'; import { material } from '@/engine/materials/materials'; export { computeDimensions, material };",
      'src/engine/core/invariant.ts': 'export function assertFiniteNumber() {}',
      'src/engine/geometry/dimensions.ts': 'export function computeDimensions() {}',
      'src/engine/geometry/index.ts': "export { computeDimensions } from './dimensions';",
      'src/engine/materials/materials.ts': 'export interface Material {} export const material = true;',
      'src/engine/materials/index.ts':
        "export { material } from './materials'; export type { Material } from './materials';",
    };

    const result = rewriteCrossDomainImports(sources);

    expect(result.changes).toHaveLength(4);
    expect(result.rewritten.get('src/engine/calculators/example.ts')).toContain("'../core/contracts/index'");
    expect(result.rewritten.get('src/engine/calculators/example.ts')).toContain("'../geometry/index'");
    expect(result.rewritten.get('src/engine/calculators/example.ts')).toContain("'../materials/catalog/index.ts'");
    expect(result.rewritten.get('src/engine/optimizer/example.ts')).toContain("'@/engine/materials/catalog/index'");
    expect(result.rewritten.has('src/engine/geometry/index.ts')).toBe(false);
  });
});
