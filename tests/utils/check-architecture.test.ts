import { describe, expect, it } from 'vitest';
import {
  analyzeArchitecture,
  architectureViolationKey,
  compareArchitectureBaseline,
  type ArchitectureViolation,
} from '../../scripts/check-architecture.js';

describe('analyzeArchitecture', () => {
  it('accepts target architecture layer edges', () => {
    const violations = analyzeArchitecture({
      'src/app/main.ts': "import '../features/panel';",
      'src/features/panel.ts': "import './helpers'; import '../ui/button'; import '../store/cabinet';",
      'src/features/helpers.ts': 'export const helper = true;',
      'src/ui/button.ts': "import './tokens'; export const button = true;",
      'src/ui/tokens.ts': 'export const tokens = true;',
      'src/store/cabinet.ts': "import '../engine/index'; import '../platform/storage';",
      'src/platform/storage.ts': "import '../workers/storage.worker'; export const storage = indexedDB;",
      'src/workers/storage.worker.ts': "import '../engine/types'; export const run = true;",
      'src/engine/index.ts': "export { types } from './types';",
      'src/engine/types.ts': 'export const types = true;',
    });

    expect(violations).toEqual([]);
  });

  it('reports imports that violate target architecture layer edges', () => {
    const violations = analyzeArchitecture({
      'src/app/main.ts': "import '../store/cabinet';",
      'src/store/cabinet.ts': "import '../ui/button';",
      'src/ui/button.ts': 'export const button = true;',
    });

    expect(violations).toEqual(
      expect.arrayContaining([
        {
          rule: 'target-layer-boundary',
          file: 'src/app/main.ts',
          target: 'src/store/cabinet.ts',
          detail: 'app -> store',
        },
        {
          rule: 'target-layer-boundary',
          file: 'src/store/cabinet.ts',
          target: 'src/ui/button.ts',
          detail: 'store -> ui',
        },
      ]),
    );
  });

  it('accepts cross-domain imports through domain barrels', () => {
    const violations = analyzeArchitecture({
      'src/engine/geometry/index.ts': "export { makePanel } from './panel';",
      'src/engine/geometry/panel.ts':
        "import { board } from '../materials/index'; export const makePanel = () => board;",
      'src/engine/materials/index.ts': "export { board } from './board';",
      'src/engine/materials/board.ts': 'export const board = 1;',
      'src/components/Panel.tsx':
        "import { makePanel } from '../engine/geometry/index'; export const Panel = makePanel;",
    });

    expect(violations).toEqual([]);
  });

  it('reports forbidden layer edges, deep domain imports, pure-layer APIs, and cycles', () => {
    const violations = analyzeArchitecture({
      'src/engine/parts.ts':
        "import '../utils/format'; import React from 'react'; export const title = document.title;",
      'src/engine/browser.ts': 'export const title = window.document.title;',
      'src/utils/format.ts': 'export const format = true;',
      'src/engine/geometry/panel.ts': "import '../materials/board'; export const panel = true;",
      'src/engine/materials/board.ts': "import '../geometry/panel'; export const board = true;",
      'src/engine/cycle-a.ts': "import './cycle-b'; export const a = true;",
      'src/engine/cycle-b.ts': "import './cycle-a'; export const b = true;",
      'src/platform/storage.ts': "import { useEffect } from 'react'; export const store = indexedDB;",
      'src/platform/contracts/device.ts': 'export interface DeviceContract { element: HTMLElement; }',
      'src/features/panel.tsx': "import '../platform/storage'; export const Panel = true;",
    });
    const rules = new Set(violations.map(({ rule }) => rule));

    expect(rules).toEqual(
      new Set([
        'browser-api-in-pure-layer',
        'dom-type-in-platform-contract',
        'engine-boundary',
        'engine-domain-barrel',
        'engine-external-import',
        'feature-platform-boundary',
        'import-cycle',
        'react-in-pure-layer',
        'target-layer-boundary',
      ]),
    );
    expect(violations.find(({ rule }) => rule === 'import-cycle')).toEqual({
      rule: 'import-cycle',
      files: ['src/engine/cycle-a.ts', 'src/engine/cycle-b.ts'],
    });
  });
});

describe('compareArchitectureBaseline', () => {
  it('reports only newly introduced and resolved violations', () => {
    const resolved: ArchitectureViolation = {
      rule: 'engine-boundary',
      file: 'src/engine/old.ts',
      target: 'src/utils/old.ts',
    };
    const introduced: ArchitectureViolation = {
      rule: 'engine-boundary',
      file: 'src/engine/new.ts',
      target: 'src/utils/new.ts',
    };

    const result = compareArchitectureBaseline([introduced], { schemaVersion: 1, violations: [resolved] });

    expect(result).toEqual({ introduced: [introduced], resolved: [resolved] });
    expect(architectureViolationKey(introduced)).toBe('engine-boundary|src/engine/new.ts|src/utils/new.ts|');
  });
});
