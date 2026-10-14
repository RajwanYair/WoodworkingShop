import { describe, expect, it } from 'vitest';
import { buildCuratedBarrelPlan } from '../../scripts/codemods/curate-engine-barrels.js';

describe('buildCuratedBarrelPlan', () => {
  it('preserves root exports, existing barrel extras, type-only bindings, aliases, and external compatibility exports', () => {
    const root = [
      "export { value } from './geometry/value.ts';",
      "export type { Shape } from './geometry/types.ts';",
      "export { getTemplate } from './project/templates/index';",
      "export { connectToMachine } from '../utils/webserial-cnc';",
    ].join('\n');
    const plan = buildCuratedBarrelPlan(root, {
      materials: "export { getTemplate } from './templates/index';",
      geometry: "export { oldValue } from './legacy';",
    });

    expect(plan.barrelTexts.get('src/engine/geometry/index.ts')).toContain("'./legacy'");
    expect(plan.barrelTexts.get('src/engine/geometry/index.ts')).toContain("'./value.ts'");
    expect(plan.barrelTexts.get('src/engine/geometry/index.ts')).toContain('export type { Shape }');
    expect(plan.barrelTexts.get('src/engine/project/index.ts')).toContain("'./templates/index'");
    expect(plan.barrelTexts.get('src/engine/materials/index.ts')).toContain("'./templates/index'");
    expect(plan.rootText).toContain("export * from './geometry/index';");
    expect(plan.rootText).toContain("export { getTemplate } from './project/index';");
    expect(plan.rootText).toContain("export { connectToMachine } from '../utils/webserial-cnc';");
    expect(plan.explicitResolutions).toEqual(["export { getTemplate } from './project/index';"]);
  });
});
